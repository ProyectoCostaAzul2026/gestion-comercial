'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { precioPropuesto, preciosDelRenglon } from '@/lib/recepcion'
import { INPUT_CLS, LABEL_CLS } from './producto-form'
import { nombreConMedida, pesos, type RecepcionVista, type RenglonVista } from './recepcion-tipos'

const ivaDe = (r: RenglonVista) => ({
  tieneIva: r.producto!.tiene_iva,
  ivaIncluido: r.producto!.iva_incluido,
  porcentajeIva: r.producto!.porcentaje_iva,
})

/**
 * Pestaña "Precios" (solo administrador): con un margen, sugiere el precio de cada producto con el costo nuevo y
 * propone el mayor entre el actual y el sugerido (en un producto nuevo, el sugerido). Al aprobar se guardan el costo y
 * la referencia del proveedor y el precio de venta (aprobar_precios_recepcion).
 */
export function RecepcionPrecios({ recepcion, renglones, margenDefault }: {
  recepcion: RecepcionVista
  renglones: RenglonVista[]
  margenDefault: number
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const editable = recepcion.estado === 'abierta'
  const conProducto = renglones.filter(r => r.producto)
  const pendientes = renglones.length - conProducto.length
  const [margen, setMargen] = useState(String(margenDefault))
  const margenNum = Number(margen)
  const margenValido = margenNum >= 0 && margenNum < 100

  const sugeridoDe = (r: RenglonVista, m: number) =>
    preciosDelRenglon(r.costo_unitario, recepcion.costos_con_iva, ivaDe(r), m, r.producto!.precio_venta).sugerido

  // Precio de cada renglón: el que escribió el administrador o, si no, el propuesto (lo ya aprobado, mientras no pida
  // proponer de nuevo con otro margen)
  const [margenAplicado, setMargenAplicado] = useState(margenDefault)
  const [reproponer, setReproponer] = useState(false)
  const [editados, setEditados] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const propuesta = (r: RenglonVista) => (!reproponer && r.precio_aprobado != null
    ? String(r.precio_aprobado)
    : String(precioPropuesto(r.producto!.precio_venta, sugeridoDe(r, margenAplicado), r.producto!.activo)))
  const precios: Record<string, string> = Object.fromEntries(conProducto.map(r => [r.id, editados[r.id] ?? propuesta(r)]))
  const ponerPrecio = (id: string, valor: string) => setEditados(prev => ({ ...prev, [id]: valor }))

  const proponerConMargen = () => {
    if (!margenValido) { toast.error('El margen debe estar entre 0 y 99'); return }
    setMargenAplicado(margenNum)
    setReproponer(true)
    setEditados({})
  }

  const aprobar = async () => {
    const lista = conProducto.map(r => ({ renglon_id: r.id, precio_venta: Number(precios[r.id] ?? '') }))
    const malo = lista.find(p => !(p.precio_venta > 0))
    if (malo) {
      const r = conProducto.find(x => x.id === malo.renglon_id)!
      toast.error(`Escribe el precio de "${nombreConMedida(r.producto!)}"`)
      return
    }
    setGuardando(true)
    const { data, error } = await supabase.rpc('aprobar_precios_recepcion', { p_recepcion_id: recepcion.id, p_precios: lista })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Precios aprobados: ${data} producto${data === 1 ? '' : 's'}`)
    setReproponer(false)
    setEditados({})
    router.refresh()
  }

  if (conProducto.length === 0) {
    return <p className="text-sm text-steel-500">Todavía no hay renglones con producto para aprobar.</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex items-end gap-2">
          <div className="w-28 space-y-1">
            <Label htmlFor="recepcion-margen" className={LABEL_CLS}>Margen %</Label>
            <Input id="recepcion-margen" type="number" inputMode="decimal" min={0} max={99} step="0.5" value={margen} onChange={e => setMargen(e.target.value)} className={`h-11 ${INPUT_CLS}`} />
          </div>
          <Button type="button" variant="outline" onClick={proponerConMargen} disabled={!editable}
            className="h-11 flex-1 border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow">
            Proponer precios con este margen
          </Button>
        </div>
        <p className="text-xs text-steel-300">
          Se propone el mayor entre el precio actual y el sugerido, para no bajar precios sin querer; en un producto nuevo,
          el sugerido. Puedes cambiar cualquiera. Al aprobar se guardan el costo y la referencia de {recepcion.proveedor_nombre}
          {' '}y el precio de venta, y los productos nuevos quedan activos. Los empleados cuentan cada renglón cuando
          su precio está aprobado: apruébalos antes del conteo (y otra vez si se agregan renglones o cambia un costo).
        </p>
      </div>

      {pendientes > 0 && (
        <p className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3 text-sm text-brand-yellow">
          {pendientes === 1 ? '1 renglón no tiene producto' : `${pendientes} renglones no tienen producto`}: entran en la aprobación cuando los crees o asocies (pestaña Factura).
        </p>
      )}

      <ul className="space-y-2">
        {conProducto.map(r => {
          const p = r.producto!
          const precioNum = Number(precios[r.id] ?? '')
          const calc = preciosDelRenglon(r.costo_unitario, recepcion.costos_con_iva, ivaDe(r), margenValido ? margenNum : margenDefault, precioNum)
          const cambioCosto = r.costo_anterior && r.costo_anterior > 0 && r.costo_unitario > 0
            ? Math.round(((calc.costoNuevo - r.costo_anterior) / r.costo_anterior) * 1000) / 10 : null
          const aprobado = r.precio_aprobado != null && Number(r.precio_aprobado) === precioNum
          return (
            <li key={r.id} className="space-y-2 rounded-2xl border border-white/10 bg-[#111820] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{nombreConMedida(p)}</p>
                {!p.activo && <span className="rounded-full border border-brand-blue/40 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">Nuevo: se activa al aprobar</span>}
                {aprobado && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Aprobado</span>}
              </div>
              <p className="flex flex-wrap items-center gap-1 text-xs text-steel-300">
                Costo {r.costo_anterior ? pesos(r.costo_anterior) : 'nuevo'}
                <ArrowRight className="h-3 w-3" />
                <span className="text-white">{r.costo_unitario > 0 ? pesos(calc.costoNuevo) : 'sin costo (no cambia)'}</span>
                {cambioCosto != null && cambioCosto !== 0 && (
                  <span className={cambioCosto > 0 ? 'text-brand-red' : 'text-emerald-400'}>({cambioCosto > 0 ? '+' : ''}{cambioCosto} %)</span>
                )}
                {p.tiene_iva && <span>· {p.iva_incluido ? 'con IVA' : 'sin IVA'}</span>}
              </p>
              <div className="grid grid-cols-3 items-end gap-2">
                <div>
                  <p className={LABEL_CLS}>Actual</p>
                  <p className="text-sm text-white">{pesos(p.precio_venta)}</p>
                </div>
                <div>
                  <p className={LABEL_CLS}>Sugerido</p>
                  {calc.sugerido > 0 && editable ? (
                    <button type="button" onClick={() => ponerPrecio(r.id, String(calc.sugerido))}
                      className="text-sm font-semibold text-brand-blue hover:underline">{pesos(calc.sugerido)}</button>
                  ) : <p className="text-sm text-steel-500">{calc.sugerido > 0 ? pesos(calc.sugerido) : '—'}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`precio-${r.id}`} className={LABEL_CLS}>Precio nuevo</Label>
                  <Input id={`precio-${r.id}`} type="number" inputMode="decimal" min={0} step={50} value={precios[r.id] ?? ''} disabled={!editable}
                    onChange={e => ponerPrecio(r.id, e.target.value)} className={`h-10 ${INPUT_CLS}`} />
                </div>
              </div>
              <p className="text-xs text-steel-300">
                {calc.margen != null && (
                  <span className={calc.margen < 0 ? 'font-semibold text-brand-red' : ''}>
                    Margen {calc.margen.toLocaleString('es-CO')} %{calc.margen < 0 ? ': queda bajo el costo' : ''}
                  </span>
                )}
                {p.vender_por_fraccion && <span> · Se vende por fracción: revisa su precio por unidad de medida en Editar producto.</span>}
                {r.tiene_tramos && <span> · Tiene precios por cantidad: revísalos en Editar producto.</span>}
              </p>
            </li>
          )
        })}
      </ul>

      {editable && (
        <Button type="button" onClick={aprobar} disabled={guardando}
          className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
          {guardando ? 'Aprobando…' : 'Aprobar costos y precios'}
        </Button>
      )}
    </div>
  )
}
