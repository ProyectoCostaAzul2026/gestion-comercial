'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Trash2 } from 'lucide-react'

interface VentaItem {
  id: string; nombre_producto: string; cantidad: number
  precio_unitario: number; subtotal_linea: number
  es_fraccionado?: boolean; cantidad_fraccion?: number | null
  cantidad_minima_venta?: number | null; medida_venta?: string | null
}

interface ProductoSearch {
  id: string; nombre: string; codigo: string | null
  precio_venta: number; stock_almacen: number
}

interface ItemDevolucion {
  venta_item_id: string; nombre: string
  es_fraccionado: boolean
  cantidad_max: number; cantidad: number; seleccionado: boolean
  subtotal_linea: number
  cantidad_fraccion_max?: number; cantidad_fraccion?: number
  cantidad_minima_venta?: number | null; medida_venta?: string | null
}

interface ItemRetirar {
  venta_item_id: string; nombre: string; cantidad_max: number
  cantidad: number; seleccionado: boolean; precio_unitario: number
}

interface ItemAgregar {
  key: string; producto_id: string; nombre: string
  precio_venta: number; cantidad: number; stock_almacen: number
}

interface VentaAccionesProps {
  ventaId: string; esAdmin: boolean
  items: VentaItem[]
  ventaTotal: number
  ventaSubtotal: number
}

type Accion = 'ninguna' | 'anular' | 'devolver' | 'cambiar'

export function VentaAcciones({ ventaId, esAdmin, items, ventaTotal, ventaSubtotal }: VentaAccionesProps) {
  const router = useRouter()
  const supabase = createClient()
  const [accionActiva, setAccionActiva] = useState<Accion>('ninguna')

  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)

  const [itemsDevolucion, setItemsDevolucion] = useState<ItemDevolucion[]>(
    items.map(i => ({
      venta_item_id: i.id,
      nombre: i.nombre_producto,
      es_fraccionado: i.es_fraccionado ?? false,
      cantidad_max: i.cantidad,
      cantidad: i.cantidad,
      seleccionado: false,
      subtotal_linea: i.subtotal_linea,
      cantidad_fraccion_max: i.cantidad_fraccion ?? 0,
      cantidad_fraccion: i.cantidad_fraccion ?? 0,
      cantidad_minima_venta: i.cantidad_minima_venta,
      medida_venta: i.medida_venta,
    }))
  )
  const [observacionDev, setObservacionDev] = useState('')
  const [devolviendo, setDevolviendo] = useState(false)

  const [paso, setPaso] = useState<1 | 2>(1)
  const [itemsRetirar, setItemsRetirar] = useState<ItemRetirar[]>(
    items.filter(i => !i.es_fraccionado).map(i => ({
      venta_item_id: i.id, nombre: i.nombre_producto,
      cantidad_max: i.cantidad, cantidad: i.cantidad,
      seleccionado: false, precio_unitario: i.precio_unitario,
    }))
  )
  const [itemsAgregar, setItemsAgregar] = useState<ItemAgregar[]>([])
  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProducto, setResultadosProducto] = useState<ProductoSearch[]>([])
  const [observacionCambio, setObservacionCambio] = useState('')
  const [cambiando, setCambiando] = useState(false)

  const ratioGlobal = ventaSubtotal > 0 ? ventaTotal / ventaSubtotal : 1

  const cerrar = () => {
    setAccionActiva('ninguna'); setMotivo(''); setObservacionDev(''); setObservacionCambio(''); setPaso(1)
    setItemsDevolucion(items.map(i => ({
      venta_item_id: i.id, nombre: i.nombre_producto, es_fraccionado: i.es_fraccionado ?? false,
      cantidad_max: i.cantidad, cantidad: i.cantidad, seleccionado: false, subtotal_linea: i.subtotal_linea,
      cantidad_fraccion_max: i.cantidad_fraccion ?? 0, cantidad_fraccion: i.cantidad_fraccion ?? 0,
      cantidad_minima_venta: i.cantidad_minima_venta, medida_venta: i.medida_venta,
    })))
    setItemsRetirar(items.filter(i => !i.es_fraccionado).map(i => ({
      venta_item_id: i.id, nombre: i.nombre_producto, cantidad_max: i.cantidad,
      cantidad: i.cantidad, seleccionado: false, precio_unitario: i.precio_unitario,
    })))
    setItemsAgregar([]); setQueryProducto(''); setResultadosProducto([])
  }

  const handleAnular = async () => {
    if (!motivo.trim()) { toast.error('El motivo es obligatorio'); return }
    setAnulando(true)
    try {
      const { error } = await supabase.rpc('anular_venta', { p_venta_id: ventaId, p_motivo: motivo })
      if (error) throw error
      toast.success('Venta anulada')
      router.refresh()
    } catch (err: any) {
      toast.error('Error al anular: ' + err.message)
    } finally {
      setAnulando(false)
    }
  }

  // Cálculo correcto: proporcional al subtotal_linea × ratio_global
  const seleccionadosDevolucion = itemsDevolucion.filter(i => i.seleccionado)
  const montoDevolucion = Math.floor(seleccionadosDevolucion.reduce((sum, i) => {
    if (i.es_fraccionado) {
      const fraccionDevuelta = i.cantidad_fraccion ?? 0
      const fraccionOriginal = i.cantidad_fraccion_max ?? 1
      return sum + (i.subtotal_linea * ratioGlobal * (fraccionDevuelta / fraccionOriginal))
    }
    return sum + (i.subtotal_linea * ratioGlobal * (i.cantidad / i.cantidad_max))
  }, 0) / 100) * 100

  const handleDevolver = async () => {
    if (seleccionadosDevolucion.length === 0) { toast.error('Selecciona al menos un producto'); return }
    if (!observacionDev.trim()) { toast.error('La observación es obligatoria'); return }
    setDevolviendo(true)
    try {
      const payload = seleccionadosDevolucion.map(i =>
        i.es_fraccionado
          ? { venta_item_id: i.venta_item_id, cantidad: 1, cantidad_fraccion: i.cantidad_fraccion }
          : { venta_item_id: i.venta_item_id, cantidad: i.cantidad }
      )
      const { error } = await supabase.rpc('devolver_productos', {
        p_venta_id: ventaId, p_items_devolucion: payload, p_observacion: observacionDev,
      })
      if (error) throw error
      toast.success('Devolución registrada')
      router.refresh()
      cerrar()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setDevolviendo(false)
    }
  }

  const buscarProductos = useCallback(async (q: string) => {
    if (!q.trim()) { setResultadosProducto([]); return }
    const { data } = await supabase.rpc('buscar_productos', { p_query: q.trim() })
    setResultadosProducto((data as any) ?? [])
  }, [supabase])

  const agregarProductoCambio = (p: ProductoSearch) => {
    setItemsAgregar(prev => {
      const idx = prev.findIndex(i => i.producto_id === p.id)
      if (idx >= 0) {
        const n = [...prev]; n[idx] = { ...n[idx], cantidad: n[idx].cantidad + 1 }; return n
      }
      return [...prev, { key: `${p.id}-${Date.now()}`, producto_id: p.id, nombre: p.nombre, precio_venta: p.precio_venta, cantidad: 1, stock_almacen: p.stock_almacen }]
    })
    setQueryProducto(''); setResultadosProducto([])
  }

  const seleccionadosCambio = itemsRetirar.filter(i => i.seleccionado)
  const valorRetirado = seleccionadosCambio.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const valorAgregado = itemsAgregar.reduce((s, i) => s + i.precio_venta * i.cantidad, 0)
  const diferencia = valorAgregado - valorRetirado

  const handleCambiar = async () => {
    if (seleccionadosCambio.length === 0) { toast.error('Selecciona al menos un producto a retirar'); return }
    if (itemsAgregar.length === 0) { toast.error('Agrega al menos un producto nuevo'); return }
    if (!observacionCambio.trim()) { toast.error('La observación es obligatoria'); return }
    setCambiando(true)
    try {
      const { data, error } = await supabase.rpc('cambiar_productos', {
        p_venta_id: ventaId,
        p_items_retirar: seleccionadosCambio.map(i => ({ venta_item_id: i.venta_item_id, cantidad: i.cantidad })),
        p_items_agregar: itemsAgregar.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        p_observacion: observacionCambio,
      })
      if (error) throw error
      const r = data as any
      if (r.cobrar_al_cliente > 0) toast.success(`Cambio registrado. Cobrar: $${Number(r.cobrar_al_cliente).toLocaleString('es-CO')}`)
      else if (r.devolver_al_cliente > 0) toast.success(`Cambio registrado. Devolver: $${Number(r.devolver_al_cliente).toLocaleString('es-CO')}`)
      else toast.success('Cambio registrado sin diferencia')
      router.refresh(); cerrar()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setCambiando(false)
    }
  }

  if (!esAdmin) return null

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <h2 className="font-semibold text-slate-900">Acciones</h2>

      {accionActiva === 'ninguna' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAccionActiva('devolver')} className="text-sm text-amber-600 hover:underline">Devolver productos</button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={() => setAccionActiva('cambiar')} className="text-sm text-blue-600 hover:underline">Cambiar productos</button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={() => setAccionActiva('anular')} className="text-sm text-red-600 hover:underline">Anular venta</button>
        </div>
      )}

      {accionActiva === 'anular' && (
        <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">Confirmar anulación</p>
          <div className="space-y-1">
            <Label className="text-xs text-red-700">Motivo (obligatorio)</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="bg-white" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAnular} disabled={anulando} className="bg-red-600 hover:bg-red-700 text-white">
              {anulando ? 'Anulando…' : 'Confirmar anulación'}
            </Button>
            <Button size="sm" variant="outline" onClick={cerrar}>Cancelar</Button>
          </div>
        </div>
      )}

      {accionActiva === 'devolver' && (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">Selecciona los productos a devolver</p>
          <div className="space-y-2">
            {itemsDevolucion.map((item, idx) => (
              <div key={item.venta_item_id} className="flex items-center gap-3 rounded-md bg-white border p-2">
                <input type="checkbox" checked={item.seleccionado}
                  onChange={e => setItemsDevolucion(prev => prev.map((it, i) => i === idx ? { ...it, seleccionado: e.target.checked } : it))}
                  className="h-4 w-4" />
                <span className="flex-1 text-sm">{item.nombre}</span>
                {item.es_fraccionado ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Cant ({item.medida_venta}):</span>
                    <Input type="number" step={item.cantidad_minima_venta ?? 0.5}
                      min={item.cantidad_minima_venta ?? 0.5} max={item.cantidad_fraccion_max}
                      value={item.cantidad_fraccion ?? ''}
                      disabled={!item.seleccionado}
                      onChange={e => setItemsDevolucion(prev => prev.map((it, i) =>
                        i === idx ? { ...it, cantidad_fraccion: parseFloat(e.target.value) || 0 } : it))}
                      className="w-20 h-7 text-xs" />
                    <span className="text-xs text-slate-400">/ {item.cantidad_fraccion_max}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Cant:</span>
                    <Input type="number" min={1} max={item.cantidad_max} value={item.cantidad}
                      disabled={!item.seleccionado}
                      onChange={e => setItemsDevolucion(prev => prev.map((it, i) =>
                        i === idx ? { ...it, cantidad: Math.min(parseInt(e.target.value) || 1, it.cantidad_max) } : it))}
                      className="w-16 h-7 text-xs" />
                    <span className="text-xs text-slate-400">/ {item.cantidad_max}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {seleccionadosDevolucion.length > 0 && (
            <div className="rounded-md bg-white border p-2 text-sm">
              <div className="flex justify-between font-medium">
                <span>Monto a devolver</span>
                <span className="text-amber-700">${montoDevolucion.toLocaleString('es-CO')}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculado proporcionalmente según el descuento aplicado en la venta original
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-amber-800">Observación (obligatoria)</Label>
            <Textarea value={observacionDev} onChange={e => setObservacionDev(e.target.value)} rows={2} className="bg-white" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDevolver} disabled={devolviendo} className="bg-amber-600 hover:bg-amber-700 text-white">
              {devolviendo ? 'Registrando…' : 'Confirmar devolución'}
            </Button>
            <Button size="sm" variant="outline" onClick={cerrar}>Cancelar</Button>
          </div>
        </div>
      )}

      {accionActiva === 'cambiar' && (
        <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-800">
              {paso === 1 ? 'Paso 1 — Selecciona productos a retirar' : 'Paso 2 — Agrega productos nuevos'}
            </p>
            <span className="text-xs text-blue-500">{paso}/2</span>
          </div>

          {paso === 1 && (
            <>
              <div className="space-y-2">
                {itemsRetirar.map((item, idx) => (
                  <div key={item.venta_item_id} className="flex items-center gap-3 rounded-md bg-white border p-2">
                    <input type="checkbox" checked={item.seleccionado}
                      onChange={e => setItemsRetirar(prev => prev.map((it, i) => i === idx ? { ...it, seleccionado: e.target.checked } : it))}
                      className="h-4 w-4" />
                    <span className="flex-1 text-sm">{item.nombre}</span>
                    <div className="flex items-center gap-1">
                      <Input type="number" min={1} max={item.cantidad_max} value={item.cantidad}
                        disabled={!item.seleccionado}
                        onChange={e => setItemsRetirar(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad: Math.min(parseInt(e.target.value) || 1, it.cantidad_max) } : it))}
                        className="w-16 h-7 text-xs" />
                      <span className="text-xs text-slate-400">/ {item.cantidad_max}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { if (seleccionadosCambio.length === 0) { toast.error('Selecciona al menos un producto'); return } setPaso(2) }} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Siguiente →
                </Button>
                <Button size="sm" variant="outline" onClick={cerrar}>Cancelar</Button>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="rounded-md bg-white border p-2 text-xs text-slate-600 space-y-0.5">
                <p className="font-medium text-slate-700 mb-1">Retirando:</p>
                {seleccionadosCambio.map(i => (
                  <div key={i.venta_item_id} className="flex justify-between">
                    <span>{i.nombre} × {i.cantidad}</span>
                    <span>-${(i.precio_unitario * i.cantidad).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={queryProducto}
                  onChange={async e => { setQueryProducto(e.target.value); await buscarProductos(e.target.value) }}
                  placeholder="Buscar producto a agregar…" className="pl-9 bg-white" />
                {resultadosProducto.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg">
                    {resultadosProducto.map((p: any) => (
                      <button key={p.id} type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex justify-between"
                        onClick={() => agregarProductoCambio(p)}>
                        <span>{p.nombre}</span>
                        <span className="text-slate-500 text-xs">${p.precio_venta?.toLocaleString('es-CO')} · Stock: {p.stock_almacen}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {itemsAgregar.length > 0 && (
                <div className="space-y-1">
                  {itemsAgregar.map((item, idx) => (
                    <div key={item.key} className="flex items-center gap-2 rounded-md bg-white border p-2">
                      <span className="flex-1 text-sm">{item.nombre}</span>
                      <Input type="number" min={1} max={item.stock_almacen} value={item.cantidad}
                        onChange={e => setItemsAgregar(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: parseInt(e.target.value) || 1 } : it))}
                        className="w-16 h-7 text-xs" />
                      <span className="text-xs text-slate-500">${(item.precio_venta * item.cantidad).toLocaleString('es-CO')}</span>
                      <button type="button" onClick={() => setItemsAgregar(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {itemsAgregar.length > 0 && (
                <div className="rounded-md bg-white border p-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Valor retirado</span><span>-${valorRetirado.toLocaleString('es-CO')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Valor agregado</span><span>+${valorAgregado.toLocaleString('es-CO')}</span></div>
                  <div className={`flex justify-between font-bold border-t pt-1 mt-1 ${diferencia > 0 ? 'text-green-700' : diferencia < 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                    <span>{diferencia > 0 ? 'Cobrar al cliente' : diferencia < 0 ? 'Devolver al cliente' : 'Sin diferencia'}</span>
                    <span>${Math.abs(diferencia).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-blue-800">Observación (obligatoria)</Label>
                <Textarea value={observacionCambio} onChange={e => setObservacionCambio(e.target.value)} rows={2} className="bg-white" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPaso(1)}>← Atrás</Button>
                <Button size="sm" onClick={handleCambiar} disabled={cambiando} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {cambiando ? 'Registrando…' : 'Confirmar cambio'}
                </Button>
                <Button size="sm" variant="outline" onClick={cerrar}>Cancelar</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}