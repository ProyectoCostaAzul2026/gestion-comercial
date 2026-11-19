'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { moverFecha, TIPOS_PERIODO, type Periodo, type TipoPeriodo } from '@/lib/periodos'

/**
 * Elegir el periodo (día, semana, mes, año o rango) y moverse con las flechas al anterior o al siguiente.
 * Todo va en la dirección (periodo, fecha, desde, hasta), así que se puede compartir o volver a él.
 */
export function SelectorPeriodo({ periodo, hoy, anterior }: {
  periodo: Periodo
  hoy: string
  /** Etiqueta del periodo con el que se compara */
  anterior?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const ir = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  const elegir = (tipo: TipoPeriodo) => {
    if (tipo === 'rango') ir({ periodo: tipo, fecha: null, desde: periodo.desde, hasta: periodo.hasta })
    // Al cambiar de tipo se conserva el día de referencia (la semana o el mes que lo contiene)
    else ir({ periodo: tipo, fecha: periodo.tipo === 'rango' ? null : periodo.fecha, desde: null, hasta: null })
  }

  const siguiente = periodo.tipo === 'rango' ? null : moverFecha(periodo, 1)
  const puedeAvanzar = !!siguiente && siguiente <= hoy

  return (
    <section className="space-y-3 rounded-2xl border border-linea bg-superficie p-3 md:p-4">
      <div role="tablist" aria-label="Periodo" className="grid grid-cols-5 gap-1 rounded-xl bg-fondo p-1">
        {TIPOS_PERIODO.map(t => {
          const activo = t.valor === periodo.tipo
          return (
            <button key={t.valor} type="button" role="tab" aria-selected={activo} onClick={() => elegir(t.valor)}
              className={`h-10 rounded-lg text-xs font-bold transition-colors sm:text-sm ${
                activo ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:bg-velo/5 hover:text-tinta'
              }`}>
              {t.label}
            </button>
          )
        })}
      </div>

      {periodo.tipo === 'rango' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs font-bold text-steel-300">Desde</span>
            <Input type="date" value={periodo.desde} max={hoy}
              onChange={e => e.target.value && ir({ desde: e.target.value })}
              className="h-11 border-linea bg-superficie-2 text-tinta" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-steel-300">Hasta</span>
            <Input type="date" value={periodo.hasta} max={hoy}
              onChange={e => e.target.value && ir({ hasta: e.target.value })}
              className="h-11 border-linea bg-superficie-2 text-tinta" />
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Periodo anterior" onClick={() => ir({ fecha: moverFecha(periodo, -1) })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-linea text-steel-300 hover:border-linea-fuerte hover:text-tinta">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-base font-bold text-tinta">{periodo.etiqueta}</p>
            {periodo.fecha !== hoy && (
              <button type="button" onClick={() => ir({ fecha: null })} className="text-xs font-medium text-enlace hover:underline">
                Volver al actual
              </button>
            )}
          </div>
          <button type="button" aria-label="Periodo siguiente" disabled={!puedeAvanzar}
            onClick={() => siguiente && ir({ fecha: siguiente })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-linea text-steel-300 hover:border-linea-fuerte hover:text-tinta disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {anterior && (
        <p className="text-center text-xs text-steel-500">
          Comparado con: <span className="text-steel-300">{anterior}</span>
        </p>
      )}
    </section>
  )
}

/** Variación contra el periodo anterior: verde si mejora, rojo si empeora (para gastos, al revés) */
export function Variacion({ actual, anterior, inverso = false, compacto = false }: {
  actual: number
  anterior: number
  /** true cuando subir es malo (gastos, costos, descuentos) */
  inverso?: boolean
  compacto?: boolean
}) {
  if (!anterior) {
    if (!actual) return null
    return <span className="text-xs text-steel-500">{compacto ? 'nuevo' : 'Sin datos del periodo anterior'}</span>
  }
  const pct = ((actual - anterior) / Math.abs(anterior)) * 100
  const sube = pct > 0.05
  const baja = pct < -0.05
  const bueno = inverso ? baja : sube
  const malo = inverso ? sube : baja
  const color = bueno ? 'text-emerald-400' : malo ? 'text-sale' : 'text-steel-300'
  const flecha = sube ? '▲' : baja ? '▼' : '='
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {flecha} {Math.abs(pct).toFixed(1)}%
      {!compacto && <span className="font-normal text-steel-500"> vs. anterior (${Math.round(anterior).toLocaleString('es-CO')})</span>}
    </span>
  )
}
