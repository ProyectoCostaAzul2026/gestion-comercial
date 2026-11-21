'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useNavegacion } from '@/lib/navegacion'
import { toast } from '@/lib/avisos'
import { confirmar } from '@/components/ui/confirmar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MiniaturaProducto } from '@/components/ui/producto-miniatura'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban, Repeat, Search, Trash2, Undo2 } from 'lucide-react'
import { precioConCantidad, type TramoPrecio } from '@/lib/precios-cantidad'
import { AvisoPrecioCantidad } from './precios-cantidad'
import {
  MEDIOS_AJUSTE, MEDIO_AJUSTE_LABEL, calcularCambio, calcularMontoDevolucion, medioPorDefecto,
  repartirAjusteCredito, type MedioAjuste,
} from '@/lib/ajustes-venta'

interface VentaItem {
  id: string; nombre_producto: string
  /** Unidades que quedan por devolver (en líneas fraccionadas, siempre 1) */
  cantidad: number
  /** venta_items.cantidad */
  cantidad_linea?: number
  precio_unitario: number; subtotal_linea: number; descuento_linea?: number
  es_fraccionado?: boolean
  /** Fracción que queda por devolver */
  cantidad_fraccion?: number | null
  /** venta_items.cantidad_fraccion */
  cantidad_fraccion_linea?: number | null
  cantidad_minima_venta?: number | null; medida_venta?: string | null
  producto_id?: string
  imagen_url?: string | null
}

interface ProductoSearch {
  id: string; nombre: string; codigo: string | null
  precio_venta: number; stock_almacen: number
  imagen_url?: string | null
  /** Precios por cantidad (buscar_productos), de menor a mayor cantidad mínima */
  precios_cantidad?: TramoPrecio[] | null
}

interface ItemDevolucion {
  venta_item_id: string; nombre: string; imagen_url?: string | null
  es_fraccionado: boolean
  cantidad_max: number; cantidad: number; seleccionado: boolean
  subtotal_linea: number; cantidad_linea: number
  cantidad_fraccion_max?: number; cantidad_fraccion?: number; cantidad_fraccion_linea: number
  cantidad_minima_venta?: number | null; medida_venta?: string | null
  proveedores_producto?: { id: string }[]
}

interface ItemRetirar {
  venta_item_id: string; nombre: string; imagen_url?: string | null; cantidad_max: number
  cantidad: number; seleccionado: boolean; precio_unitario: number
  cantidad_linea: number; descuento_linea: number; subtotal_linea: number
  proveedores_producto?: { id: string }[]
}

interface ItemAgregar {
  key: string; producto_id: string; nombre: string; imagen_url?: string | null
  /** Precio normal; el que se cobra puede ser el de un tramo de precio por cantidad (precioAgregado) */
  precio_venta: number; cantidad: number; stock_almacen: number
  tramos: TramoPrecio[]
}

interface GarantiaItem {
  venta_item_id: string
  nombre: string
  producto_id: string
  esGarantia: boolean
  proveedorId: string
  observacion: string
}

interface VentaAccionesProps {
  ventaId: string; esAdmin: boolean
  /** Vista propia de la acción (/dashboard/ventas/[id]?accion=...): abre esa acción y, al terminar o cancelar, vuelve al detalle */
  accion?: AccionVenta
  items: VentaItem[]
  ventaTotal: number
  /** Suma de subtotal_linea de todas las líneas de la venta más sus servicios */
  baseVenta: number
  /** Descuento global de la venta en porcentaje (0 si no tiene) */
  descuentoGlobalPorcentaje: number
  /** La venta tiene descuento global (porcentaje o total editado): lo que se agrega va a precio normal */
  conDescuentoGlobal: boolean
  tipoPago: string
  /** La venta ya tiene devoluciones o cambios: no se puede anular */
  tieneAjustes: boolean
  /** La venta tiene servicios: devolver todos los productos no la anula */
  tieneServicios: boolean
  /** Venta a crédito: deuda pendiente y lo abonado (null si es de contado) */
  credito: { saldoPendiente: number; abonado: number } | null
}

export type AccionVenta = 'anular' | 'devolver' | 'cambiar'
type Accion = 'ninguna' | AccionVenta

const itemsDevolucionIniciales = (items: VentaItem[]): ItemDevolucion[] =>
  items.map(i => ({
    venta_item_id: i.id,
    nombre: i.nombre_producto,
    imagen_url: i.imagen_url,
    es_fraccionado: i.es_fraccionado ?? false,
    cantidad_max: i.cantidad,
    cantidad: i.cantidad,
    seleccionado: false,
    subtotal_linea: i.subtotal_linea,
    cantidad_linea: i.cantidad_linea ?? i.cantidad,
    cantidad_fraccion_max: i.cantidad_fraccion ?? 0,
    cantidad_fraccion: i.cantidad_fraccion ?? 0,
    cantidad_fraccion_linea: i.cantidad_fraccion_linea ?? i.cantidad_fraccion ?? 0,
    cantidad_minima_venta: i.cantidad_minima_venta,
    medida_venta: i.medida_venta,
  }))

const itemsRetirarIniciales = (items: VentaItem[]): ItemRetirar[] =>
  items.filter(i => !i.es_fraccionado).map(i => ({
    venta_item_id: i.id, nombre: i.nombre_producto, imagen_url: i.imagen_url,
    cantidad_max: i.cantidad, cantidad: i.cantidad,
    seleccionado: false, precio_unitario: i.precio_unitario,
    cantidad_linea: i.cantidad_linea ?? i.cantidad,
    descuento_linea: i.descuento_linea ?? 0,
    subtotal_linea: i.subtotal_linea,
  }))

const selectMedioCls = 'rounded-lg border border-linea bg-superficie px-2 py-1 text-xs text-tinta'

export function VentaAcciones({
  ventaId, esAdmin, items, ventaTotal, baseVenta, descuentoGlobalPorcentaje, conDescuentoGlobal, tipoPago, tieneAjustes,
  tieneServicios, credito, accion,
}: VentaAccionesProps) {
  const router = useRouter()
  const supabase = createClient()
  const { volver } = useNavegacion()
  const [accionActiva, setAccionActiva] = useState<Accion>(accion ?? 'ninguna')

  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)

  const [itemsDevolucion, setItemsDevolucion] = useState<ItemDevolucion[]>(() => itemsDevolucionIniciales(items))
  const [observacionDev, setObservacionDev] = useState('')
  const [devolviendo, setDevolviendo] = useState(false)
  const [medioDevolucion, setMedioDevolucion] = useState<MedioAjuste>(medioPorDefecto(tipoPago))

  const [paso, setPaso] = useState<1 | 2>(1)
  const [itemsRetirar, setItemsRetirar] = useState<ItemRetirar[]>(() => itemsRetirarIniciales(items))
  const [itemsAgregar, setItemsAgregar] = useState<ItemAgregar[]>([])
  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProducto, setResultadosProducto] = useState<ProductoSearch[]>([])
  const [observacionCambio, setObservacionCambio] = useState('')
  const [cambiando, setCambiando] = useState(false)
  const [medioCambio, setMedioCambio] = useState<MedioAjuste>(medioPorDefecto(tipoPago))

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

  const cerrar = () => {
    // En la vista propia de la acción, cancelar o terminar vuelve al detalle de la venta (y lo recarga)
    if (accion) { volver(`/dashboard/ventas/${ventaId}`, { refrescar: true }); return }
    setAccionActiva('ninguna'); setMotivo(''); setObservacionDev(''); setObservacionCambio(''); setPaso(1)
    setItemsDevolucion(itemsDevolucionIniciales(items))
    setItemsRetirar(itemsRetirarIniciales(items))
    setItemsAgregar([]); setQueryProducto(''); setResultadosProducto([])
    setGarantiasDevolucion({}); setGarantiasCambio({})
    setMedioDevolucion(medioPorDefecto(tipoPago)); setMedioCambio(medioPorDefecto(tipoPago))
  }

  const handleAnular = async () => {
    if (!motivo.trim()) { toast.error('El motivo es obligatorio'); return }
    const ok = await confirmar({
      titulo: '¿Anular esta venta?',
      mensaje: 'Los productos vuelven al inventario y el dinero cobrado se devuelve. No se puede deshacer.',
      detalle: [
        { etiqueta: 'Total de la venta', valor: `$${ventaTotal.toLocaleString('es-CO')}` },
        { etiqueta: 'Motivo', valor: motivo.trim() },
      ],
      tono: 'peligro',
      textoConfirmar: 'Anular venta',
    })
    if (!ok) return
    setAnulando(true)
    try {
      const { error } = await supabase.rpc('anular_venta', { p_venta_id: ventaId, p_motivo: motivo })
      if (error) throw error
      toast.success('Venta anulada', { description: 'Los productos volvieron al inventario.' })
      router.refresh()
      if (accion) cerrar()
    } catch (err: any) {
      toast.error('No se pudo anular la venta', { description: err.message })
    } finally {
      setAnulando(false)
    }
  }

  // Misma fórmula que devolver_productos: la parte del total pagado que corresponde a lo devuelto
  const seleccionadosDevolucion = itemsDevolucion.filter(i => i.seleccionado)
  const montoDevolucion = calcularMontoDevolucion(
    seleccionadosDevolucion.map(i => i.es_fraccionado
      ? { subtotalLinea: i.subtotal_linea, cantidadLinea: i.cantidad_fraccion_linea, cantidadDevuelta: i.cantidad_fraccion ?? 0 }
      : { subtotalLinea: i.subtotal_linea, cantidadLinea: i.cantidad_linea, cantidadDevuelta: i.cantidad }),
    ventaTotal, baseVenta,
  )
  // En una venta a crédito, lo devuelto baja primero la deuda y solo el resto sale en dinero (devolver_productos)
  const devuelveTodo = !tieneServicios && itemsDevolucion.length > 0 && itemsDevolucion.every(i =>
    i.seleccionado && (i.es_fraccionado ? (i.cantidad_fraccion ?? 0) >= (i.cantidad_fraccion_max ?? 0) : i.cantidad >= i.cantidad_max))
  const repartoDevolucion = repartirAjusteCredito(-montoDevolucion, credito?.saldoPendiente ?? null, devuelveTodo)
  const devolucionEnDinero = -repartoDevolucion.caja
  const devolucionADeuda = -repartoDevolucion.deuda

  // Envía a garantía lo marcado como defectuoso. La devolución ya regresó esas unidades al inventario: la función
  // registrar_garantia las saca (van hacia el proveedor) y recibir_garantia las suma cuando vuelven.
  const registrarGarantias = async (
    garantias: Record<string, GarantiaItem>,
    seleccionados: { venta_item_id: string; cantidad: number; es_fraccionado?: boolean }[]
  ) => {
    const fallos: string[] = []
    for (const sel of seleccionados) {
      const g = garantias[sel.venta_item_id]
      if (!g?.esGarantia || sel.es_fraccionado) continue
      if (!g.producto_id) { fallos.push(`${g.nombre}: el producto ya no existe`); continue }
      const { error } = await supabase.rpc('registrar_garantia', {
        p_producto_id: g.producto_id,
        p_proveedor_id: g.proveedorId,
        p_cantidad: sel.cantidad,
        p_observaciones: g.observacion || undefined,
        p_venta_id: ventaId,
      })
      if (error) {
        fallos.push(`${g.nombre}: ${error.code === 'PGRST202' ? 'falta activar las garantías en la base de datos (migración garantias_y_fraccion)' : error.message}`)
      }
    }
    if (fallos.length > 0) toast.error(`No se registró la garantía de ${fallos.join('; ')}`, { duration: 10000 })
  }

  /** Una garantía marcada sin proveedor no se puede registrar: se avisa antes de hacer la devolución o el cambio */
  const garantiaSinProveedor = (garantias: Record<string, GarantiaItem>, ids: string[]) =>
    ids.some(id => garantias[id]?.esGarantia && !garantias[id]?.proveedorId)

  const handleDevolver = async () => {
    if (seleccionadosDevolucion.length === 0) { toast.error('Selecciona al menos un producto'); return }
    if (!observacionDev.trim()) { toast.error('La observación es obligatoria'); return }
    if (garantiaSinProveedor(garantiasDevolucion, seleccionadosDevolucion.map(i => i.venta_item_id))) {
      toast.error('Elige el proveedor de cada producto que va a garantía'); return
    }
    const okDev = await confirmar({
      titulo: '¿Registrar la devolución?',
      mensaje: 'Los productos vuelven al inventario (o van a garantía si los marcaste).',
      detalle: [
        { etiqueta: 'Productos', valor: String(seleccionadosDevolucion.length) },
        ...(devolucionADeuda > 0 ? [{ etiqueta: 'Se descuenta de la deuda', valor: `$${devolucionADeuda.toLocaleString('es-CO')}` }] : []),
        ...(devolucionEnDinero > 0 ? [{ etiqueta: `Devolver por ${MEDIO_AJUSTE_LABEL[medioDevolucion]}`, valor: `$${devolucionEnDinero.toLocaleString('es-CO')}`, fuerte: true }] : []),
      ],
      tono: 'aviso',
      textoConfirmar: 'Registrar devolución',
    })
    if (!okDev) return
    setDevolviendo(true)
    try {
      const payload = seleccionadosDevolucion.map(i =>
        i.es_fraccionado
          ? { venta_item_id: i.venta_item_id, cantidad: 1, cantidad_fraccion: i.cantidad_fraccion }
          : { venta_item_id: i.venta_item_id, cantidad: i.cantidad }
      )
      const { error } = await supabase.rpc('devolver_productos', {
        p_venta_id: ventaId, p_items_devolucion: payload, p_observacion: observacionDev,
        p_medio_devolucion: medioDevolucion,
      })
      if (error) throw error
      await registrarGarantias(garantiasDevolucion, seleccionadosDevolucion)
      const partes = [
        devolucionADeuda > 0 ? `Descontado de la deuda: $${devolucionADeuda.toLocaleString('es-CO')}` : '',
        devolucionEnDinero > 0 ? `Devolver: $${devolucionEnDinero.toLocaleString('es-CO')} (${MEDIO_AJUSTE_LABEL[medioDevolucion]})` : '',
      ].filter(Boolean)
      toast.success('Devolución registrada', partes.length > 0 ? { description: partes.join('. ') + '.' } : undefined)
      router.refresh()
      cerrar()
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message })
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
      return [...prev, { key: `${p.id}-${Date.now()}`, producto_id: p.id, nombre: p.nombre, imagen_url: p.imagen_url, precio_venta: p.precio_venta, cantidad: 1, stock_almacen: p.stock_almacen, tramos: p.precios_cantidad ?? [] }]
    })
    setQueryProducto(''); setResultadosProducto([])
  }

  // Precio de lo que se agrega, como cambiar_productos: el del tramo de precio por cantidad que alcance lo que se agrega
  // de ese producto, salvo en una venta con descuento global (va a precio normal)
  const cantidadAgregada = (productoId: string) =>
    itemsAgregar.filter(i => i.producto_id === productoId).reduce((suma, i) => suma + i.cantidad, 0)
  const precioAgregado = (item: ItemAgregar): number =>
    conDescuentoGlobal ? item.precio_venta : precioConCantidad(item.precio_venta, item.tramos, cantidadAgregada(item.producto_id)).precio

  // Misma fórmula que cambiar_productos: se cobra (o devuelve) lo que cambia el valor de la venta con sus descuentos
  const seleccionadosCambio = itemsRetirar.filter(i => i.seleccionado)
  const { totalNuevo: totalTrasCambio, diferencia } = calcularCambio({
    totalVenta: ventaTotal,
    baseVenta,
    retiros: seleccionadosCambio.map(i => ({
      precioUnitario: i.precio_unitario, cantidadLinea: i.cantidad_linea, descuentoLinea: i.descuento_linea,
      subtotalLinea: i.subtotal_linea, cantidadRetirada: i.cantidad,
    })),
    agregados: itemsAgregar.map(i => ({ precioVenta: precioAgregado(i), cantidad: i.cantidad })),
    descuentoGlobalPorcentaje,
  })
  // En una venta a crédito, la diferencia ajusta primero la deuda (cambiar_productos); cajaCambio es el dinero
  const { deuda: deudaCambio, caja: cajaCambio } = repartirAjusteCredito(diferencia, credito?.saldoPendiente ?? null)

  const handleCambiar = async () => {
    if (seleccionadosCambio.length === 0) { toast.error('Selecciona al menos un producto a retirar'); return }
    if (itemsAgregar.length === 0) { toast.error('Agrega al menos un producto nuevo'); return }
    if (!observacionCambio.trim()) { toast.error('La observación es obligatoria'); return }
    if (garantiaSinProveedor(garantiasCambio, seleccionadosCambio.map(i => i.venta_item_id))) {
      toast.error('Elige el proveedor de cada producto que va a garantía'); return
    }
    const okCambio = await confirmar({
      titulo: '¿Registrar el cambio de productos?',
      mensaje: 'Lo retirado vuelve al inventario y lo nuevo sale de él.',
      detalle: [
        { etiqueta: 'Se retiran', valor: `${seleccionadosCambio.length} producto${seleccionadosCambio.length === 1 ? '' : 's'}` },
        { etiqueta: 'Se entregan', valor: `${itemsAgregar.length} producto${itemsAgregar.length === 1 ? '' : 's'}` },
        ...(deudaCambio !== 0 ? [{ etiqueta: deudaCambio > 0 ? 'Se suma a la deuda' : 'Se descuenta de la deuda', valor: `$${Math.abs(deudaCambio).toLocaleString('es-CO')}` }] : []),
        ...(cajaCambio !== 0 ? [{ etiqueta: `${cajaCambio > 0 ? 'Cobrar' : 'Devolver'} por ${MEDIO_AJUSTE_LABEL[medioCambio]}`, valor: `$${Math.abs(cajaCambio).toLocaleString('es-CO')}`, fuerte: true }] : []),
      ],
      tono: 'aviso',
      textoConfirmar: 'Registrar cambio',
    })
    if (!okCambio) return
    setCambiando(true)
    try {
      const { data, error } = await supabase.rpc('cambiar_productos', {
        p_venta_id: ventaId,
        p_items_retirar: seleccionadosCambio.map(i => ({ venta_item_id: i.venta_item_id, cantidad: i.cantidad })),
        // precio_unitario: el de la vista previa; la BD lo compara con el que cobra y avisa si cambió
        p_items_agregar: itemsAgregar.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: precioAgregado(i) })),
        p_observacion: observacionCambio,
        p_medio_pago: medioCambio,
      })
      if (error) throw error
      await registrarGarantias(garantiasCambio, seleccionadosCambio)
      const r = data as any
      const medio = MEDIO_AJUSTE_LABEL[medioCambio]
      const ajuste = Number(r.ajuste_credito ?? 0)
      const partes = [
        ajuste > 0 ? `Sumado a la deuda: $${ajuste.toLocaleString('es-CO')}` : '',
        ajuste < 0 ? `Descontado de la deuda: $${(-ajuste).toLocaleString('es-CO')}` : '',
        r.cobrar_al_cliente > 0 ? `Cobrar: $${Number(r.cobrar_al_cliente).toLocaleString('es-CO')} (${medio})` : '',
        r.devolver_al_cliente > 0 ? `Devolver: $${Number(r.devolver_al_cliente).toLocaleString('es-CO')} (${medio})` : '',
      ].filter(Boolean)
      toast.success('Cambio registrado', { description: partes.length > 0 ? partes.join('. ') + '.' : 'Sin diferencia de dinero.' })
      router.refresh(); cerrar()
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message })
    } finally {
      setCambiando(false)
    }
  }

  if (!esAdmin) return null

  return (
    <div className="space-y-3 rounded-2xl bg-superficie p-4">
      {!accion && (
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Acciones
        </h2>
      )}

      {accionActiva === 'ninguna' && (
        <div className="space-y-1">
          <div className="rejilla-2 sm:flex sm:flex-wrap sm:items-center">
            {/* Cada acción abre su propia vista; Atrás vuelve a este detalle */}
            <Link href={`/dashboard/ventas/${ventaId}?accion=devolver`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-yellow/40 px-4 text-sm font-semibold text-brand-yellow hover:bg-brand-yellow/10">
              <Undo2 className="h-4 w-4" />Devolver productos
            </Link>
            <Link href={`/dashboard/ventas/${ventaId}?accion=cambiar`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-blue/40 px-4 text-sm font-semibold text-enlace hover:bg-brand-blue/10">
              <Repeat className="h-4 w-4" />Cambiar productos
            </Link>
            {!tieneAjustes && (
              <Link href={`/dashboard/ventas/${ventaId}?accion=anular`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-red/40 px-4 text-sm font-semibold text-sale hover:bg-brand-red/10">
                <Ban className="h-4 w-4" />Anular venta
              </Link>
            )}
          </div>
          {tieneAjustes && (
            <p className="text-xs text-steel-500">
              La venta ya tiene devoluciones o cambios, así que no se puede anular: para deshacerla, devuelve los productos que quedan.
            </p>
          )}
        </div>
      )}

      {accionActiva === 'anular' && (
        <div className="space-y-3 rounded-xl border border-brand-red/30 bg-brand-red/10 p-3">
          <p className="text-sm font-medium text-sale">Confirmar anulación</p>
          {credito && (
            <div className="space-y-0.5 rounded-xl border border-linea bg-superficie-2 p-2 text-xs text-steel-300">
              <div className="flex justify-between gap-2">
                <span>Se cancela la deuda pendiente</span>
                <span className="text-tinta">${credito.saldoPendiente.toLocaleString('es-CO')}</span>
              </div>
              {credito.abonado > 0 && (
                <div className="flex justify-between gap-2">
                  <span>Se devuelve lo abonado (cada abono por el medio con que se pagó)</span>
                  <span className="text-tinta">${credito.abonado.toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-sale">Motivo (obligatorio)</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="border-linea bg-superficie text-tinta placeholder:text-tenue" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleAnular} disabled={anulando} className="h-11 bg-brand-red font-bold text-white hover:bg-brand-red hover:brightness-95">
              {anulando ? 'Anulando…' : 'Confirmar anulación'}
            </Button>
            <Button variant="outline" className="h-11 border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={cerrar}>Cancelar</Button>
          </div>
        </div>
      )}

      {accionActiva === 'devolver' && (
        <div className="space-y-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3">
          <p className="text-sm font-medium text-brand-yellow">Selecciona los productos a devolver</p>
          <div className="space-y-2">
            {itemsDevolucion.map((item, idx) => (
              <div key={item.venta_item_id} className="rounded-xl border border-linea bg-superficie-2 p-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={item.seleccionado}
                    onChange={e => setItemsDevolucion(prev => prev.map((it, i) => i === idx ? { ...it, seleccionado: e.target.checked } : it))}
                    className="h-4 w-4 accent-brand-yellow" />
                  <MiniaturaProducto url={item.imagen_url} nombre={item.nombre} tam="xs" /><span className="flex-1 text-[15px] text-tinta">{item.nombre}</span>
                  {item.es_fraccionado ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-steel-300">Cant ({item.medida_venta}):</span>
                      <Input type="number" step={item.cantidad_minima_venta ?? 0.5}
                        min={item.cantidad_minima_venta ?? 0.5} max={item.cantidad_fraccion_max}
                        value={item.cantidad_fraccion ?? ''}
                        disabled={!item.seleccionado}
                        onChange={e => setItemsDevolucion(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad_fraccion: parseFloat(e.target.value) || 0 } : it))}
                        className="h-7 w-20 border-linea bg-superficie text-xs text-tinta" />
                      <span className="text-xs text-steel-500">/ {item.cantidad_fraccion_max}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-steel-300">Cant:</span>
                      <Input type="number" min={1} max={item.cantidad_max} value={item.cantidad}
                        disabled={!item.seleccionado}
                        onChange={e => setItemsDevolucion(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad: Math.min(parseInt(e.target.value) || 1, it.cantidad_max) } : it))}
                        className="h-7 w-16 border-linea bg-superficie text-xs text-tinta" />
                      <span className="text-xs text-steel-500">/ {item.cantidad_max}</span>
                    </div>
                  )}
                </div>

                {/* Switch garantía */}
                {item.seleccionado && !item.es_fraccionado && (
                  <div className="mt-2 space-y-2 border-t border-linea pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`garantia-dev-${item.venta_item_id}`}
                        checked={garantiasDevolucion[item.venta_item_id]?.esGarantia ?? false}
                        onChange={e => {
                          const checked = e.target.checked
                          const proveedores = item.proveedores_producto ?? []
                          const proveedorAuto = proveedores.length === 1 ? proveedores[0].id : ''
                          void cargarProveedores()
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
                        Enviar a garantía (sale del inventario hasta que el proveedor lo devuelva)
                      </label>
                    </div>
                    {garantiasDevolucion[item.venta_item_id]?.esGarantia && (
                      <div className="space-y-1.5 pl-6">
                        <select
                          value={garantiasDevolucion[item.venta_item_id]?.proveedorId ?? ''}
                          onChange={e => setGarantiasDevolucion(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], proveedorId: e.target.value } }))}
                          className="w-full rounded-lg border border-linea bg-superficie px-2 py-1 text-xs text-tinta"
                        >
                          <option value="">Selecciona proveedor…</option>
                          {proveedoresList.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <input
                          type="text"
                          placeholder="Observación (defecto, motivo…)"
                          value={garantiasDevolucion[item.venta_item_id]?.observacion ?? ''}
                          onChange={e => setGarantiasDevolucion(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], observacion: e.target.value } }))}
                          className="w-full rounded-lg border border-linea bg-superficie px-2 py-1 text-xs text-tinta placeholder:text-tenue"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {seleccionadosDevolucion.length > 0 && (
            <div className="rounded-xl border border-linea bg-superficie-2 p-2 text-sm">
              <div className="flex justify-between font-medium">
                <span className="text-tinta">{credito ? 'Valor devuelto' : 'Monto a devolver'}</span>
                <span className="font-display text-brand-yellow">${montoDevolucion.toLocaleString('es-CO')}</span>
              </div>
              <p className="mt-0.5 text-xs text-steel-500">
                Calculado proporcionalmente según el descuento aplicado en la venta original
              </p>
              {credito && (
                <div className="mt-2 space-y-0.5 border-t border-linea pt-2 text-xs">
                  <div className="flex justify-between gap-2 text-steel-300">
                    <span>Se descuenta de la deuda (${credito.saldoPendiente.toLocaleString('es-CO')})</span>
                    <span className="text-tinta">${devolucionADeuda.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between gap-2 font-medium text-brand-yellow">
                    <span>Se devuelve en dinero</span>
                    <span>${devolucionEnDinero.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}
              {devolucionEnDinero > 0 && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-linea pt-2">
                  <label htmlFor="medio-devolucion" className="text-xs text-steel-300">Devolver por</label>
                  <select id="medio-devolucion" value={medioDevolucion}
                    onChange={e => setMedioDevolucion(e.target.value as MedioAjuste)} className={selectMedioCls}>
                    {MEDIOS_AJUSTE.map(m => <option key={m} value={m}>{MEDIO_AJUSTE_LABEL[m]}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-brand-yellow">Observación (obligatoria)</Label>
            <Textarea value={observacionDev} onChange={e => setObservacionDev(e.target.value)} rows={2} className="border-linea bg-superficie text-tinta placeholder:text-tenue" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleDevolver} disabled={devolviendo} className="h-11 bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
              {devolviendo ? 'Registrando…' : 'Confirmar devolución'}
            </Button>
            <Button variant="outline" className="h-11 border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={cerrar}>Cancelar</Button>
          </div>
        </div>
      )}

      {accionActiva === 'cambiar' && (
        <div className="space-y-3 rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-enlace">
              {paso === 1 ? 'Paso 1 — Selecciona productos a retirar' : 'Paso 2 — Agrega productos nuevos'}
            </p>
            <span className="text-xs text-enlace">{paso}/2</span>
          </div>

          {paso === 1 && (
            <>
              <div className="space-y-2">
                {itemsRetirar.map((item, idx) => (
                  <div key={item.venta_item_id} className="rounded-xl border border-linea bg-superficie-2 p-2">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={item.seleccionado}
                        onChange={e => setItemsRetirar(prev => prev.map((it, i) => i === idx ? { ...it, seleccionado: e.target.checked } : it))}
                        className="h-4 w-4 accent-brand-blue" />
                      <MiniaturaProducto url={item.imagen_url} nombre={item.nombre} tam="xs" /><span className="flex-1 text-[15px] text-tinta">{item.nombre}</span>
                      <div className="flex items-center gap-1">
                        <Input type="number" min={1} max={item.cantidad_max} value={item.cantidad}
                          disabled={!item.seleccionado}
                          onChange={e => setItemsRetirar(prev => prev.map((it, i) =>
                            i === idx ? { ...it, cantidad: Math.min(parseInt(e.target.value) || 1, it.cantidad_max) } : it))}
                          className="h-7 w-16 border-linea bg-superficie text-xs text-tinta" />
                        <span className="text-xs text-steel-500">/ {item.cantidad_max}</span>
                      </div>
                    </div>

                    {/* Switch garantía en cambio */}
                    {item.seleccionado && (
                      <div className="mt-2 space-y-2 border-t border-linea pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`garantia-cambio-${item.venta_item_id}`}
                            checked={garantiasCambio[item.venta_item_id]?.esGarantia ?? false}
                            onChange={e => {
                              const checked = e.target.checked
                              const proveedores = item.proveedores_producto ?? []
                              const proveedorAuto = proveedores.length === 1 ? proveedores[0].id : ''
                              void cargarProveedores()
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
                          <label htmlFor={`garantia-cambio-${item.venta_item_id}`} className="text-xs font-medium text-enlace">
                            Producto defectuoso — enviar a garantía
                          </label>
                        </div>
                        {garantiasCambio[item.venta_item_id]?.esGarantia && (
                          <div className="space-y-1.5 pl-6">
                            <select
                              value={garantiasCambio[item.venta_item_id]?.proveedorId ?? ''}
                              onChange={e => setGarantiasCambio(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], proveedorId: e.target.value } }))}
                              className="w-full rounded-lg border border-linea bg-superficie px-2 py-1 text-xs text-tinta"
                            >
                              <option value="">Selecciona proveedor…</option>
                              {proveedoresList.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                            <input
                              type="text"
                              placeholder="Observación (defecto, motivo…)"
                              value={garantiasCambio[item.venta_item_id]?.observacion ?? ''}
                              onChange={e => setGarantiasCambio(prev => ({ ...prev, [item.venta_item_id]: { ...prev[item.venta_item_id], observacion: e.target.value } }))}
                              className="w-full rounded-lg border border-linea bg-superficie px-2 py-1 text-xs text-tinta placeholder:text-tenue"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => { if (seleccionadosCambio.length === 0) { toast.error('Selecciona al menos un producto'); return } setPaso(2) }} className="h-11 bg-brand-blue font-bold text-white hover:brightness-110">
                  Siguiente →
                </Button>
                <Button variant="outline" className="h-11 border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={cerrar}>Cancelar</Button>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="space-y-0.5 rounded-xl border border-linea bg-superficie-2 p-2 text-xs text-steel-300">
                <p className="mb-1 font-medium text-tinta">Retirando:</p>
                {seleccionadosCambio.map(i => (
                  <div key={i.venta_item_id} className="flex items-center gap-2 py-0.5">
                    <MiniaturaProducto url={i.imagen_url} nombre={i.nombre} tam="xs" />
                    <span>{i.nombre} × {i.cantidad}</span>
                  </div>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
                <Input value={queryProducto}
                  onChange={async e => { setQueryProducto(e.target.value); await buscarProductos(e.target.value) }}
                  placeholder="Buscar producto a agregar…" className="border-linea bg-superficie-2 pl-9 text-tinta placeholder:text-tenue" />
                {resultadosProducto.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-linea bg-superficie shadow-xl">
                    {resultadosProducto.map((p: any) => (
                      <button key={p.id} type="button"
                        className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-velo/5"
                        onClick={() => agregarProductoCambio(p)}>
                        <MiniaturaProducto url={p.imagen_url} nombre={p.nombre} tam="xs" />
                        <span className="flex-1 text-tinta">{p.nombre}</span>
                        <span className="text-xs text-steel-300">${p.precio_venta?.toLocaleString('es-CO')} · Stock: {p.stock_almacen}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {itemsAgregar.length > 0 && (
                <div className="space-y-1">
                  {itemsAgregar.map((item, idx) => (
                    <div key={item.key} className="space-y-1 rounded-xl border border-linea bg-superficie-2 p-2">
                      <div className="flex items-center gap-2">
                        <MiniaturaProducto url={item.imagen_url} nombre={item.nombre} tam="xs" /><span className="flex-1 text-[15px] text-tinta">{item.nombre}</span>
                        <Input type="number" min={1} max={item.stock_almacen} value={item.cantidad}
                          onChange={e => setItemsAgregar(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: parseInt(e.target.value) || 1 } : it))}
                          className="h-7 w-16 border-linea bg-superficie text-xs text-tinta" />
                        <span className="text-xs text-steel-300">${(precioAgregado(item) * item.cantidad).toLocaleString('es-CO')}</span>
                        <button type="button" onClick={() => setItemsAgregar(prev => prev.filter((_, i) => i !== idx))} className="text-steel-300 hover:text-sale">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <AvisoPrecioCantidad tramos={item.tramos} precioVenta={item.precio_venta} soloNormal={conDescuentoGlobal}
                        cantidad={cantidadAgregada(item.producto_id)} />
                    </div>
                  ))}
                </div>
              )}

              {itemsAgregar.length > 0 && (
                <div className="rounded-xl border border-linea bg-superficie-2 p-2 text-sm">
                  <div className="flex justify-between"><span className="text-steel-300">Total actual de la venta</span><span className="text-tinta">${ventaTotal.toLocaleString('es-CO')}</span></div>
                  <div className="flex justify-between"><span className="text-steel-300">Total con el cambio</span><span className="text-tinta">${totalTrasCambio.toLocaleString('es-CO')}</span></div>
                  {deudaCambio !== 0 && (
                    <div className="mt-1 flex justify-between border-t border-linea pt-1 font-bold text-brand-yellow">
                      <span>{deudaCambio > 0 ? 'Se suma a la deuda' : 'Se descuenta de la deuda'}</span>
                      <span>${Math.abs(deudaCambio).toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {(deudaCambio === 0 || cajaCambio !== 0) && (
                    <div className={`mt-1 flex justify-between border-t border-linea pt-1 font-bold ${cajaCambio > 0 ? 'text-emerald-400' : cajaCambio < 0 ? 'text-brand-yellow' : 'text-steel-300'}`}>
                      <span>{cajaCambio > 0 ? 'Cobrar al cliente' : cajaCambio < 0 ? 'Devolver al cliente' : 'Sin diferencia'}</span>
                      <span>${Math.abs(cajaCambio).toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {cajaCambio !== 0 && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <label htmlFor="medio-cambio" className="text-xs text-steel-300">{cajaCambio > 0 ? 'Cobrar por' : 'Devolver por'}</label>
                      <select id="medio-cambio" value={medioCambio}
                        onChange={e => setMedioCambio(e.target.value as MedioAjuste)} className={selectMedioCls}>
                        {MEDIOS_AJUSTE.map(m => <option key={m} value={m}>{MEDIO_AJUSTE_LABEL[m]}</option>)}
                      </select>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-steel-500">
                    Lo retirado se toma con el descuento con que se vendió y los productos nuevos entran a precio de venta
                    {descuentoGlobalPorcentaje > 0 ? ` con el descuento global de la venta (${descuentoGlobalPorcentaje} %)` : ''}.
                    Un total editado a mano conserva su descuento.
                    {credito ? ' En una venta a crédito, la diferencia ajusta primero la deuda.' : ''}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-enlace">Observación (obligatoria)</Label>
                <Textarea value={observacionCambio} onChange={e => setObservacionCambio(e.target.value)} rows={2} className="border-linea bg-superficie text-tinta placeholder:text-tenue" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => setPaso(1)}>← Atrás</Button>
                <Button onClick={handleCambiar} disabled={cambiando} className="h-11 bg-brand-blue font-bold text-white hover:brightness-110">
                  {cambiando ? 'Registrando…' : 'Confirmar cambio'}
                </Button>
                <Button variant="outline" className="h-11 border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={cerrar}>Cancelar</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}