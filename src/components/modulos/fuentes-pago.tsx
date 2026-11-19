'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'

// De dónde sale el dinero de un gasto, retiro o pago: uno o varios medios, cada uno con su monto. Lo comparten las vistas
// de Caja (gasto, retiro) y cualquier otra que pague desde varios medios.

export interface FuentePago { key: string; fuente: string; monto: number }

export const FUENTES_DISPONIBLES = [
  { value: 'caja_menor', label: 'Efectivo (caja menor)' },
  { value: 'caja_mayor', label: 'Caja mayor' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

/** caja_menor y efectivo son el mismo saldo */
export const medioDeFuente = (fuente: string) => (fuente === 'caja_menor' || fuente === 'efectivo' ? 'efectivo' : fuente)

const nombreFuente = (fuente: string) => FUENTES_DISPONIBLES.find(f => f.value === fuente || medioDeFuente(f.value) === medioDeFuente(fuente))?.label ?? fuente
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/** Mensaje de error, o null si las fuentes están bien: montos positivos, suman el total y hay saldo en cada medio */
export function validarFuentes(fuentes: FuentePago[], monto: number, saldos: Record<string, number>): string | null {
  if (monto <= 0) return 'El monto debe ser mayor a 0'
  if (fuentes.some(f => f.monto <= 0)) return 'Cada fuente debe tener un monto mayor a 0'
  const suma = fuentes.reduce((s, f) => s + f.monto, 0)
  if (Math.abs(suma - monto) > 1) return `Las fuentes suman ${pesos(suma)} y el total es ${pesos(monto)}`
  const porMedio = new Map<string, number>()
  for (const f of fuentes) porMedio.set(medioDeFuente(f.fuente), (porMedio.get(medioDeFuente(f.fuente)) ?? 0) + f.monto)
  for (const [medio, usado] of porMedio) {
    const disponible = saldos[medio] ?? 0
    if (usado > disponible) return `No alcanza en ${nombreFuente(medio)}: hay ${pesos(disponible)} y se piden ${pesos(usado)}`
  }
  return null
}

export function FuentesPagoEditor({ fuentes, setFuentes, montoTotal, saldos }: {
  fuentes: FuentePago[]
  setFuentes: (f: FuentePago[]) => void
  montoTotal: number
  /** Saldo de cada medio, para mostrar cuánto hay */
  saldos: Record<string, number>
}) {
  const suma = fuentes.reduce((s, f) => s + f.monto, 0)
  const diferencia = montoTotal - suma
  const usadas = new Set(fuentes.map(f => f.fuente))
  const agregar = () => setFuentes([...fuentes, { key: String(Date.now()), fuente: FUENTES_DISPONIBLES.find(f => !usadas.has(f.value))?.value ?? 'caja_menor', monto: Math.max(diferencia, 0) }])
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-[15px] font-semibold text-tinta">¿De dónde sale?</Label>
        {fuentes.length < FUENTES_DISPONIBLES.length && (
          <button type="button" onClick={agregar}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-enlace hover:bg-velo/5">
            <Plus className="size-4" aria-hidden />Repartir en varios
          </button>
        )}
      </div>
      {fuentes.length === 1 ? (
        <SelectorMedio valor={fuentes[0].fuente} saldos={saldos} opciones={FUENTES_DISPONIBLES}
          onElegir={v => setFuentes([{ ...fuentes[0], fuente: v }])} />
      ) : (
        <ul className="space-y-2">
          {fuentes.map((f, idx) => (
            <li key={f.key} className="flex items-center gap-2 rounded-[14px] bg-superficie p-2.5">
              <MedioPagoIcono medio={f.fuente} className="h-7 w-[42px] shrink-0" />
              <div className="min-w-0 flex-1">
                <Select items={FUENTES_DISPONIBLES} value={f.fuente}
                  onValueChange={v => v && setFuentes(fuentes.map((it, i) => (i === idx ? { ...it, fuente: v } : it)))}>
                  <SelectTrigger aria-label="Medio" className="h-10 w-full border-linea bg-superficie-2 text-[15px] text-tinta"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUENTES_DISPONIBLES.map(fd => <SelectItem key={fd.value} value={fd.value}>{fd.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-0.5 text-sm text-suave">Hay <span className="cifra text-base">{pesos(saldos[medioDeFuente(f.fuente)] ?? 0)}</span></p>
              </div>
              <Input type="number" inputMode="numeric" value={f.monto || ''} onFocus={e => e.target.select()}
                onChange={e => setFuentes(fuentes.map((it, i) => (i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it)))}
                className="cifra h-11 w-28 border-linea bg-superficie-2 text-right text-lg text-tinta" placeholder="Monto" aria-label="Monto de este medio" />
              <button type="button" aria-label="Quitar este medio" onClick={() => setFuentes(fuentes.filter((_, i) => i !== idx))}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-suave hover:bg-velo/5 hover:text-sale">
                <Trash2 className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {fuentes.length > 1 && montoTotal > 0 && Math.abs(diferencia) > 0 && (
        <p className={`text-sm font-semibold ${diferencia > 0 ? 'text-aviso' : 'text-sale'}`}>
          {diferencia > 0 ? `Falta repartir ${pesos(diferencia)}` : `Sobran ${pesos(-diferencia)}`}
        </p>
      )}
    </div>
  )
}

/** Baldosas para elegir un medio de pago con su miniatura y lo que hay en él */
export function SelectorMedio({ valor, saldos, opciones = FUENTES_DISPONIBLES, onElegir, deshabilitado }: {
  valor: string
  saldos: Record<string, number>
  opciones?: { value: string; label: string }[]
  onElegir: (v: string) => void
  /** Medio que no se puede elegir (el origen de un traslado, por ejemplo) */
  deshabilitado?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {opciones.map(o => {
        const activo = medioDeFuente(o.value) === medioDeFuente(valor)
        const bloqueado = deshabilitado != null && medioDeFuente(o.value) === medioDeFuente(deshabilitado)
        return (
          <button key={o.value} type="button" aria-pressed={activo} disabled={bloqueado} onClick={() => onElegir(o.value)}
            className={`flex items-center gap-2.5 rounded-[14px] border-2 px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${
              activo ? 'border-accion bg-accion/10' : 'border-linea bg-superficie hover:bg-velo/5'}`}>
            <MedioPagoIcono medio={o.value} className="h-7 w-[42px] shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-tinta">{o.label.replace(' (caja menor)', '')}</span>
              <span className="cifra block text-base text-suave">{pesos(saldos[medioDeFuente(o.value)] ?? 0)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Con una sola fuente, su monto sigue al total */
export function ajustarFuenteUnica(fuentes: FuentePago[], monto: number): FuentePago[] {
  return fuentes.length === 1 ? [{ ...fuentes[0], monto }] : fuentes
}
