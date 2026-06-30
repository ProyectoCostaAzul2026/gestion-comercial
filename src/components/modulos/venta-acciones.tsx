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
  producto_id?: string
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
  proveedores_producto?: { id: string }[]
}

interface ItemRetirar {
  venta_item_id: string; nombre: string; cantidad_max: number
  cantidad: number; seleccionado: boolean; precio_unitario: number
  proveedores_producto?: { id: string }[]
}

interface ItemAgregar {
  key: string; producto_id: string; nombre: string
  precio_venta: number; cantidad: number; stock_almacen: number
}

interface GarantiaItem {
  venta_item_id: string
  nombre: string
  producto_id: string
  esGarantia: boolean
  proveedorId: string
  observacion: string
}

// Moved outside component so it's available at module level
interface FuenteDev { key: string; fuente: string; monto: number }

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

  // ── Garantías ──
  const [garantiasDevolucion, setGarantiasDevolucion] = useState<Record<string, GarantiaItem>>({})
  const [garantiasCambio, setGarantiasCambio] = useState<Record<string, GarantiaItem>>({})
  const [proveedoresList, setProveedoresList] = useState<{ id: string; nombre: string }[]>([])
  const [cargandoProveedores, setCargandoProveedores] = useState(false)

  const cargarProveedores = async () => {
    if (proveedoresList.length > 0) return
    setCargandoProveedores(true)
    const { data } = await supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre')
    setProveedoresList(data ?? [])
    setCargandoProveedores(false)
  }

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
    setGarantiasDevolucion({}); setGarantiasCambio({})
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

  // ── Fuentes de pago devolución ──
  const [fuentesDev, setFuentesDev] = useState<FuenteDev[]>([{ key: '1', fuente: 'caja_menor', monto: 0 }])
  const [esMixtoDev, setEsMixtoDev] = useState(false)

  // Registra en garantías los items marcados como defectuosos (no regresan a inventario)
  const registrarGarantias = async (
    garantias: Record<string, GarantiaItem>,
    ventaItemIds: string[]
  ) => {
    const itemsConGarantia = ventaItemIds
      .map(id => garantias[id])
      .filter((g): g is GarantiaItem => Boolean(g?.esGarantia && g.proveedorId))

    if (itemsConGarantia.length === 0) return

    const userId = (await supabase.auth.getUser()).data.user?.id

    for (const g of itemsConGarantia) {
      await (supabase as any).from('garantias').insert({
        producto_id: g.producto_id || null,
        proveedor_id: g.proveedorId,
        nombre_producto: g.nombre,
        cantidad: 1,
        observaciones: g.observacion || null,
        venta_id: ventaId,
        registrado_por: userId,
      })
    }
  }

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
      await registrarGarantias(garantiasDevolucion, seleccionadosDevolucion.map(i => i.venta_item_id))
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
      await registrarGarantias(garantiasCambio, seleccionadosCambio.map(i => i.venta_item_id))
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
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
      <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
        Acciones
      </h2>

      {accionActiva === 'ninguna' && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setAccionActiva('devolver')} className="text-sm text-brand-yellow hover:underline">Devolver productos</button>
          <span className="text-steel-500">·</span>
          <button type="button" onClick={() => setAccionActiva('cambiar')} className="text-sm text-brand-blue hover:underline">Cambiar productos</button>
          <span className="text-steel-500">·</span>
          <button type="button" onClick={() => setAccionActiva('anular')} className="text-sm text-brand-red hover:underline">Anular venta</button>
        </div>
      )}

      {accionActiva === 'anular' && (
        <div className="space-y-3 rounded-xl border border-brand-red/30 bg-brand-red/10 p-3">
          <p className="text-sm font-medium text-brand-red">Confirmar anulación</p>
          <div className="space-y-1">
            <Label className="text-xs text-brand-red">Motivo (obligatorio)</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAnular} disabled={anulando} className="bg-brand-red font-bold text-white hover:bg-brand-red hover:brightness-95">
              {anulando ? 'Anulando…' : 'Confirmar anulación'}
            </Button>
            <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={cerrar}>Cancelar</Button>
          </div>
        </div>
      )}

      {accionActiva === 'devolver' && (
        <div className="space-y-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3">
          <p className="text-sm font-medium text-brand-yellow">Selecciona los productos a devolver</p>
          <div className="space-y-2">
            {itemsDevolucion.map((item, idx) => (
              <div key={item.venta_item_id} className="rounded-xl border border-white/10 bg-[#1a2430] p-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={item.seleccionado}
                    onChange={e => setItemsDevolucion(prev => prev.map((it, i) => i === idx ? { ...it, seleccionado: e.target.checked } : it))}
                    className="h-4 w-4 accent-brand-yellow" />
                  <span className="flex-1 text-sm text-white">{item.nombre}</span>
                  {item.es_fraccionado ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-steel-300">Cant ({item.medida_venta}):</span>
                      <Input type="number" step={item.cantidad_minima_venta ?? 0.5}
                        min={item.cantidad_minima_venta ?? 0.5} max={item.cantidad_fraccion_max}
                        value={item.cantidad_fraccion ?? ''}
                        disabled={!item.seleccionado}
                        onChange={e => setItemsDevolucion(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad_fraccion: parseFloat(e.target.value) || 0 } : it))}
                        className="h-7 w-20 border-white/10 bg-[#111820] text-xs text-white" />
                      <span className="text-xs text-steel-500">/ {item.cantidad_fraccion_max}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-steel-300">Cant:</span>
                      <Input type="number" min={1} max={item.cantidad_max} value={item.cantidad}
                        disabled={!item.seleccionado}
                        onChange={e => setItemsDevolucion(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad: Math.min(parseInt(e.target.value) || 1, it.cantidad_max) } : it))}
                        className="h-7 w-16 border-white/10 bg-[#111820] text-xs text-white" />
                      <span className="text-xs text-steel-500">/ {item.cantidad_max}</span>
                    </div>
                  )}
                </div>

                {/* Switch garantía */}
                {item.seleccionado && (
                  <div className="mt-2 space-y-2 border-t border-white/8 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`garantia-dev-${item.venta_item_id}`}
                        checked={garantiasDevolucion[item.venta_item_id]?.esGarantia ?? false}
                        onChange={e => {
                          const checked = e.target.checked
                          const proveedores = item.proveedores_producto ?? []
                          const proveedorAuto = proveedores.length === 1 ? proveedores[0].id : ''
                          if (proveedores.length > 1) cargarProveedores()
                          setGarantiasDevolucion(prev => ({
                            ...prev,
                            [item.venta_item_id]: {
                              venta_item_id: item.venta_item_id,
                              nombre: item.nombre,
                              producto_id: items.find(i2 => i2.id === item.venta_item_id)?.producto_id ?? '',
                              esGarantia: checked,
                              proveedorId: prev[item.venta_item_id]?.proveedorId || proveedorAuto,
                              observacion: prev[item.venta_item_id]?.observacion ?? '',
                            }
                          }))
                        }}
                        className="h-4 w-4 accent-brand-yellow"
                      />
                      <label htmlFor={`garantia-dev-${item.venta_item_id}`} className="text-xs font-medium text-brand-yellow">
                        Enviar a garantía (no regresa al inventario)
                      </label>
                    </div>
                    {garantiasDevolucion[item.venta_item_id]?.esGarantia && (
                      <div className="space-y-1.5 pl-6">
                        <select
                          value={garantiasDevolucion[item.venta_item_id]?.proveedorId ?? ''}
                          onChange={e => setGarantiasDevolucion(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], proveedorId: e.target.value } }))}
                          className="w-full rounded-lg border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white"
                        >
                          <option value="">Selecciona proveedor…</option>
                          {proveedoresList.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <input
                          type="text"
                          placeholder="Observación (defecto, motivo…)"
                          value={garantiasDevolucion[item.venta_item_id]?.observacion ?? ''}
                          onChange={e => setGarantiasDevolucion(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], observacion: e.target.value } }))}
                          className="w-full rounded-lg border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white placeholder:text-steel-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {seleccionadosDevolucion.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1a2430] p-2 text-sm">
              <div className="flex justify-between font-medium">
                <span className="text-white">Monto a devolver</span>
                <span className="font-display text-brand-yellow">${montoDevolucion.toLocaleString('es-CO')}</span>
              </div>
              <p className="mt-0.5 text-xs text-steel-500">
                Calculado proporcionalmente según el descuento aplicado en la venta original
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-brand-yellow">Observación (obligatoria)</Label>
            <Textarea value={observacionDev} onChange={e => setObservacionDev(e.target.value)} rows={2} className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDevolver} disabled={devolviendo} className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
              {devolviendo ? 'Registrando…' : 'Confirmar devolución'}
            </Button>
            <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={cerrar}>Cancelar</Button>
          </div>
        </div>
      )}

      {accionActiva === 'cambiar' && (
        <div className="space-y-3 rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brand-blue">
              {paso === 1 ? 'Paso 1 — Selecciona productos a retirar' : 'Paso 2 — Agrega productos nuevos'}
            </p>
            <span className="text-xs text-brand-blue">{paso}/2</span>
          </div>

          {paso === 1 && (
            <>
              <div className="space-y-2">
                {itemsRetirar.map((item, idx) => (
                  <div key={item.venta_item_id} className="rounded-xl border border-white/10 bg-[#1a2430] p-2">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={item.seleccionado}
                        onChange={e => setItemsRetirar(prev => prev.map((it, i) => i === idx ? { ...it, seleccionado: e.target.checked } : it))}
                        className="h-4 w-4 accent-brand-blue" />
                      <span className="flex-1 text-sm text-white">{item.nombre}</span>
                      <div className="flex items-center gap-1">
                        <Input type="number" min={1} max={item.cantidad_max} value={item.cantidad}
                          disabled={!item.seleccionado}
                          onChange={e => setItemsRetirar(prev => prev.map((it, i) =>
                            i === idx ? { ...it, cantidad: Math.min(parseInt(e.target.value) || 1, it.cantidad_max) } : it))}
                          className="h-7 w-16 border-white/10 bg-[#111820] text-xs text-white" />
                        <span className="text-xs text-steel-500">/ {item.cantidad_max}</span>
                      </div>
                    </div>

                    {/* Switch garantía en cambio */}
                    {item.seleccionado && (
                      <div className="mt-2 space-y-2 border-t border-white/8 pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`garantia-cambio-${item.venta_item_id}`}
                            checked={garantiasCambio[item.venta_item_id]?.esGarantia ?? false}
                            onChange={e => {
                              const checked = e.target.checked
                              const proveedores = item.proveedores_producto ?? []
                              const proveedorAuto = proveedores.length === 1 ? proveedores[0].id : ''
                              if (proveedores.length > 1) cargarProveedores()
                              setGarantiasCambio(prev => ({
                                ...prev,
                                [item.venta_item_id]: {
                                  venta_item_id: item.venta_item_id,
                                  nombre: item.nombre,
                                  producto_id: items.find(i2 => i2.id === item.venta_item_id)?.producto_id ?? '',
                                  esGarantia: checked,
                                  proveedorId: prev[item.venta_item_id]?.proveedorId || proveedorAuto,
                                  observacion: prev[item.venta_item_id]?.observacion ?? '',
                                }
                              }))
                            }}
                            className="h-4 w-4 accent-brand-blue"
                          />
                          <label htmlFor={`garantia-cambio-${item.venta_item_id}`} className="text-xs font-medium text-brand-blue">
                            Producto defectuoso — enviar a garantía
                          </label>
                        </div>
                        {garantiasCambio[item.venta_item_id]?.esGarantia && (
                          <div className="space-y-1.5 pl-6">
                            <select
                              value={garantiasCambio[item.venta_item_id]?.proveedorId ?? ''}
                              onChange={e => setGarantiasCambio(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], proveedorId: e.target.value } }))}
                              className="w-full rounded-lg border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white"
                            >
                              <option value="">Selecciona proveedor…</option>
                              {proveedoresList.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                            <input
                              type="text"
                              placeholder="Observación (defecto, motivo…)"
                              value={garantiasCambio[item.venta_item_id]?.observacion ?? ''}
                              onChange={e => setGarantiasCambio(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], observacion: e.target.value } }))}
                              className="w-full rounded-lg border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white placeholder:text-steel-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { if (seleccionadosCambio.length === 0) { toast.error('Selecciona al menos un producto'); return } setPaso(2) }} className="bg-brand-blue font-bold text-white hover:brightness-110">
                  Siguiente →
                </Button>
                <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={cerrar}>Cancelar</Button>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="space-y-0.5 rounded-xl border border-white/10 bg-[#1a2430] p-2 text-xs text-steel-300">
                <p className="mb-1 font-medium text-white">Retirando:</p>
                {seleccionadosCambio.map(i => (
                  <div key={i.venta_item_id} className="flex justify-between">
                    <span>{i.nombre} × {i.cantidad}</span>
                    <span>-${(i.precio_unitario * i.cantidad).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
                <Input value={queryProducto}
                  onChange={async e => { setQueryProducto(e.target.value); await buscarProductos(e.target.value) }}
                  placeholder="Buscar producto a agregar…" className="border-white/10 bg-[#1a2430] pl-9 text-white placeholder:text-steel-500" />
                {resultadosProducto.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#111820] shadow-xl">
                    {resultadosProducto.map((p: any) => (
                      <button key={p.id} type="button"
                        className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                        onClick={() => agregarProductoCambio(p)}>
                        <span className="text-white">{p.nombre}</span>
                        <span className="text-xs text-steel-300">${p.precio_venta?.toLocaleString('es-CO')} · Stock: {p.stock_almacen}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {itemsAgregar.length > 0 && (
                <div className="space-y-1">
                  {itemsAgregar.map((item, idx) => (
                    <div key={item.key} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1a2430] p-2">
                      <span className="flex-1 text-sm text-white">{item.nombre}</span>
                      <Input type="number" min={1} max={item.stock_almacen} value={item.cantidad}
                        onChange={e => setItemsAgregar(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: parseInt(e.target.value) || 1 } : it))}
                        className="h-7 w-16 border-white/10 bg-[#111820] text-xs text-white" />
                      <span className="text-xs text-steel-300">${(item.precio_venta * item.cantidad).toLocaleString('es-CO')}</span>
                      <button type="button" onClick={() => setItemsAgregar(prev => prev.filter((_, i) => i !== idx))} className="text-steel-300 hover:text-brand-red">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {itemsAgregar.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-[#1a2430] p-2 text-sm">
                  <div className="flex justify-between"><span className="text-steel-300">Valor retirado</span><span className="text-white">-${valorRetirado.toLocaleString('es-CO')}</span></div>
                  <div className="flex justify-between"><span className="text-steel-300">Valor agregado</span><span className="text-white">+${valorAgregado.toLocaleString('es-CO')}</span></div>
                  <div className={`mt-1 flex justify-between border-t border-white/8 pt-1 font-bold ${diferencia > 0 ? 'text-emerald-400' : diferencia < 0 ? 'text-brand-yellow' : 'text-steel-300'}`}>
                    <span>{diferencia > 0 ? 'Cobrar al cliente' : diferencia < 0 ? 'Devolver al cliente' : 'Sin diferencia'}</span>
                    <span>${Math.abs(diferencia).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-brand-blue">Observación (obligatoria)</Label>
                <Textarea value={observacionCambio} onChange={e => setObservacionCambio(e.target.value)} rows={2} className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setPaso(1)}>← Atrás</Button>
                <Button size="sm" onClick={handleCambiar} disabled={cambiando} className="bg-brand-blue font-bold text-white hover:brightness-110">
                  {cambiando ? 'Registrando…' : 'Confirmar cambio'}
                </Button>
                <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={cerrar}>Cancelar</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}