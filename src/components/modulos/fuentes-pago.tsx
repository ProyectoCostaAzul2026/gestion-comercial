'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Sale de</Label>
        {fuentes.length < FUENTES_DISPONIBLES.length && (
          <button type="button"
            onClick={() => setFuentes([...fuentes, { key: String(Date.now()), fuente: FUENTES_DISPONIBLES.find(f => !usadas.has(f.value))?.value ?? 'caja_menor', monto: Math.max(diferencia, 0) }])}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-blue hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" />Repartir en otro medio
          </button>
        )}
      </div>
      {fuentes.map((f, idx) => (
        <div key={f.key} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Select items={FUENTES_DISPONIBLES} value={f.fuente}
              onValueChange={v => v && setFuentes(fuentes.map((it, i) => (i === idx ? { ...it, fuente: v } : it)))}>
              <SelectTrigger className="h-11 w-full border-white/10 bg-[#1a2430] text-sm text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUENTES_DISPONIBLES.map(fd => <SelectItem key={fd.value} value={fd.value}>{fd.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-0.5 text-[11px] text-steel-500">Hay {pesos(saldos[medioDeFuente(f.fuente)] ?? 0)}</p>
          </div>
          {fuentes.length > 1 && (
            <Input type="number" inputMode="numeric" value={f.monto || ''} onFocus={e => e.target.select()}
              onChange={e => setFuentes(fuentes.map((it, i) => (i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it)))}
              className="h-11 w-32 border-white/10 bg-[#1a2430] text-right text-white" placeholder="Monto" aria-label="Monto de esta fuente" />
          )}
          {fuentes.length > 1 && (
            <button type="button" aria-label="Quitar esta fuente" onClick={() => setFuentes(fuentes.filter((_, i) => i !== idx))}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-steel-300 hover:bg-white/5 hover:text-brand-red">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {fuentes.length > 1 && montoTotal > 0 && Math.abs(diferencia) > 0 && (
        <p className={`text-xs ${diferencia > 0 ? 'text-brand-yellow' : 'text-brand-red'}`}>
          {diferencia > 0 ? `Falta repartir ${pesos(diferencia)}` : `Sobran ${pesos(-diferencia)}`}
        </p>
      )}
    </div>
  )
}

/** Con una sola fuente, su monto sigue al total */
export function ajustarFuenteUnica(fuentes: FuentePago[], monto: number): FuentePago[] {
  return fuentes.length === 1 ? [{ ...fuentes[0], monto }] : fuentes
}
