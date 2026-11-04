'use client'

import { useState } from 'react'
import { Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cantidadDePeso, formatearPeso, pesoDeCantidad, pesoUnitarioDeMuestra, rangoDePeso } from '@/lib/peso'

// Ayudas del peso por unidad: calcular el peso de una unidad con una muestra, contar el inventario por peso y saber
// cuánto pesar al vender. Todo en gramos.

const INPUT = 'h-10 border-white/10 bg-[#111820] text-[16px] text-white placeholder:text-steel-500'
const ETIQUETA = 'text-[10px] font-bold uppercase tracking-widest text-steel-300'

const numero = (texto: string): number => {
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Calcula el peso de una unidad pesando varias juntas (una sola pieza pesa muy poco para la báscula). */
export function CalculadoraPesoUnitario({ onUsar }: { onUsar: (pesoUnitario: number) => void }) {
  const [unidades, setUnidades] = useState('')
  const [pesoTotal, setPesoTotal] = useState('')
  const resultado = pesoUnitarioDeMuestra(numero(pesoTotal), numero(unidades))

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
      <p className="text-xs text-steel-300">Pesa varias unidades juntas (por ejemplo 50) y escribe cuántas son y cuánto pesaron.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="muestra-unidades" className={ETIQUETA}>Unidades pesadas</Label>
          <Input id="muestra-unidades" type="number" inputMode="numeric" min={1} value={unidades}
            onChange={e => setUnidades(e.target.value)} className={INPUT} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="muestra-peso" className={ETIQUETA}>Peso total (g)</Label>
          <Input id="muestra-peso" type="number" inputMode="decimal" min={0} step="0.1" value={pesoTotal}
            onChange={e => setPesoTotal(e.target.value)} className={INPUT} />
        </div>
      </div>
      {resultado !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white">Cada unidad pesa <span className="font-semibold">{formatearPeso(resultado)}</span></p>
          <Button type="button" size="sm" onClick={() => onUsar(resultado)}
            className="bg-brand-blue font-semibold text-white hover:bg-brand-blue hover:brightness-110">
            Usar este peso
          </Button>
        </div>
      )}
    </div>
  )
}

/** Cuenta el inventario de un lugar (bodega o almacén) a partir del peso total, descontando el recipiente. */
export function ContarPorPeso({ id, pesoUnitario, stockActual, lugar, onUsar }: {
  id: string
  pesoUnitario: number
  stockActual: number
  lugar: string
  onUsar: (unidades: number) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [pesoTotal, setPesoTotal] = useState('')
  const [recipiente, setRecipiente] = useState('')
  const unidades = cantidadDePeso(numero(pesoTotal), pesoUnitario, numero(recipiente))
  const diferencia = unidades !== null ? unidades - stockActual : null

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline">
        <Scale className="h-3.5 w-3.5" aria-hidden />Contar por peso
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-peso`} className={ETIQUETA}>Peso total (g)</Label>
          <Input id={`${id}-peso`} type="number" inputMode="decimal" min={0} step="0.1" value={pesoTotal}
            onChange={e => setPesoTotal(e.target.value)} className={INPUT} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-recipiente`} className={ETIQUETA}>Recipiente (g)</Label>
          <Input id={`${id}-recipiente`} type="number" inputMode="decimal" min={0} step="0.1" value={recipiente}
            placeholder="0" onChange={e => setRecipiente(e.target.value)} className={INPUT} />
        </div>
      </div>
      <p className="text-[11px] text-steel-500">
        El stock actual ({stockActual}) debería pesar {formatearPeso(pesoDeCantidad(stockActual, pesoUnitario))} sin recipiente.
      </p>
      {unidades !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white">
            Hay <span className="font-semibold">{unidades}</span> unidades
            {diferencia !== null && diferencia !== 0 && (
              <span className={diferencia < 0 ? 'text-brand-red' : 'text-emerald-400'}>
                {' '}({diferencia > 0 ? '+' : ''}{diferencia} frente al stock actual)
              </span>
            )}
          </p>
          <Button type="button" size="sm" onClick={() => { onUsar(unidades); setAbierto(false); setPesoTotal(''); setRecipiente('') }}
            className="bg-brand-blue font-semibold text-white hover:bg-brand-blue hover:brightness-110">
            Usar como stock de {lugar}
          </Button>
        </div>
      )}
      <button type="button" onClick={() => setAbierto(false)} className="text-[11px] text-steel-300 hover:underline">Cerrar</button>
    </div>
  )
}

/** En la venta: cuánto pesar para la cantidad pedida, o la cantidad que corresponde a lo que marca la báscula. */
export function AyudaPesoVenta({ id, pesoUnitario, cantidad, onCantidad }: {
  id: string
  pesoUnitario: number
  cantidad: number
  onCantidad: (cantidad: number) => void
}) {
  const [pesoBascula, setPesoBascula] = useState('')
  const rango = rangoDePeso(cantidad, pesoUnitario)
  const calculada = cantidadDePeso(numero(pesoBascula), pesoUnitario)

  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-[#111820] p-2">
      {rango && (
        <p className="flex items-start gap-1.5 text-xs text-steel-300">
          <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-blue" aria-hidden />
          <span>
            Pesar <span className="font-semibold text-white">{formatearPeso(pesoDeCantidad(cantidad, pesoUnitario))}</span>
            {' '}(entre {formatearPeso(rango[0])} y {formatearPeso(rango[1])} son {cantidad})
          </span>
        </p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`${id}-bascula`} className={ETIQUETA}>Peso en la báscula (g)</Label>
          <Input id={`${id}-bascula`} type="number" inputMode="decimal" min={0} step="0.1" value={pesoBascula}
            onChange={e => setPesoBascula(e.target.value)} className={INPUT} />
        </div>
        {calculada !== null && calculada > 0 && calculada !== cantidad && (
          <Button type="button" size="sm" onClick={() => { onCantidad(calculada); setPesoBascula('') }}
            className="h-10 bg-brand-blue font-semibold text-white hover:bg-brand-blue hover:brightness-110">
            Son {calculada}
          </Button>
        )}
      </div>
      <p className="text-[10px] text-steel-500">Pon la báscula en cero con la bolsa o el recipiente antes de pesar.</p>
    </div>
  )
}
