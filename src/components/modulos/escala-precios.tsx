'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, ArrowDownRight, Equal, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MODOS_REDONDEO, TEXTO_ALERTA, alertasEscala, estimarCostos, leerMedida, margenResultante, precioSugerido, serieDe,
  type AlertaEscala, type DatosPrecio, type ModoRedondeo,
} from '@/lib/escala-precios'
import type { MiembroGrupo } from './grupo-medidas-panel'
import { INPUT_CLS, LABEL_CLS } from './producto-form'

// Escala de precios de un grupo de medidas (solo administrador). Sugiere un precio por medida con el margen elegido y
// el costo de cada una (o uno estimado entre sus vecinas si no tiene); el administrador decide el precio final y al
// guardar quedan como precios de venta (RPC aplicar_escala_precios).

const pesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`
const pesosCosto = (v: number) => `$${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}`
const leerNumero = (texto: string | undefined): number | null => {
  if (texto == null || texto.trim() === '') return null
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const margenValido = (m: number | null): m is number => m !== null && m >= 0 && m <= 95
const mensajeError = (err: unknown) => (err as { message?: string } | null)?.message ?? String(err)

const ESTILO_ALERTA: Record<AlertaEscala, { clase: string; Icono: typeof AlertTriangle }> = {
  perdida: { clase: 'border-brand-red/30 bg-brand-red/15 text-brand-red', Icono: AlertTriangle },
  baja: { clase: 'border-amber-500/30 bg-amber-500/10 text-amber-400', Icono: ArrowDownRight },
  igual: { clase: 'border-white/15 bg-white/5 text-steel-300', Icono: Equal },
  salto: { clase: 'border-amber-500/30 bg-amber-500/10 text-amber-400', Icono: TrendingUp },
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-steel-500">{etiqueta}</p>
      <p className="text-sm text-white">{valor}</p>
      {nota && <p className="text-[10px] italic text-steel-500">{nota}</p>}
    </div>
  )
}

export function EscalaPrecios({ miembros, margenDefault, onGuardado }: {
  /** Miembros del grupo, ya ordenados por medida */
  miembros: MiembroGrupo[]
  margenDefault: number
  onGuardado: (precios: Record<string, number>) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [margen, setMargen] = useState(String(margenDefault))
  const [modo, setModo] = useState<ModoRedondeo>('auto')
  const [margenesFila, setMargenesFila] = useState<Record<string, string>>({})
  const [nuevos, setNuevos] = useState<Record<string, string>>(() =>
    Object.fromEntries(miembros.map(m => [m.id, String(m.precio_venta)])))
  const [guardando, setGuardando] = useState(false)

  const margenGrupo = leerNumero(margen)
  const margenGrupoValido = margenValido(margenGrupo)

  const filas = useMemo(() => {
    const medidas = miembros.map(m => leerMedida(m.unidad_medida))
    const costos = estimarCostos(miembros.map((m, i) => ({ costo: m.precio_costo_base ?? 0, medida: medidas[i] })))
    return miembros.map((m, i) => {
      const datos: DatosPrecio = {
        costo: costos[i].costo, tieneIva: m.tiene_iva, ivaIncluido: m.iva_incluido, porcentajeIva: m.porcentaje_iva,
      }
      const margenFila = leerNumero(margenesFila[m.id])
      const margenUsado = margenValido(margenFila) ? margenFila : margenGrupoValido ? margenGrupo : null
      const sugerido = margenUsado === null ? 0 : precioSugerido(datos, margenUsado, modo)
      const nuevo = leerNumero(nuevos[m.id]) ?? 0
      return {
        m,
        medida: medidas[i],
        serie: serieDe(medidas[i]),
        etiquetaSerie: medidas[i].prefijo ? `${medidas[i].prefijo}x` : medidas[i].unidad,
        costo: costos[i],
        datos,
        margenFilaInvalido: margenFila !== null && !margenValido(margenFila),
        sugerido,
        nuevo,
        margenNuevo: margenResultante(datos, nuevo),
        cambia: nuevo > 0 && nuevo !== m.precio_venta,
      }
    })
  }, [miembros, margenesFila, margenGrupo, margenGrupoValido, modo, nuevos])

  const alertas = useMemo(
    () => alertasEscala(filas.map(f => ({ serie: f.serie, precio: f.nuevo, datos: f.datos })), modo),
    [filas, modo],
  )

  // Variación de cada precio nuevo frente a la medida anterior de su serie
  const variaciones = useMemo(() => {
    const anterior = new Map<string, number>()
    return filas.map(f => {
      if (!(f.nuevo > 0)) return null
      const previo = anterior.get(f.serie)
      anterior.set(f.serie, f.nuevo)
      return previo ? ((f.nuevo - previo) / previo) * 100 : null
    })
  }, [filas])

  const variasSeries = new Set(filas.map(f => f.serie)).size > 1
  const cambios = filas.filter(f => f.cambia)
  const conPerdida = filas.filter((f, i) => f.cambia && alertas[i].includes('perdida')).length

  const fijarNuevo = (id: string, valor: number) => setNuevos(prev => ({ ...prev, [id]: String(valor) }))

  const usarSugeridos = () => {
    setNuevos(prev => {
      const siguiente = { ...prev }
      for (const f of filas) if (f.sugerido > 0) siguiente[f.m.id] = String(f.sugerido)
      return siguiente
    })
  }

  const restablecer = () => {
    setNuevos(Object.fromEntries(miembros.map(m => [m.id, String(m.precio_venta)])))
    setMargenesFila({})
  }

  const guardar = async () => {
    if (cambios.length === 0) return
    setGuardando(true)
    try {
      const precios = cambios.map(f => ({ producto_id: f.m.id, precio_venta: f.nuevo }))
      const { error } = await supabase.rpc('aplicar_escala_precios', { p_precios: precios })
      if (error) throw error
      toast.success(`Se guardaron ${precios.length} precio(s) de venta`)
      onGuardado(Object.fromEntries(precios.map(p => [p.producto_id, p.precio_venta])))
      router.refresh()
    } catch (err) {
      toast.error('Error al guardar los precios: ' + mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
      <div>
        <h3 className="font-display font-bold text-white">Escala de precios</h3>
        <p className="text-xs text-steel-500">
          Pon un margen y el sistema sugiere un precio por medida a partir del costo. Tú decides el precio final: al
          guardar, esos quedan como precios de venta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[9rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor="margen-grupo" className={LABEL_CLS}>Margen %</Label>
          <Input id="margen-grupo" type="number" inputMode="decimal" min={0} max={95} step="0.5" value={margen}
            onChange={e => setMargen(e.target.value)}
            className={`${INPUT_CLS} h-11 text-[16px] ${margenGrupoValido ? '' : 'border-brand-red/60'}`} />
        </div>
        <div className="space-y-1">
          <Label className={LABEL_CLS}>Redondeo</Label>
          <Select value={modo} onValueChange={v => v && setModo(v as ModoRedondeo)}
            items={MODOS_REDONDEO.map(o => ({ value: o.valor, label: o.etiqueta }))}>
            <SelectTrigger className="h-11 w-full border-white/10 bg-[#1a2430] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODOS_REDONDEO.map(o => <SelectItem key={o.valor} value={o.valor}>{o.etiqueta}</SelectItem>)}
            </SelectContent>
          </Select>
          {modo === 'auto' && (
            <p className="text-[11px] text-steel-500">A $50 los precios menores de $1.000 y a $100 los demás.</p>
          )}
        </div>
      </div>
      {!margenGrupoValido && <p className="text-xs text-brand-red">El margen debe estar entre 0 y 95 %.</p>}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" onClick={usarSugeridos} disabled={!margenGrupoValido}
          className="h-10 rounded-xl bg-brand-blue font-bold text-white hover:bg-brand-blue hover:brightness-110">
          Usar precios sugeridos
        </Button>
        <Button type="button" variant="outline" onClick={restablecer}
          className="h-10 rounded-xl border-white/15 bg-transparent font-semibold text-white hover:bg-white/5 hover:text-white">
          Volver a los precios actuales
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        {filas.map((f, i) => (
          <Fragment key={f.m.id}>
            {variasSeries && (i === 0 || filas[i - 1].serie !== f.serie) && (
              <div className="border-b border-white/5 bg-[#1a2430] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-steel-300">
                Serie {f.etiquetaSerie}
              </div>
            )}
            <div className={`border-b border-white/5 px-3 py-3 last:border-0 ${f.cambia ? 'bg-brand-yellow/5' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{f.m.unidad_medida || '—'}</span>
                {!f.m.activo && (
                  <span className="rounded-full bg-steel-700 px-2 py-0.5 text-[10px] font-bold uppercase text-steel-300">Inactivo</span>
                )}
                {alertas[i].map(a => {
                  const { clase, Icono } = ESTILO_ALERTA[a]
                  return (
                    <span key={a} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${clase}`}>
                      <Icono className="h-3 w-3" aria-hidden />{TEXTO_ALERTA[a]}
                    </span>
                  )
                })}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:items-start">
                <Dato etiqueta="Costo" valor={f.costo.costo > 0 ? pesosCosto(f.costo.costo) : 'Sin costo'}
                  nota={f.costo.estimado ? 'estimado' : undefined} />
                <Dato etiqueta="Actual" valor={pesos(f.m.precio_venta)} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-steel-500">Sugerido</p>
                  {f.sugerido > 0 ? (
                    <button type="button" onClick={() => fijarNuevo(f.m.id, f.sugerido)} title="Usar este precio"
                      className="text-sm font-semibold text-brand-blue hover:underline">
                      {pesos(f.sugerido)}
                    </button>
                  ) : (
                    <p className="text-sm text-steel-500">—</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor={`margen-${f.m.id}`} className="text-[10px] font-normal uppercase tracking-wide text-steel-500">Margen %</Label>
                  <Input id={`margen-${f.m.id}`} type="number" inputMode="decimal" min={0} max={95} step="0.5"
                    value={margenesFila[f.m.id] ?? ''} placeholder={margen}
                    onChange={e => setMargenesFila(prev => ({ ...prev, [f.m.id]: e.target.value }))}
                    className={`${INPUT_CLS} h-9 px-2 text-[16px] ${f.margenFilaInvalido ? 'border-brand-red/60' : ''}`} />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor={`nuevo-${f.m.id}`} className="text-[10px] font-normal uppercase tracking-wide text-steel-500">Nuevo</Label>
                  <Input id={`nuevo-${f.m.id}`} type="number" inputMode="numeric" min={0} step={50}
                    value={nuevos[f.m.id] ?? ''}
                    onChange={e => setNuevos(prev => ({ ...prev, [f.m.id]: e.target.value }))}
                    className={`${INPUT_CLS} h-9 px-2 text-[16px] ${f.cambia ? 'border-brand-yellow/60' : ''}`} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-steel-500">Margen nuevo</p>
                  <p className="text-sm text-white">{f.margenNuevo !== null ? `${f.margenNuevo.toFixed(1)} %` : '—'}</p>
                  {variaciones[i] !== null && (
                    <p className="text-[10px] text-steel-500">
                      {variaciones[i]! >= 0 ? '+' : ''}{variaciones[i]!.toFixed(0)} % vs. anterior
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      {conPerdida > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-brand-red">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {conPerdida} precio(s) nuevo(s) quedan por debajo del costo.
        </p>
      )}

      <Button type="button" onClick={guardar} disabled={cambios.length === 0 || guardando}
        className="h-11 w-full rounded-xl bg-brand-yellow font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
        {guardando ? 'Guardando…' : cambios.length === 0 ? 'Sin cambios de precio' : `Guardar ${cambios.length} precio(s)`}
      </Button>
    </div>
  )
}
