'use client'

import { useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { margenResultante } from '@/lib/escala-precios'
import {
  MAX_TRAMOS, erroresTramos, ordenarTramos, precioConCantidad, precioPaquete, precioSugeridoTramo, siguienteTramo,
  unitarioDePaquete,
  type DatosTramos, type TramoPrecio,
} from '@/lib/precios-cantidad'

// Precios por cantidad: editor de tramos (solo administrador), lista de solo lectura y aviso en las líneas de venta.

const INPUT = 'h-10 border-white/10 bg-[#111820] text-[16px] text-white placeholder:text-steel-500'
const ETIQUETA = 'text-[10px] font-bold uppercase tracking-widest text-steel-300'
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
const porcentaje = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`

const numero = (texto: string): number => {
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

interface Fila {
  clave: number
  /** Desde cuántas unidades */
  cantidad: string
  /** Precio del paquete (cantidad × precio por unidad) */
  paquete: string
  /** Margen con el que se sugiere el precio */
  margen: string
}

/** Tramos que salen de las filas del editor (una fila vacía no cuenta). */
function tramosDeFilas(filas: Fila[]): TramoPrecio[] {
  return filas
    .filter(f => f.cantidad.trim() !== '' || f.paquete.trim() !== '')
    .map(f => {
      const cantidad = numero(f.cantidad)
      return { cantidad_minima: cantidad, precio_unitario: unitarioDePaquete(numero(f.paquete), cantidad) ?? 0 }
    })
}

/** Margen para sugerir el precio del tramo i: 5 puntos menos por tramo, desde el margen del precio normal. */
const margenPorDefecto = (margenNormal: number, i: number) => String(Math.max(Math.round(margenNormal) - 5 * (i + 1), 0))

/**
 * Editor de los precios por cantidad de un producto. Se escribe el precio del paquete y muestra el de cada unidad
 * (en pesos enteros), el margen que deja y un precio sugerido con un margen menor que el normal. Toma los tramos
 * iniciales una sola vez (para reiniciarlo, cambiar su `key`) y avisa cada cambio con `onChange`.
 */
export function EditorTramos({ id, inicial, datos, margenNormal, onChange }: {
  id: string
  inicial: readonly TramoPrecio[]
  datos: DatosTramos
  /** Margen del precio normal, en %: los sugeridos bajan desde ahí */
  margenNormal: number
  onChange: (tramos: TramoPrecio[]) => void
}) {
  const [filas, setFilas] = useState<Fila[]>(() => ordenarTramos(inicial).map((t, i) => ({
    clave: i, cantidad: String(t.cantidad_minima), paquete: String(precioPaquete(t)), margen: margenPorDefecto(margenNormal, i),
  })))
  const [siguienteClave, setSiguienteClave] = useState(inicial.length)

  const actualizar = (nuevas: Fila[]) => {
    setFilas(nuevas)
    onChange(tramosDeFilas(nuevas))
  }
  const cambiar = (clave: number, cambio: Partial<Fila>) => actualizar(filas.map(f => (f.clave === clave ? { ...f, ...cambio } : f)))
  const agregar = () => {
    if (filas.length >= MAX_TRAMOS) return
    actualizar([...filas, { clave: siguienteClave, cantidad: '', paquete: '', margen: margenPorDefecto(margenNormal, filas.length) }])
    setSiguienteClave(c => c + 1)
  }

  const datosPrecio = { costo: datos.costo ?? 0, tieneIva: datos.tieneIva, ivaIncluido: datos.ivaIncluido, porcentajeIva: datos.porcentajeIva }
  const errores = erroresTramos(tramosDeFilas(filas), datos)

  return (
    <div className="space-y-3">
      <p className="text-xs text-steel-300">
        Precio normal: <span className="font-semibold text-white">{pesos(datos.precioVenta)} c/u</span>. Desde cada cantidad,
        todas las unidades se cobran al precio de ese tramo, sin descuento adicional.
      </p>

      {filas.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-steel-500">
          Sin precios por cantidad. Agrega uno, por ejemplo: desde 100 unidades, el paquete a $25.000.
        </p>
      )}

      {filas.map((f, i) => {
        const cantidad = numero(f.cantidad)
        const unitario = unitarioDePaquete(numero(f.paquete), cantidad)
        const margen = unitario ? margenResultante(datosPrecio, unitario) : null
        const sugerido = cantidad >= 2 ? precioSugeridoTramo(datosPrecio, numero(f.margen)) : 0
        const paqueteReal = unitario ? unitario * cantidad : 0
        return (
          <div key={f.clave} className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={`${id}-cantidad-${f.clave}`} className={ETIQUETA}>Desde (unidades)</Label>
                <Input id={`${id}-cantidad-${f.clave}`} type="number" inputMode="numeric" min={2} step={1} placeholder="Ej: 100"
                  value={f.cantidad} onChange={e => cambiar(f.clave, { cantidad: e.target.value })} className={INPUT} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-paquete-${f.clave}`} className={ETIQUETA}>Precio del paquete</Label>
                <Input id={`${id}-paquete-${f.clave}`} type="number" inputMode="numeric" min={0} step={1} placeholder="Ej: 25000"
                  value={f.paquete} onChange={e => cambiar(f.clave, { paquete: e.target.value })} className={INPUT} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar el precio ${i + 1}`}
                onClick={() => actualizar(filas.filter(x => x.clave !== f.clave))}
                className="h-10 w-10 text-steel-300 hover:bg-white/5 hover:text-brand-red">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {unitario !== null && (
              <p className="text-xs text-steel-300">
                = <span className="font-semibold text-white">{pesos(unitario)} c/u</span>
                {margen !== null && <> · margen {porcentaje(margen)}</>}
                {paqueteReal !== numero(f.paquete) && <> · el paquete queda en {pesos(paqueteReal)}</>}
              </p>
            )}

            {datosPrecio.costo > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-steel-300">
                <span>Sugerido con margen</span>
                <Input aria-label={`Margen para sugerir el precio ${i + 1}`} type="number" inputMode="decimal" min={0} max={95}
                  value={f.margen} onChange={e => cambiar(f.clave, { margen: e.target.value })}
                  className="h-8 w-16 border-white/10 bg-[#111820] text-xs text-white" />
                <span>%</span>
                {sugerido > 0 && (
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => cambiar(f.clave, { paquete: String(sugerido * cantidad) })}
                    className="h-8 border-brand-blue/40 bg-transparent text-xs text-brand-blue hover:bg-brand-blue/10 hover:text-brand-blue">
                    Usar {pesos(sugerido)} c/u ({pesos(sugerido * cantidad)})
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {filas.length < MAX_TRAMOS && (
        <Button type="button" variant="outline" onClick={agregar}
          className="w-full border-dashed border-white/20 bg-transparent text-steel-300 hover:bg-white/5 hover:text-white">
          <Plus className="mr-2 h-4 w-4" />Agregar precio por cantidad
        </Button>
      )}

      {errores.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-brand-red/10 p-2 text-xs text-brand-red">
          {errores.map(e => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  )
}

/** Precios por cantidad de solo lectura (empleados, ficha del producto). Tacha los que ya no son más baratos. */
export function ListaPreciosCantidad({ tramos, precioVenta }: { tramos: readonly TramoPrecio[]; precioVenta: number }) {
  if (tramos.length === 0) return null
  return (
    <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
      {ordenarTramos(tramos).map(t => (
        <li key={t.cantidad_minima}
          className={`flex flex-wrap items-center justify-between gap-x-3 px-3 py-2 text-sm ${t.precio_unitario < precioVenta ? 'text-white' : 'text-steel-500 line-through'}`}>
          <span>Desde {t.cantidad_minima.toLocaleString('es-CO')} unidades</span>
          <span><span className="font-semibold">{pesos(t.precio_unitario)} c/u</span> · paquete {pesos(precioPaquete(t))}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * En una línea de venta, cotización o cambio: el precio por cantidad que aplica y cuánto falta para el siguiente.
 * Con `soloNormal` (venta con descuento global) avisa que se cobra el precio normal.
 */
export function AvisoPrecioCantidad({ tramos, precioVenta, cantidad, soloNormal }: {
  tramos: readonly TramoPrecio[] | null | undefined
  precioVenta: number
  cantidad: number
  soloNormal?: boolean
}) {
  if (!tramos || tramos.length === 0) return null
  if (soloNormal) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-steel-300">
        <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Esta venta tiene descuento global: se cobra el precio normal, sin precio por cantidad.
      </p>
    )
  }
  const { tramo } = precioConCantidad(precioVenta, tramos, cantidad)
  const siguiente = siguienteTramo(tramos, precioVenta, cantidad)
  if (!tramo && !siguiente) return null
  return (
    <div className="space-y-1 text-xs">
      {tramo && (
        <p className="flex items-start gap-1.5 text-emerald-400">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Precio por cantidad desde {tramo.cantidad_minima}: {pesos(tramo.precio_unitario)} c/u (sin descuento adicional)</span>
        </p>
      )}
      {siguiente && (
        <p className="flex items-start gap-1.5 text-steel-300">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-blue" aria-hidden />
          <span>
            Lleve {siguiente.cantidad_minima} y paga <span className="font-semibold text-white">{pesos(siguiente.precio_unitario)} c/u</span>
            {' '}(faltan {siguiente.cantidad_minima - cantidad})
          </span>
        </p>
      )}
    </div>
  )
}
