'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularIvaUnitario } from '@/lib/precio-utils'
import { precioConCantidad, type TramoPrecio } from '@/lib/precios-cantidad'
import { AvisoPrecioCantidad } from './precios-cantidad'
import { toast } from '@/lib/avisos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Search, Plus, Minus, Trash2, AlertTriangle, ArrowRightLeft, MapPin, Package, Wrench, Check, ChevronDown, ChevronLeft,
  ChevronRight, Percent, PackagePlus, ShoppingBasket, UserRound,
} from 'lucide-react'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'
import { AyudaPesoVenta } from './peso-por-unidad'
import { useNavegacion } from '@/lib/navegacion'

type MetodoPago = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta'

interface ClienteSearch {
  id: string
  nombre: string
  telefono: string | null
  nit_cc: string | null
  email: string | null
  es_cliente_generico: boolean
}

interface ProductoSearch {
  id: string
  nombre: string
  codigo: string | null
  precio_venta: number
  stock_almacen: number
  stock_bodega: number
  ubicacion: string | null
  vender_por_fraccion: boolean
  medida_venta: string | null
  cantidad_total_unidad: number | null
  cantidad_minima_venta: number | null
  precio_por_unidad_medida: number | null
  remanente_fraccion: number
  tiene_iva: boolean
  iva_incluido: boolean
  porcentaje_iva: number
  imagen_url: string | null
  /** Peso de una unidad en gramos, si el producto se cuenta por peso */
  peso_unitario_g?: number | null
  /** Precios por cantidad (buscar_productos), de menor a mayor cantidad mínima */
  precios_cantidad?: TramoPrecio[] | null
}

interface ServicioSearch {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
}

interface ItemCarrito {
  key: string
  producto_id: string
  nombre: string
  precio_unitario: number
  iva_unitario: number
  cantidad: number
  stock_almacen: number
  stock_bodega: number
  ubicacion: string | null
  descuento_habilitado: boolean
  descuento_porcentaje: number
  es_fraccionado: boolean
  cantidad_fraccion: number
  medida_venta: string | null
  cantidad_minima_venta: number | null
  remanente_fraccion: number
  cantidad_total_unidad: number | null
  imagen_url: string | null
  /** Peso de una unidad en gramos: la venta muestra cuánto pesar (solo en unidades completas) */
  peso_unitario_g: number | null
  /** Precio normal por unidad; precio_unitario es este o el del tramo de precio por cantidad que aplique */
  precio_base: number
  /** IVA del producto en % (0 si no tiene), para el IVA contenido en el precio que se cobre */
  porcentaje_iva: number
  /** Precios por cantidad del producto (vacío si no tiene o es una fracción) */
  tramos: TramoPrecio[]
  /** Cantidad mínima del tramo que aplica (null: precio normal). Esa línea no admite descuento */
  tramo_desde: number | null
}

interface ServicioCarrito {
  key: string
  servicio_id: string | null
  nombre_servicio: string
  precio_aplicado: number
  descuento_habilitado: boolean
  descuento_porcentaje: number
}

interface PagoItem {
  metodo: MetodoPago
  monto: number
  monto_recibido: number
  vueltas: number
}

interface AlertaStockInfo {
  productoId: string
  productoNombre: string
  stockAlmacen: number
  stockBodega: number
  cantidadNecesaria: number
}

interface NuevaVentaFormProps {
  clienteGeneral: ClienteSearch
  catalogo: ServicioSearch[]
  maxDescuentoPct?: number
  whatsappNegocio?: string | null
}

const METODOS: MetodoPago[] = ['efectivo', 'nequi', 'daviplata', 'tarjeta']
const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
}

// IVA informativo por unidad: el contenido en el precio de venta, que ya trae el IVA
// (iva_incluido se refiere al costo, no al precio). Debe coincidir con registrar_venta.
function calcularIva(p: Pick<ProductoSearch, 'tiene_iva' | 'porcentaje_iva' | 'precio_venta'>): number {
  if (!p.tiene_iva) return 0
  return calcularIvaUnitario(p.precio_venta, p.porcentaje_iva)
}

// Redondea hacia arriba a la centena, como las RPC de venta. Primero lleva el valor a centavos para que un
// error de coma flotante (35700.000000001) no sume $100 al total.
function redondear100(valor: number): number {
  const centavos = Math.round(valor * 100) / 100
  if (centavos % 100 === 0) return centavos
  return Math.ceil(centavos / 100) * 100
}

// Cambia la cantidad de una línea por unidades y le pone su precio: el del tramo de precio por cantidad que alcance o el
// normal, con el IVA contenido en ese precio. Una línea con precio por cantidad no lleva descuento. Es la misma regla de
// registrar_venta y registrar_venta_credito (src/lib/precios-cantidad.ts).
function conCantidad(item: ItemCarrito, cantidad: number): ItemCarrito {
  if (item.es_fraccionado) return { ...item, cantidad }
  const { precio, tramo } = precioConCantidad(item.precio_base, item.tramos, cantidad)
  return {
    ...item,
    cantidad,
    precio_unitario: precio,
    iva_unitario: item.porcentaje_iva > 0 ? calcularIvaUnitario(precio, item.porcentaje_iva) : 0,
    tramo_desde: tramo ? tramo.cantidad_minima : null,
    ...(tramo ? { descuento_habilitado: false, descuento_porcentaje: 0 } : {}),
  }
}

// Si cantidad es múltiplo de minimo, tolerando el error de coma flotante (0.3 / 0.1 da 2.9999999999999996)
function esMultiplo(cantidad: number, minimo: number): boolean {
  const veces = Math.round(cantidad / minimo)
  return Math.abs(veces * minimo - cantidad) < 1e-6
}

export function NuevaVentaForm({ clienteGeneral, catalogo, maxDescuentoPct = 0.10, whatsappNegocio }: NuevaVentaFormProps) {
  const { volver, reemplazar } = useNavegacion()
  const supabase = createClient()

  // ── Cliente ──
  const [cliente, setCliente] = useState<ClienteSearch>(clienteGeneral)
  const [queryCliente, setQueryCliente] = useState('')
  const [resultadosCliente, setResultadosCliente] = useState<ClienteSearch[]>([])
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', nit_cc: '', email: '' })
  const [guardandoCliente, setGuardandoCliente] = useState(false)

  // ── Carrito ──
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  // Pantalla: armar la venta o cobrar; paneles que se abren a pedido
  const [paso, setPaso] = useState<'venta' | 'cobro'>('venta')
  const [mostrarCliente, setMostrarCliente] = useState(false)
  const [mostrarServicios, setMostrarServicios] = useState(false)
  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProducto, setResultadosProducto] = useState<ProductoSearch[]>([])
  const [mostrarAltaRapida, setMostrarAltaRapida] = useState(false)
  const [altaRapida, setAltaRapida] = useState({ nombre: '', precio: 0, margen: 30 })
  const [guardandoAltaRapida, setGuardandoAltaRapida] = useState(false)
  const [alertaStock, setAlertaStock] = useState<AlertaStockInfo | null>(null)
  const [transfiriendo, setTransfiriendo] = useState(false)
  const [cantidadTransferir, setCantidadTransferir] = useState(1)

  // ── Servicios ──
  const [serviciosCarrito, setServiciosCarrito] = useState<ServicioCarrito[]>([])
  const [mostrarNuevoServicio, setMostrarNuevoServicio] = useState(false)
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', descripcion: '', precio: 0 })
  const [guardandoServicio, setGuardandoServicio] = useState(false)

  // ── Descuentos ──
  const [descuentoHabilitado, setDescuentoHabilitado] = useState(false)
  const [descuentoTotalActivo, setDescuentoTotalActivo] = useState(false)
  const [descuentoTotalPct, setDescuentoTotalPct] = useState(5)
  const [editandoTotalManual, setEditandoTotalManual] = useState(false)
  const [totalManual, setTotalManual] = useState('')

  // ── Crédito ──
  const [esCredito, setEsCredito] = useState(false)
  const [fechaPagoCredito, setFechaPagoCredito] = useState('')

  // ── Pago ──
  const [esMixto, setEsMixto] = useState(false)
  const [metodoPagoUnico, setMetodoPagoUnico] = useState<MetodoPago>('efectivo')
  const [pagos, setPagos] = useState<PagoItem[]>([
    { metodo: 'efectivo', monto: 0, monto_recibido: 0, vueltas: 0 },
  ])

  // ── Otros ──
  const [facturaElectronica, setFacturaElectronica] = useState(false)
  const [emailFactura, setEmailFactura] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<'con_recibo' | 'sin_recibo'>('sin_recibo')

  // ─── Cálculos ────────────────────────────────────────────────────────────

  const descuentosPorProducto = useMemo(() =>
    carrito.reduce((sum, item) => {
      if (item.es_fraccionado || !item.descuento_habilitado) return sum
      return sum + item.precio_unitario * item.cantidad * (item.descuento_porcentaje / 100)
    }, 0), [carrito])

  const descuentosPorServicio = useMemo(() =>
    serviciosCarrito.reduce((sum, s) => {
      if (!s.descuento_habilitado) return sum
      return sum + s.precio_aplicado * (s.descuento_porcentaje / 100)
    }, 0), [serviciosCarrito])

  const subtotalProductosBruto = useMemo(() =>
    carrito.reduce((sum, item) => {
      if (item.es_fraccionado) return sum + item.precio_unitario * item.cantidad_fraccion
      return sum + item.precio_unitario * item.cantidad
    }, 0), [carrito])

  const subtotalServicios = useMemo(() =>
    serviciosCarrito.reduce((sum, s) => sum + s.precio_aplicado, 0), [serviciosCarrito])

  const subtotalTotal = useMemo(() =>
    subtotalProductosBruto - descuentosPorProducto + subtotalServicios - descuentosPorServicio,
    [subtotalProductosBruto, descuentosPorProducto, subtotalServicios, descuentosPorServicio])

  // Una venta con precio por cantidad no admite descuento global ni total editado (la BD también lo exige): mientras
  // haya una línea así, esas dos opciones quedan apagadas
  const hayPrecioCantidad = carrito.some(i => !i.es_fraccionado && i.tramo_desde != null)
  const descuentoTotalVigente = descuentoTotalActivo && !hayPrecioCantidad
  const totalManualVigente = editandoTotalManual && !hayPrecioCantidad

  const descuentoTotalMonto = useMemo(() => {
    if (!descuentoHabilitado || !descuentoTotalVigente) return 0
    return subtotalTotal * descuentoTotalPct / 100
  }, [descuentoHabilitado, descuentoTotalVigente, subtotalTotal, descuentoTotalPct])

  const totalAntesRedondeo = useMemo(() => {
    if (totalManualVigente && totalManual !== '') return parseFloat(totalManual) || 0
    return subtotalTotal - descuentoTotalMonto
  }, [subtotalTotal, descuentoTotalMonto, totalManualVigente, totalManual])

  const totalRedondeado = useMemo(() => redondear100(totalAntesRedondeo), [totalAntesRedondeo])

  // Total de la venta sin el ajuste manual: el total editado a mano no puede superarlo (la BD también lo valida)
  const totalCalculado = useMemo(() => redondear100(subtotalTotal - descuentoTotalMonto), [subtotalTotal, descuentoTotalMonto])

  const ivaInformativo = useMemo(() =>
    carrito.reduce((sum, item) => sum + item.iva_unitario * (item.es_fraccionado ? item.cantidad_fraccion : item.cantidad), 0),
    [carrito])

  const valorBruto = subtotalProductosBruto + subtotalServicios
  const descuentoAcumuladoPct = valorBruto > 0 ? (valorBruto - totalAntesRedondeo) / valorBruto : 0
  const minPagoPermitido = redondear100(valorBruto * (1 - maxDescuentoPct))
  const sumaPagos = useMemo(() => pagos.reduce((sum, p) => sum + p.monto, 0), [pagos])
  const diferenciaPago = useMemo(() => totalRedondeado - sumaPagos, [totalRedondeado, sumaPagos])
  const pagoEfectivo = pagos.find(p => p.metodo === 'efectivo')
  const hayEfectivo = !!pagoEfectivo && !esCredito

  // ─── Búsquedas ───────────────────────────────────────────────────────────

  const buscarClientes = useCallback(async (q: string) => {
    if (!q.trim()) { setResultadosCliente([]); return }
    const { data } = await supabase.rpc('buscar_clientes', { p_query: q.trim() })
    setResultadosCliente((data as any) ?? [])
  }, [supabase])

  const buscarProductos = useCallback(async (q: string) => {
    if (!q.trim()) { setResultadosProducto([]); return }
    const { data } = await supabase.rpc('buscar_productos', { p_query: q.trim() })
    setResultadosProducto((data as any) ?? [])
  }, [supabase])

  // ─── Acciones ────────────────────────────────────────────────────────────

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (nuevoCliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCliente.email)) {
      toast.error('El email no es válido'); return
    }
    setGuardandoCliente(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nombre: nuevoCliente.nombre, telefono: nuevoCliente.telefono || null, nit_cc: nuevoCliente.nit_cc || null, email: nuevoCliente.email || null, activo: true, es_cliente_generico: false })
      .single()
    setGuardandoCliente(false)
    if (error) { toast.error('No se pudo completar la acción', { description: error.message }); return }
    setCliente(data)
    if (facturaElectronica && (data as any)?.email) setEmailFactura((data as any).email)
    setMostrarNuevoCliente(false)
    setNuevoCliente({ nombre: '', telefono: '', nit_cc: '', email: '' })
    toast.success('Cliente creado')
  }

  const agregarProducto = (p: ProductoSearch, modo: 'completo' | 'fraccion' = 'completo') => {
    setResultadosProducto([])
    setQueryProducto('')

    if (modo === 'completo') {
      const idx = carrito.findIndex(i => i.producto_id === p.id && !i.es_fraccionado)
      if (idx >= 0) {
        const item = carrito[idx]
        const nuevaCantidad = item.cantidad + 1
        if (nuevaCantidad > p.stock_almacen) {
          if (p.stock_bodega > 0) {
            setAlertaStock({ productoId: p.id, productoNombre: p.nombre, stockAlmacen: p.stock_almacen, stockBodega: p.stock_bodega, cantidadNecesaria: nuevaCantidad - p.stock_almacen })
            setCantidadTransferir(Math.min(nuevaCantidad - p.stock_almacen, p.stock_bodega))
          } else {
            toast.error(`No hay stock suficiente para ${p.nombre}`)
          }
          return
        }
        setCarrito(prev => prev.map((it, i) => i === idx ? conCantidad(it, nuevaCantidad) : it))
        return
      }

      if (p.stock_almacen <= 0) {
        if (p.stock_bodega > 0) {
          setAlertaStock({ productoId: p.id, productoNombre: p.nombre, stockAlmacen: 0, stockBodega: p.stock_bodega, cantidadNecesaria: 1 })
          setCantidadTransferir(1)
        } else {
          toast.error(`${p.nombre} está agotado`)
        }
        return
      }

      const iva = calcularIva(p)
      setCarrito(prev => [...prev, {
        key: `${p.id}-completo-${Date.now()}`,
        producto_id: p.id, nombre: p.nombre,
        precio_unitario: p.precio_venta, iva_unitario: iva,
        cantidad: 1, stock_almacen: p.stock_almacen, stock_bodega: p.stock_bodega, ubicacion: p.ubicacion,
        descuento_habilitado: false, descuento_porcentaje: 0,
        es_fraccionado: false, cantidad_fraccion: 0,
        medida_venta: null, cantidad_minima_venta: null,
        remanente_fraccion: p.remanente_fraccion, cantidad_total_unidad: p.cantidad_total_unidad,
        imagen_url: p.imagen_url, peso_unitario_g: p.peso_unitario_g ?? null,
        precio_base: p.precio_venta, porcentaje_iva: p.tiene_iva ? p.porcentaje_iva : 0,
        tramos: p.precios_cantidad ?? [], tramo_desde: null,
      }])
      return
    }

    if (p.stock_almacen <= 0 && p.remanente_fraccion <= 0) {
      toast.error(`No hay stock ni remanente disponible para ${p.nombre}`)
      return
    }

    setCarrito(prev => [...prev, {
      key: `${p.id}-fraccion-${Date.now()}`,
      producto_id: p.id, nombre: `${p.nombre} (fracción)`,
      // IVA contenido en el precio de cada metro o kilo
      precio_unitario: p.precio_por_unidad_medida ?? 0,
      iva_unitario: p.tiene_iva ? calcularIvaUnitario(p.precio_por_unidad_medida ?? 0, p.porcentaje_iva) : 0,
      cantidad: 1, stock_almacen: p.stock_almacen, stock_bodega: p.stock_bodega, ubicacion: p.ubicacion,
      descuento_habilitado: false, descuento_porcentaje: 0,
      es_fraccionado: true, cantidad_fraccion: p.cantidad_minima_venta ?? 1,
      medida_venta: p.medida_venta, cantidad_minima_venta: p.cantidad_minima_venta,
      remanente_fraccion: p.remanente_fraccion, cantidad_total_unidad: p.cantidad_total_unidad,
      imagen_url: p.imagen_url, peso_unitario_g: null,
      precio_base: p.precio_por_unidad_medida ?? 0, porcentaje_iva: 0, tramos: [], tramo_desde: null,
    }])
  }

  // Cantidad de una línea por unidades: si pasa del stock del almacén, ofrece traer de bodega o avisa el máximo
  const cambiarCantidad = (idx: number, item: ItemCarrito, val: number) => {
    if (val > item.stock_almacen) {
      if (item.stock_bodega > 0) {
        setAlertaStock({ productoId: item.producto_id, productoNombre: item.nombre, stockAlmacen: item.stock_almacen, stockBodega: item.stock_bodega, cantidadNecesaria: val - item.stock_almacen })
        setCantidadTransferir(Math.min(val - item.stock_almacen, item.stock_bodega))
      } else {
        toast.error(`Máximo disponible en almacén: ${item.stock_almacen}`)
      }
      return
    }
    setCarrito(prev => prev.map((it, i) => i === idx ? conCantidad(it, val) : it))
  }

  const handleTransferirStock = async () => {
    if (!alertaStock) return
    if (cantidadTransferir <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }
    if (cantidadTransferir > alertaStock.stockBodega) { toast.error(`Solo hay ${alertaStock.stockBodega} unidades en bodega`); return }
    setTransfiriendo(true)
    try {
      const { error } = await supabase.rpc('mover_stock_bodega_almacen', { p_producto_id: alertaStock.productoId, p_cantidad: cantidadTransferir })
      if (error) throw error
      toast.success(`${cantidadTransferir} unidad(es) transferidas a Almacén`)
      setCarrito(prev => prev.map(it => it.producto_id === alertaStock.productoId
        ? { ...it, stock_almacen: it.stock_almacen + cantidadTransferir, stock_bodega: it.stock_bodega - cantidadTransferir }
        : it))
      setAlertaStock(null)
    } catch (err: any) {
      toast.error('No se pudo transferir', { description: err.message })
    } finally {
      setTransfiriendo(false)
    }
  }

  const guardarAltaRapida = async () => {
    if (!altaRapida.nombre.trim() || altaRapida.precio <= 0) { toast.error('Nombre y precio son obligatorios'); return }
    setGuardandoAltaRapida(true)
    const costo = altaRapida.precio * (1 - altaRapida.margen / 100) / 1.19
    const { data, error } = await supabase.from('productos').insert({
      nombre: altaRapida.nombre, precio_venta: altaRapida.precio, precio_costo_base: Math.round(costo),
      stock_actual: 0, stock_bodega: 0, stock_almacen: 0, stock_minimo: 0,
      prioridad: 3, tiene_iva: true, iva_incluido: false, porcentaje_iva: 19,
      activo: true, vender_por_fraccion: false, remanente_fraccion: 0,
      // Queda en Inventario › Por completar hasta que tenga categoría, familia y proveedor con costo
      por_completar: true,
    }).select('id, nombre, precio_venta, tiene_iva, iva_incluido, porcentaje_iva').single()
    setGuardandoAltaRapida(false)
    if (error) { toast.error('No se pudo completar la acción', { description: error.message }); return }
    const iva = calcularIva(data)
    setCarrito(prev => [...prev, {
      key: `${data.id}-${Date.now()}`, producto_id: data.id, nombre: data.nombre,
      precio_unitario: data.precio_venta, iva_unitario: iva,
      cantidad: 1, stock_almacen: 0, stock_bodega: 0, ubicacion: null,
      descuento_habilitado: false, descuento_porcentaje: 0,
      es_fraccionado: false, cantidad_fraccion: 0,
      medida_venta: null, cantidad_minima_venta: null, remanente_fraccion: 0, cantidad_total_unidad: null,
      imagen_url: null, peso_unitario_g: null,
      precio_base: data.precio_venta, porcentaje_iva: data.tiene_iva ? data.porcentaje_iva : 0, tramos: [], tramo_desde: null,
    }])
    setMostrarAltaRapida(false)
    setAltaRapida({ nombre: '', precio: 0, margen: 30 })
    toast.success('Producto creado y agregado al carrito. Queda en Inventario › Por completar.')
  }

  const agregarServicio = (s: ServicioSearch) => {
    setServiciosCarrito(prev => [...prev, {
      key: `${s.id}-${Date.now()}`, servicio_id: s.id, nombre_servicio: s.nombre,
      precio_aplicado: s.precio, descuento_habilitado: false, descuento_porcentaje: 0,
    }])
  }

  const guardarNuevoServicio = async () => {
    if (!nuevoServicio.nombre.trim() || nuevoServicio.precio <= 0) { toast.error('Nombre y precio son obligatorios'); return }
    setGuardandoServicio(true)
    const { data, error } = await supabase.from('servicios')
      .insert({ nombre: nuevoServicio.nombre, descripcion: nuevoServicio.descripcion || null, precio: nuevoServicio.precio, activo: true })
      .select('id, nombre, descripcion, precio').single()
    setGuardandoServicio(false)
    if (error) { toast.error('No se pudo completar la acción', { description: error.message }); return }
    agregarServicio(data)
    setMostrarNuevoServicio(false)
    setNuevoServicio({ nombre: '', descripcion: '', precio: 0 })
    toast.success('Servicio creado y agregado')
  }

  const validarDescuento = (pct: number) => Math.min(Math.max(0, pct), 10)

  const toggleMetodoPago = (m: MetodoPago) => {
    setPagos(prev => {
      const existe = prev.find(p => p.metodo === m)
      if (existe) { if (prev.length === 1) return prev; return prev.filter(p => p.metodo !== m) }
      return [...prev, { metodo: m, monto: 0, monto_recibido: 0, vueltas: 0 }]
    })
  }

  const actualizarPago = (m: MetodoPago, campo: keyof PagoItem, valor: number) => {
    setPagos(prev => prev.map(p => {
      if (p.metodo !== m) return p
      const actualizado = { ...p, [campo]: valor }
      if (campo === 'monto_recibido' || campo === 'monto') actualizado.vueltas = Math.max(0, actualizado.monto_recibido - actualizado.monto)
      return actualizado
    }))
  }

  // ─── Validación y submit ──────────────────────────────────────────────────

  const validate = (): string | null => {
    if (carrito.length === 0 && serviciosCarrito.length === 0) return 'Agrega al menos un producto o servicio'
    if (esCredito && cliente.es_cliente_generico) return 'Las ventas a crédito requieren seleccionar un cliente específico'
    for (const item of carrito) {
      if (item.es_fraccionado && item.cantidad_minima_venta && !esMultiplo(item.cantidad_fraccion, item.cantidad_minima_venta)) {
        return `La cantidad de "${item.nombre}" debe ser múltiplo de ${item.cantidad_minima_venta} ${item.medida_venta}`
      }
    }
    if (totalManualVigente && totalManual !== '') {
      if (totalRedondeado <= 0) return 'El total debe ser mayor que cero'
      if (totalRedondeado > totalCalculado) {
        return `El total editado no puede ser mayor que el total de la venta ($${totalCalculado.toLocaleString('es-CO')})`
      }
    }
    if (descuentoAcumuladoPct > maxDescuentoPct + 0.001) {
      return `Descuento acumulado (${(descuentoAcumuladoPct * 100).toFixed(1)}%) supera el máximo permitido (${(maxDescuentoPct * 100).toFixed(0)}%). Mínimo a pagar: $${minPagoPermitido.toLocaleString('es-CO')}`
    }
    // Una venta a crédito no se paga ahora: no hay pagos que validar
    if (esCredito) return null
    if (esMixto && Math.abs(diferenciaPago) > 1) {
      return `La suma de pagos ($${sumaPagos.toLocaleString('es-CO')}) no coincide con el total ($${totalRedondeado.toLocaleString('es-CO')})`
    }
    if (hayEfectivo) {
      const recibido = esMixto ? (pagoEfectivo?.monto_recibido ?? 0) : (pagos[0]?.monto_recibido ?? 0)
      const monto = esMixto ? (pagoEfectivo?.monto ?? 0) : totalRedondeado
      if (recibido <= 0) return 'El monto recibido en efectivo es obligatorio'
      if (recibido < monto) return 'El monto recibido no puede ser menor al monto a pagar en efectivo'
    }
    return null
  }

  const handleSubmit = async (action: 'con_recibo' | 'sin_recibo') => {
    const error = validate()
    if (error) { toast.error(error); return }
    setSubmitting(true)
    setSubmitAction(action)
    try {
      const items = carrito.map(item => ({
        producto_id: item.producto_id,
        es_fraccionado: item.es_fraccionado,
        cantidad: item.es_fraccionado ? 1 : item.cantidad,
        cantidad_fraccion: item.es_fraccionado ? item.cantidad_fraccion : null,
        descuento_habilitado: item.descuento_habilitado,
        descuento_porcentaje: item.descuento_porcentaje,
        // El precio que se ve en pantalla: la BD lo compara con el que cobra y avisa si cambió
        ...(item.es_fraccionado ? {} : { precio_unitario: item.precio_unitario }),
      }))

      const serviciosPayload = serviciosCarrito.map(s => ({
        servicio_id: s.servicio_id,
        nombre_servicio: s.nombre_servicio,
        precio_aplicado: s.descuento_habilitado ? s.precio_aplicado * (1 - s.descuento_porcentaje / 100) : s.precio_aplicado,
      }))

      let descuentoTipo: string | null = null
      if (descuentoHabilitado) {
        if (totalManualVigente && totalManual !== '') descuentoTipo = 'manual'
        else if (descuentoTotalVigente) descuentoTipo = 'total'
        else descuentoTipo = 'por_producto'
      }
      // Con el total editado a mano, la BD lo usa como total de la venta (y de la deuda, si es a crédito)
      const totalManualPayload = descuentoTipo === 'manual' ? totalRedondeado : undefined

      // ── Venta a crédito ──
      if (esCredito) {
        const { data, error: rpcError } = await supabase.rpc('registrar_venta_credito', {
          p_cliente_id: cliente.id,
          p_items: items,
          p_servicios: serviciosPayload.length > 0 ? serviciosPayload : null,
          p_descuento_habilitado: descuentoHabilitado,
          p_descuento_tipo: descuentoTipo || undefined,
          p_descuento_total_porcentaje: descuentoHabilitado && descuentoTotalVigente ? descuentoTotalPct : 0,
          p_fecha_pago_programada: fechaPagoCredito || undefined,
          p_observaciones: observaciones || undefined,
          p_factura_electronica: facturaElectronica,
          p_total_manual: totalManualPayload,
        })
        if (rpcError) throw rpcError
        toast.success('Venta a crédito registrada')
        if (action === 'con_recibo') reemplazar(`/dashboard/ventas/${data}?recibo=1`)
        else volver('/dashboard/ventas', { refrescar: true })
        return
      }

      // ── Venta normal ──
      let pagosPayload: any[]
      if (esMixto) {
        pagosPayload = pagos.map(p => ({
          metodo: p.metodo, monto: p.monto,
          monto_recibido: p.metodo === 'efectivo' ? p.monto_recibido : null,
          vueltas: p.metodo === 'efectivo' ? p.vueltas : null,
        }))
      } else {
        pagosPayload = [{
          metodo: metodoPagoUnico, monto: totalRedondeado,
          monto_recibido: metodoPagoUnico === 'efectivo' ? (pagos[0]?.monto_recibido ?? 0) : null,
          vueltas: metodoPagoUnico === 'efectivo' ? (pagos[0]?.vueltas ?? 0) : null,
        }]
      }

      const { data, error: rpcError } = await supabase.rpc('registrar_venta', {
        p_cliente_id: cliente.id,
        p_tipo_pago: esMixto ? 'mixto' : metodoPagoUnico,
        p_items: items,
        p_pagos: pagosPayload,
        p_descuento_habilitado: descuentoHabilitado,
        p_descuento_tipo: descuentoTipo || undefined,
        p_descuento_total_porcentaje: descuentoHabilitado && descuentoTotalVigente ? descuentoTotalPct : 0,
        p_factura_electronica: facturaElectronica,
        p_observaciones: observaciones || undefined,
        p_servicios: serviciosPayload.length > 0 ? serviciosPayload : null,
        p_total_manual: totalManualPayload,
      })

      if (rpcError) throw rpcError
      toast.success('Venta registrada')

      // WhatsApp automático si factura electrónica está activa
      if (facturaElectronica && whatsappNegocio) {
        const numero = whatsappNegocio.replace(/\D/g, '')
        const lineas = carrito.map(i =>
          i.es_fraccionado
            ? `• ${i.nombre} × ${i.cantidad_fraccion} = $${(i.precio_unitario * i.cantidad_fraccion).toLocaleString('es-CO')}`
            : `• ${i.nombre} × ${i.cantidad} = $${(i.precio_unitario * i.cantidad).toLocaleString('es-CO')}`
        )
        const texto = [
          `🧾 *Factura Electrónica*`,
          `Cliente: ${cliente.nombre}`,
          cliente.nit_cc ? `CC/NIT: ${cliente.nit_cc}` : '',
          ``,
          `*Productos:*`,
          ...lineas,
          serviciosCarrito.length > 0 ? `*Servicios:*` : '',
          ...serviciosCarrito.map(s => `• ${s.nombre_servicio} = $${s.precio_aplicado.toLocaleString('es-CO')}`),
          ``,
          `*Total: $${totalRedondeado.toLocaleString('es-CO')}*`,
          observaciones ? `📝 ${observaciones}` : '',
        ].filter(Boolean).join('\n')
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank')
      }

      if (action === 'con_recibo') reemplazar(`/dashboard/ventas/${data}?recibo=1`)
      else volver('/dashboard/ventas', { refrescar: true })

    } catch (err: any) {
      toast.error('No se pudo registrar la venta', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  // Dos pasos en modo tarea (sin la barra de navegación): armar la venta y cobrar. El total vive en el letrero amarillo.

  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  const medioElegido: MedioVenta = esCredito ? 'credito' : esMixto ? 'varios' : metodoPagoUnico
  const elegirMedio = (m: MedioVenta) => {
    if (m === 'credito') {
      if (cliente.es_cliente_generico) { toast.error('Para vender a crédito elige primero el cliente'); return }
      setEsCredito(true); setEsMixto(false); return
    }
    setEsCredito(false)
    if (m === 'varios') {
      if (!esMixto) setPagos([{ metodo: 'efectivo', monto: 0, monto_recibido: 0, vueltas: 0 }])
      setEsMixto(true); return
    }
    setEsMixto(false)
    setMetodoPagoUnico(m)
    setPagos([{ metodo: m, monto: totalRedondeado, monto_recibido: 0, vueltas: 0 }])
  }
  const recibido = pagos[0]?.monto_recibido ?? 0
  const cambiarRecibido = (r: number) =>
    setPagos([{ metodo: 'efectivo', monto: totalRedondeado, monto_recibido: r, vueltas: Math.max(0, r - totalRedondeado) }])
  const billetes = Array.from(new Set([10000, 20000, 50000, 100000].map(d => Math.ceil(totalRedondeado / d) * d)))
    .filter(v => v > totalRedondeado).slice(0, 3)
  const vueltas = esMixto ? (pagoEfectivo?.vueltas ?? 0) : Math.max(0, recibido - totalRedondeado)
  const lineas = carrito.length + serviciosCarrito.length
  const irACobrar = () => {
    if (lineas === 0) { toast.error('Agrega al menos un producto o servicio'); return }
    if (!esMixto && !esCredito) {
      setPagos(p => [{ metodo: metodoPagoUnico, monto: totalRedondeado, monto_recibido: p[0]?.monto_recibido ?? 0,
        vueltas: Math.max(0, (p[0]?.monto_recibido ?? 0) - totalRedondeado) }])
    }
    setPaso('cobro')
    window.scrollTo({ top: 0 })
  }
  const CAMPO = 'h-12 border-linea bg-superficie text-tinta placeholder:text-tenue'
  const ETIQUETA = 'text-sm font-semibold text-suave'
  const BOTON_LINEA = 'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-linea-fuerte text-[15px] font-semibold text-tinta transition-colors hover:bg-velo/5'

  const resumen = (
    <dl className="space-y-1.5 text-[15px]">
      <div className="flex justify-between"><dt className="text-suave">Productos</dt><dd className="cifra text-lg text-tinta">{pesos(subtotalProductosBruto)}</dd></div>
      {descuentosPorProducto > 0 && <div className="flex justify-between text-entra"><dt>Descuento en productos</dt><dd className="cifra text-lg">−{pesos(descuentosPorProducto)}</dd></div>}
      {subtotalServicios > 0 && <div className="flex justify-between"><dt className="text-suave">Servicios</dt><dd className="cifra text-lg text-tinta">{pesos(subtotalServicios)}</dd></div>}
      {descuentosPorServicio > 0 && <div className="flex justify-between text-entra"><dt>Descuento en servicios</dt><dd className="cifra text-lg">−{pesos(descuentosPorServicio)}</dd></div>}
      {descuentoTotalMonto > 0 && <div className="flex justify-between text-entra"><dt>Descuento al total ({descuentoTotalPct}%)</dt><dd className="cifra text-lg">−{pesos(descuentoTotalMonto)}</dd></div>}
      {ivaInformativo > 0 && <div className="flex justify-between text-sm text-tenue"><dt>IVA incluido en los precios</dt><dd className="cifra text-base">{pesos(ivaInformativo)}</dd></div>}
      {totalRedondeado !== Math.round(totalAntesRedondeo) && totalAntesRedondeo > 0 && (
        <p className="text-sm text-tenue">Total redondeado desde {pesos(totalAntesRedondeo)}</p>
      )}
    </dl>
  )

  // Letrero amarillo con el total: abajo en el celular, en la columna derecha en el PC
  const letrero = (
    <div className="flex items-center gap-3 rounded-[18px] bg-letrero py-3 pl-[18px] pr-3 text-tinta-fija shadow-[0_8px_24px_rgba(0,0,0,.22)]">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {esCredito ? `A crédito, ${cliente.nombre}` : `${lineas} ${lineas === 1 ? 'línea' : 'líneas'}`}
        </p>
        <p className="cifra text-[36px] font-bold leading-none">{pesos(totalRedondeado)}</p>
      </div>
      {paso === 'venta' ? (
        <button type="button" onClick={irACobrar}
          className="flex h-14 items-center gap-1.5 rounded-[14px] bg-tinta-fija px-6 text-[19px] font-bold text-letrero transition active:scale-[.98] disabled:opacity-60">
          Cobrar <ChevronRight className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => handleSubmit('con_recibo')} disabled={submitting}
          className="flex h-14 items-center gap-1.5 rounded-[14px] bg-tinta-fija px-5 text-[17px] font-bold text-letrero transition active:scale-[.98] disabled:opacity-60">
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
          {submitting && submitAction === 'con_recibo' ? 'Guardando…' : 'Registrar'}
        </button>
      )}
    </div>
  )

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
      {/* Encabezado de la tarea */}
      <header className="sticky top-[env(safe-area-inset-top)] z-20 flex items-center gap-1 bg-fondo/95 px-2 pb-2 pt-3 backdrop-blur md:px-4 lg:top-0 lg:pt-4">
        <button type="button" aria-label={paso === 'cobro' ? 'Volver a la venta' : 'Salir de la venta'}
          onClick={() => (paso === 'cobro' ? setPaso('venta') : volver('/dashboard/ventas'))}
          className="flex size-12 items-center justify-center rounded-xl text-tinta hover:bg-velo/5">
          <ChevronLeft className="size-6" strokeWidth={2} aria-hidden />
        </button>
        <h1 className="flex-1 text-[22px] font-bold text-tinta">{paso === 'cobro' ? 'Cobrar' : 'Nueva venta'}</h1>
        {paso === 'venta' && (
          <button type="button" onClick={() => setMostrarCliente(v => !v)} aria-expanded={mostrarCliente}
            className="mr-2 flex h-10 max-w-[55%] items-center gap-1.5 rounded-full border border-linea bg-superficie pl-2.5 pr-3 text-[15px] font-semibold text-tinta">
            <UserRound className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{cliente.es_cliente_generico ? 'Mostrador' : cliente.nombre}</span>
          </button>
        )}
      </header>

      <div className="flex flex-col gap-6 px-4 pb-40 md:px-6 lg:flex-row lg:items-start lg:pb-10">
        <div className="min-w-0 flex-1 space-y-4">
          {paso === 'venta' ? (
            <>
              {/* CLIENTE */}
              {mostrarCliente && (
                <section className="space-y-3 rounded-2xl bg-superficie p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-tinta">Cliente</h2>
                    {!cliente.es_cliente_generico && (
                      <button type="button" onClick={() => setCliente(clienteGeneral)} className="h-10 px-1 text-[15px] font-semibold text-enlace">
                        Volver a mostrador
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-tenue" aria-hidden />
                      <Input
                        value={queryCliente}
                        aria-label="Buscar cliente"
                        onChange={async (e) => { setQueryCliente(e.target.value); await buscarClientes(e.target.value) }}
                        placeholder="Nombre, teléfono o documento"
                        className={`${CAMPO} pl-10 text-base`}
                      />
                      {resultadosCliente.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-linea bg-superficie shadow-xl">
                          {resultadosCliente.map(c => (
                            <button key={c.id} type="button"
                              className="flex min-h-12 w-full items-center justify-between gap-2 border-b border-linea px-3 text-left last:border-0 hover:bg-velo/5"
                              onClick={() => {
                                setCliente(c)
                                setQueryCliente('')
                                setResultadosCliente([])
                                setMostrarCliente(false)
                                if (facturaElectronica && (c as any).email) setEmailFactura((c as any).email)
                              }}
                            >
                              <span className="font-semibold text-tinta">{c.nombre}</span>
                              {c.telefono && <span className="text-sm text-suave">{c.telefono}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button type="button" variant="outline" className="h-12 border-linea bg-superficie font-semibold text-tinta" onClick={() => setMostrarNuevoCliente(v => !v)}>
                      <Plus className="size-4" aria-hidden />Nuevo
                    </Button>
                  </div>
                  {mostrarNuevoCliente && (
                    <div className="space-y-2 rounded-xl bg-superficie-2 p-3">
                      <p className={ETIQUETA}>Cliente nuevo</p>
                      <Input placeholder="Nombre *" aria-label="Nombre" className={CAMPO} value={nuevoCliente.nombre} onChange={e => setNuevoCliente(p => ({ ...p, nombre: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Teléfono" aria-label="Teléfono" inputMode="tel" className={CAMPO} value={nuevoCliente.telefono} onChange={e => setNuevoCliente(p => ({ ...p, telefono: e.target.value }))} />
                        <Input placeholder="NIT o cédula" aria-label="NIT o cédula" className={CAMPO} value={nuevoCliente.nit_cc} onChange={e => setNuevoCliente(p => ({ ...p, nit_cc: e.target.value }))} />
                      </div>
                      <Input placeholder="Correo" aria-label="Correo" type="email" className={CAMPO} value={nuevoCliente.email} onChange={e => setNuevoCliente(p => ({ ...p, email: e.target.value }))} />
                      <div className="flex gap-2">
                        <Button type="button" className="h-11 bg-accion font-bold text-sobre-accion" onClick={guardarNuevoCliente} disabled={guardandoCliente}>
                          {guardandoCliente ? 'Guardando…' : 'Guardar cliente'}
                        </Button>
                        <Button type="button" variant="outline" className="h-11 border-linea bg-transparent text-tinta" onClick={() => setMostrarNuevoCliente(false)}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* BUSCAR PRODUCTO */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[22px] -translate-y-1/2 text-tenue" strokeWidth={1.75} aria-hidden />
                  <Input
                    value={queryProducto}
                    aria-label="Buscar producto"
                    onChange={async e => { setQueryProducto(e.target.value); await buscarProductos(e.target.value) }}
                    placeholder="Producto, medida o código"
                    className="h-[52px] rounded-xl border-linea bg-superficie pl-11 text-[17px] text-tinta placeholder:text-tenue"
                  />
                  {resultadosProducto.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-[60vh] w-full overflow-y-auto rounded-2xl bg-superficie shadow-2xl">
                      {resultadosProducto.map(p => {
                        const sinStock = p.stock_almacen <= 0 && p.stock_bodega <= 0
                        const primero = (p.precios_cantidad ?? []).find(t => t.precio_unitario < p.precio_venta)
                        return (
                          <li key={p.id} className="border-b border-linea last:border-0">
                            {p.vender_por_fraccion ? (
                              <div className="space-y-2 p-3">
                                <p className="font-semibold text-tinta">{p.nombre}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <button type="button" className="min-h-14 rounded-xl border border-linea px-3 py-2 text-left hover:bg-velo/5" onClick={() => agregarProducto(p, 'completo')}>
                                    <span className="block text-[15px] font-semibold text-tinta">Unidad completa</span>
                                    <span className="text-sm text-suave">{pesos(p.precio_venta)}, almacén {p.stock_almacen}</span>
                                  </button>
                                  <button type="button" className="min-h-14 rounded-xl border border-linea px-3 py-2 text-left hover:bg-velo/5" onClick={() => agregarProducto(p, 'fraccion')}>
                                    <span className="block text-[15px] font-semibold text-tinta">Por {p.medida_venta}</span>
                                    <span className="text-sm text-suave">{pesos(p.precio_por_unidad_medida ?? 0)} el {p.medida_venta}, quedan {p.remanente_fraccion}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" disabled={sinStock} onClick={() => agregarProducto(p, 'completo')}
                                className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left hover:bg-velo/5 disabled:opacity-50">
                                <MiniaturaProducto url={p.imagen_url} nombre={p.nombre} />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold leading-tight text-tinta">{p.nombre}</span>
                                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-suave">
                                    {p.codigo && <span>{p.codigo}</span>}
                                    {p.ubicacion && <span className="inline-flex items-center gap-0.5"><MapPin className="size-3.5" aria-hidden />{p.ubicacion}</span>}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right">
                                  <span className="cifra block text-xl font-bold text-tinta">{pesos(p.precio_venta)}</span>
                                  {primero && <span className="block text-xs font-semibold text-entra">Desde {primero.cantidad_minima}: {pesos(primero.precio_unitario)}</span>}
                                  <span className={`block text-sm ${p.stock_almacen <= 0 ? 'font-semibold text-sale' : 'text-suave'}`}>
                                    {p.stock_almacen <= 0 ? (p.stock_bodega > 0 ? `Solo en bodega: ${p.stock_bodega}` : 'Agotado') : `${p.stock_almacen} en almacén`}
                                  </span>
                                </span>
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <button type="button" onClick={() => setMostrarAltaRapida(v => !v)} aria-expanded={mostrarAltaRapida} aria-label="Crear un producto que no está en el inventario"
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-linea bg-superficie text-tinta hover:bg-velo/5">
                  <PackagePlus className="size-6" strokeWidth={1.75} aria-hidden />
                </button>
              </div>

              {mostrarAltaRapida && (
                <section className="space-y-3 rounded-2xl bg-superficie p-4">
                  <div>
                    <h2 className="text-lg font-bold text-tinta">Producto que no está en el inventario</h2>
                    <p className="text-sm text-suave">Queda en Inventario, Por completar, hasta que alguien complete sus datos.</p>
                  </div>
                  <Input placeholder="Nombre del producto *" aria-label="Nombre del producto" className={CAMPO} value={altaRapida.nombre} onChange={e => setAltaRapida(p => ({ ...p, nombre: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="alta-precio" className={ETIQUETA}>Precio de venta *</label>
                      <Input id="alta-precio" type="number" inputMode="numeric" className={CAMPO} value={altaRapida.precio || ''} onChange={e => setAltaRapida(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="alta-margen" className={ETIQUETA}>Margen %</label>
                      <Input id="alta-margen" type="number" inputMode="numeric" min={0} max={99} className={CAMPO} value={altaRapida.margen || ''} onChange={e => setAltaRapida(p => ({ ...p, margen: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  {altaRapida.precio > 0 && (
                    <p className="text-sm text-suave">Costo calculado: <span className="cifra text-base text-tinta">{pesos(altaRapida.precio * (1 - altaRapida.margen / 100) / 1.19)}</span></p>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" className="h-11 bg-accion font-bold text-sobre-accion" onClick={guardarAltaRapida} disabled={guardandoAltaRapida}>
                      {guardandoAltaRapida ? 'Creando…' : 'Crear y agregar'}
                    </Button>
                    <Button type="button" variant="outline" className="h-11 border-linea bg-transparent text-tinta" onClick={() => setMostrarAltaRapida(false)}>Cancelar</Button>
                  </div>
                </section>
              )}

              {alertaStock && (
                <section className="space-y-3 rounded-2xl bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)] p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-aviso" aria-hidden />
                    <div>
                      <p className="font-semibold text-tinta">No alcanza lo que hay en almacén de {alertaStock.productoNombre}</p>
                      <p className="text-sm text-suave">En almacén hay {alertaStock.stockAlmacen} y en bodega {alertaStock.stockBodega}. Pasa unidades de bodega para venderlas.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="number" inputMode="numeric" aria-label="Unidades a pasar de bodega" min={1} max={alertaStock.stockBodega} value={cantidadTransferir || ''}
                      onChange={e => setCantidadTransferir(parseInt(e.target.value) || 0)} className="h-11 w-24 border-linea bg-superficie text-tinta" />
                    <span className="text-sm text-suave">de {alertaStock.stockBodega}</span>
                    <Button type="button" className="h-11 bg-accion font-bold text-sobre-accion" onClick={handleTransferirStock} disabled={transfiriendo}>
                      <ArrowRightLeft className="size-4" aria-hidden />{transfiriendo ? 'Pasando…' : 'Pasar a almacén'}
                    </Button>
                    <Button type="button" variant="outline" className="h-11 border-linea bg-transparent text-tinta" onClick={() => setAlertaStock(null)}>Ahora no</Button>
                  </div>
                </section>
              )}

              {/* EN LA VENTA */}
              {lineas > 0 ? (
                <section>
                  <div className="flex items-baseline justify-between px-1 pb-2">
                    <h2 className="text-[17px] font-semibold text-tinta">En la venta</h2>
                    <button type="button" className="h-10 px-1 text-[15px] font-semibold text-enlace"
                      onClick={() => { setCarrito([]); setServiciosCarrito([]) }}>Vaciar</button>
                  </div>
                  <ul className="overflow-hidden rounded-2xl bg-superficie">
                    {carrito.map((item, idx) => {
                      const salto = item.es_fraccionado ? (item.cantidad_minima_venta ?? 0.5) : 1
                      const cantidad = item.es_fraccionado ? item.cantidad_fraccion : item.cantidad
                      const subtotal = item.es_fraccionado
                        ? item.precio_unitario * item.cantidad_fraccion
                        : item.precio_unitario * item.cantidad * (1 - (item.descuento_habilitado ? item.descuento_porcentaje / 100 : 0))
                      const cambiar = (n: number) => {
                        if (item.es_fraccionado) {
                          const v = Math.max(salto, Math.round(n * 1000) / 1000)
                          setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad_fraccion: v } : it))
                        } else if (n >= 1) cambiarCantidad(idx, item, n)
                      }
                      return (
                        <li key={item.key} className="space-y-2.5 border-b border-linea p-3.5 last:border-0">
                          <div className="flex items-start gap-3">
                            <MiniaturaProducto url={item.imagen_url} nombre={item.nombre} grande />
                            <div className="min-w-0 flex-1">
                              <p className="text-[17px] font-semibold leading-tight text-tinta">{item.nombre}</p>
                              <p className="mt-0.5 text-sm text-suave">
                                {item.es_fraccionado ? `Por ${item.medida_venta}` : `${item.stock_almacen} en almacén`}
                                {item.ubicacion ? `, ${item.ubicacion}` : ''}
                              </p>
                            </div>
                            <p className="cifra shrink-0 text-[21px] font-bold text-tinta">{pesos(subtotal)}</p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center overflow-hidden rounded-xl border border-linea">
                              <button type="button" aria-label="Quitar uno" onClick={() => cambiar(cantidad - salto)} disabled={cantidad <= salto}
                                className="flex h-11 w-12 items-center justify-center bg-superficie-2 text-tinta disabled:opacity-40">
                                <Minus className="size-5" aria-hidden />
                              </button>
                              <input type="number" inputMode="decimal" aria-label={`Cantidad de ${item.nombre}`}
                                step={salto} min={salto} max={item.es_fraccionado ? undefined : item.stock_almacen}
                                value={cantidad || ''} onFocus={e => e.target.select()}
                                onChange={e => {
                                  const raw = e.target.value
                                  if (item.es_fraccionado) {
                                    setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad_fraccion: parseFloat(raw) || 0 } : it))
                                    return
                                  }
                                  if (raw === '') { setCarrito(prev => prev.map((it, i) => i === idx ? conCantidad(it, 0) : it)); return }
                                  const val = parseInt(raw)
                                  if (!isNaN(val) && val >= 1) cambiarCantidad(idx, item, val)
                                }}
                                onBlur={e => {
                                  if (!item.es_fraccionado && (!e.target.value || parseInt(e.target.value) < 1)) {
                                    setCarrito(prev => prev.map((it, i) => i === idx ? conCantidad(it, 1) : it))
                                  }
                                }}
                                className="cifra h-11 w-16 bg-transparent text-center text-xl font-bold text-tinta outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                              <button type="button" aria-label="Agregar uno" onClick={() => cambiar(cantidad + salto)}
                                className="flex h-11 w-12 items-center justify-center bg-superficie-2 text-tinta">
                                <Plus className="size-5" aria-hidden />
                              </button>
                            </div>
                            <span className="flex-1 text-sm text-suave">
                              {pesos(item.precio_unitario)} {item.es_fraccionado ? `el ${item.medida_venta}` : 'c/u'}
                            </span>
                            <button type="button" aria-label={`Quitar ${item.nombre} de la venta`} onClick={() => setCarrito(prev => prev.filter((_, i) => i !== idx))}
                              className="flex size-11 items-center justify-center rounded-xl text-suave hover:bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] hover:text-sale">
                              <Trash2 className="size-5" strokeWidth={1.75} aria-hidden />
                            </button>
                          </div>
                          {item.es_fraccionado && item.cantidad_minima_venta && item.cantidad_fraccion > 0 && !esMultiplo(item.cantidad_fraccion, item.cantidad_minima_venta) && (
                            <p className="text-sm font-semibold text-sale">Debe ser múltiplo de {item.cantidad_minima_venta}</p>
                          )}
                          {!item.es_fraccionado && (
                            <AvisoPrecioCantidad tramos={item.tramos} precioVenta={item.precio_base} cantidad={item.cantidad} />
                          )}
                          {!item.es_fraccionado && item.peso_unitario_g != null && item.peso_unitario_g > 0 && (
                            <AyudaPesoVenta id={`peso-${item.key}`} pesoUnitario={item.peso_unitario_g} cantidad={item.cantidad}
                              onCantidad={n => cambiarCantidad(idx, item, n)} />
                          )}
                          {descuentoHabilitado && !item.es_fraccionado && item.tramo_desde == null && (
                            <div className="flex items-center gap-2 border-t border-linea pt-2">
                              <Switch checked={item.descuento_habilitado} aria-label="Descuento en este producto"
                                onCheckedChange={v => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_habilitado: v, descuento_porcentaje: v ? 5 : 0 } : it))} />
                              <span className="text-sm text-suave">Descuento</span>
                              {item.descuento_habilitado && (
                                <div className="ml-auto flex items-center gap-1">
                                  <Input type="number" inputMode="numeric" min={0} max={10} aria-label="Porcentaje de descuento" className="h-10 w-16 border-linea bg-superficie-2 text-tinta" value={item.descuento_porcentaje || ''}
                                    onChange={e => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_porcentaje: validarDescuento(parseFloat(e.target.value) || 0) } : it))} />
                                  <span className="text-sm text-suave">% (máx. 10)</span>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                    {serviciosCarrito.map((s, idx) => (
                      <li key={s.key} className="space-y-2 border-b border-linea p-3.5 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="flex size-14 shrink-0 items-center justify-center rounded-[10px] bg-superficie-2 text-enlace">
                            <Wrench className="size-6" strokeWidth={1.75} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[17px] font-semibold leading-tight text-tinta">{s.nombre_servicio}</p>
                            <p className="text-sm text-suave">Servicio{s.descuento_habilitado && s.descuento_porcentaje > 0 ? `, ${s.descuento_porcentaje}% de descuento` : ''}</p>
                          </div>
                          <p className="cifra text-[21px] font-bold text-tinta">{pesos(s.precio_aplicado * (1 - (s.descuento_habilitado ? s.descuento_porcentaje / 100 : 0)))}</p>
                          <button type="button" aria-label={`Quitar ${s.nombre_servicio}`} onClick={() => setServiciosCarrito(prev => prev.filter((_, i) => i !== idx))}
                            className="flex size-11 items-center justify-center rounded-xl text-suave hover:text-sale">
                            <Trash2 className="size-5" strokeWidth={1.75} aria-hidden />
                          </button>
                        </div>
                        {descuentoHabilitado && (
                          <div className="flex items-center gap-2 border-t border-linea pt-2">
                            <Switch checked={s.descuento_habilitado} aria-label="Descuento en este servicio"
                              onCheckedChange={v => setServiciosCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_habilitado: v, descuento_porcentaje: v ? 5 : 0 } : it))} />
                            <span className="text-sm text-suave">Descuento</span>
                            {s.descuento_habilitado && (
                              <div className="ml-auto flex items-center gap-1">
                                <Input type="number" inputMode="numeric" min={0} max={10} aria-label="Porcentaje de descuento" className="h-10 w-16 border-linea bg-superficie-2 text-tinta" value={s.descuento_porcentaje || ''}
                                  onChange={e => setServiciosCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_porcentaje: validarDescuento(parseFloat(e.target.value) || 0) } : it))} />
                                <span className="text-sm text-suave">%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : !mostrarAltaRapida && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-linea-fuerte px-6 py-10 text-center">
                  <ShoppingBasket className="size-12 text-tenue" strokeWidth={1.5} aria-hidden />
                  <p className="text-[17px] font-semibold text-tinta">Busca el primer producto</p>
                  <p className="text-[15px] text-suave">Escribe el nombre, la medida o el código. También puedes agregar un servicio.</p>
                </div>
              )}

              {/* SERVICIO Y DESCUENTO */}
              <div className="flex gap-2">
                <button type="button" className={BOTON_LINEA} aria-expanded={mostrarServicios} onClick={() => setMostrarServicios(v => !v)}>
                  <Wrench className="size-[18px]" strokeWidth={1.75} aria-hidden />Servicio
                </button>
                <button type="button" className={`${BOTON_LINEA} ${descuentoHabilitado ? 'border-solid border-accion bg-accion/10' : ''}`} aria-pressed={descuentoHabilitado}
                  onClick={() => {
                    const v = !descuentoHabilitado
                    setDescuentoHabilitado(v)
                    if (!v) {
                      setDescuentoTotalActivo(false); setEditandoTotalManual(false); setTotalManual('')
                      setCarrito(prev => prev.map(it => ({ ...it, descuento_habilitado: false, descuento_porcentaje: 0 })))
                      setServiciosCarrito(prev => prev.map(it => ({ ...it, descuento_habilitado: false, descuento_porcentaje: 0 })))
                    }
                  }}>
                  <Percent className="size-[18px]" strokeWidth={1.75} aria-hidden />Descuento
                </button>
              </div>

              {mostrarServicios && (
                <section className="space-y-3 rounded-2xl bg-superficie p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-tinta">Agregar servicio</h2>
                    <button type="button" className="h-10 px-1 text-[15px] font-semibold text-enlace" onClick={() => setMostrarNuevoServicio(v => !v)}>
                      {mostrarNuevoServicio ? 'Elegir de la lista' : 'Servicio nuevo'}
                    </button>
                  </div>
                  {!mostrarNuevoServicio && catalogo.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {catalogo.map(s => (
                        <button key={s.id} type="button" onClick={() => agregarServicio(s)}
                          className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-linea px-3 text-left hover:bg-velo/5">
                          <span className="font-semibold text-tinta">{s.nombre}</span>
                          <span className="cifra text-lg text-tinta">{pesos(s.precio)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(mostrarNuevoServicio || catalogo.length === 0) && (
                    <div className="space-y-2">
                      <Input placeholder="Nombre *" aria-label="Nombre del servicio" className={CAMPO} value={nuevoServicio.nombre} onChange={e => setNuevoServicio(p => ({ ...p, nombre: e.target.value }))} />
                      <Input placeholder="Descripción" aria-label="Descripción" className={CAMPO} value={nuevoServicio.descripcion} onChange={e => setNuevoServicio(p => ({ ...p, descripcion: e.target.value }))} />
                      <div className="space-y-1">
                        <label htmlFor="serv-precio" className={ETIQUETA}>Precio *</label>
                        <Input id="serv-precio" type="number" inputMode="numeric" className={CAMPO} value={nuevoServicio.precio || ''} onChange={e => setNuevoServicio(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <Button type="button" className="h-11 bg-accion font-bold text-sobre-accion" onClick={guardarNuevoServicio} disabled={guardandoServicio}>
                        {guardandoServicio ? 'Guardando…' : 'Guardar y agregar'}
                      </Button>
                    </div>
                  )}
                </section>
              )}

              {descuentoHabilitado && (
                <section className="space-y-3 rounded-2xl bg-superficie p-4">
                  <h2 className="text-lg font-bold text-tinta">Descuento</h2>
                  {hayPrecioCantidad && (
                    <p className="rounded-xl bg-superficie-2 p-3 text-sm text-suave">
                      Hay productos con precio por cantidad: la venta no admite descuento al total ni total escrito a mano. A los demás
                      productos sí les puedes poner descuento en su línea.
                    </p>
                  )}
                  <div className="flex min-h-12 items-center gap-3">
                    <Switch checked={descuentoTotalVigente} disabled={hayPrecioCantidad} aria-label="Descuento al total"
                      onCheckedChange={v => { setDescuentoTotalActivo(v); if (v) setEditandoTotalManual(false) }} />
                    <span className="text-[15px] text-tinta">Descuento al total</span>
                    {descuentoTotalVigente && (
                      <div className="ml-auto flex items-center gap-1">
                        <Input type="number" inputMode="numeric" min={0} max={10} aria-label="Porcentaje al total" className="h-10 w-16 border-linea bg-superficie-2 text-tinta" value={descuentoTotalPct || ''}
                          onChange={e => setDescuentoTotalPct(validarDescuento(parseFloat(e.target.value) || 0))} />
                        <span className="text-sm text-suave">%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-12 items-center gap-3">
                    <Switch checked={totalManualVigente} disabled={hayPrecioCantidad} aria-label="Escribir el total a mano" onCheckedChange={v => {
                      setEditandoTotalManual(v)
                      if (v) { setDescuentoTotalActivo(false); setTotalManual(String(totalRedondeado)) }
                      else setTotalManual('')
                    }} />
                    <span className="text-[15px] text-tinta">Escribir el total a mano</span>
                    {totalManualVigente && (
                      <Input type="number" inputMode="numeric" aria-label="Total" className="ml-auto h-10 w-32 border-linea bg-superficie-2 text-tinta" value={totalManual}
                        onChange={e => setTotalManual(e.target.value)}
                        onBlur={() => {
                          const val = parseFloat(totalManual) || 0
                          if (val < minPagoPermitido) {
                            toast.error(`El total no puede bajar de ${pesos(minPagoPermitido)} (descuento máximo ${(maxDescuentoPct * 100).toFixed(0)}%)`)
                            setTotalManual(String(minPagoPermitido))
                          }
                        }} />
                    )}
                  </div>
                  <p className="text-sm text-suave">
                    Descuento de la venta: <strong className={descuentoAcumuladoPct > maxDescuentoPct ? 'text-sale' : 'text-tinta'}>{(descuentoAcumuladoPct * 100).toFixed(1)}%</strong> de
                    {' '}{(maxDescuentoPct * 100).toFixed(0)}% permitido. El total no puede bajar de <strong className="text-tinta">{pesos(minPagoPermitido)}</strong>.
                  </p>
                </section>
              )}
            </>
          ) : (
            <>
              {/* ─── COBRAR ─── */}
              <div className="flex flex-col items-center gap-0.5 pt-2 text-center">
                <p className="text-[15px] text-suave">
                  {lineas} {lineas === 1 ? 'línea' : 'líneas'}, {cliente.es_cliente_generico ? 'cliente de mostrador' : cliente.nombre}
                </p>
                <p className="cifra text-[56px] font-bold leading-none text-tinta">{pesos(totalRedondeado)}</p>
              </div>

              <fieldset>
                <legend className="mb-2.5 text-[17px] font-semibold text-tinta">¿Cómo paga?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {MEDIOS_VENTA.map(m => {
                    const activo = medioElegido === m.valor
                    return (
                      <button key={m.valor} type="button" aria-pressed={activo} onClick={() => elegirMedio(m.valor)}
                        className={`flex h-[84px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 text-[15px] font-semibold text-tinta transition-colors ${
                          activo ? 'border-accion bg-accion/10' : 'border-linea bg-superficie hover:bg-velo/5'}`}>
                        <MedioPagoIcono medio={m.valor} />
                        {m.nombre}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {medioElegido === 'efectivo' && (
                <section className="space-y-2.5">
                  <h2 className="text-[17px] font-semibold text-tinta">¿Con cuánto paga?</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {[totalRedondeado, ...billetes].map((v, i) => (
                      <button key={v} type="button" aria-pressed={recibido === v} onClick={() => cambiarRecibido(v)}
                        className={`cifra h-[52px] rounded-xl border-2 text-[22px] font-bold text-tinta ${recibido === v ? 'border-accion bg-accion/10' : 'border-linea bg-superficie'}`}>
                        {i === 0 ? 'Exacto' : pesos(v)}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="recibido" className={ETIQUETA}>Otro valor</label>
                    <Input id="recibido" type="number" inputMode="numeric" value={recibido || ''} onFocus={e => e.target.select()}
                      onChange={e => cambiarRecibido(parseFloat(e.target.value) || 0)} placeholder="Lo que entrega el cliente"
                      className={`${CAMPO} cifra text-xl`} />
                  </div>
                  <div className="flex items-center justify-between rounded-[14px] bg-[color-mix(in_oklab,var(--entra)_14%,transparent)] px-4 py-3.5">
                    <span className="text-[17px] font-semibold text-tinta">Vuelto</span>
                    <span className="cifra text-[34px] font-bold text-entra">{pesos(vueltas)}</span>
                  </div>
                </section>
              )}

              {(medioElegido === 'nequi' || medioElegido === 'daviplata' || medioElegido === 'tarjeta') && (
                <p className="rounded-[14px] bg-superficie px-4 py-3.5 text-[15px] text-suave">Confirma que el pago llegó antes de registrar la venta.</p>
              )}

              {medioElegido === 'credito' && (
                <section className="space-y-3 rounded-2xl bg-superficie p-4">
                  <div>
                    <h2 className="text-lg font-bold text-tinta">A crédito para {cliente.nombre}</h2>
                    <p className="text-[15px] text-suave">El inventario se descuenta ya y el saldo queda en la cuenta del cliente.</p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="fecha-credito" className={ETIQUETA}>Fecha en que pagará (opcional)</label>
                    <Input id="fecha-credito" type="date" value={fechaPagoCredito} onChange={e => setFechaPagoCredito(e.target.value)} className={`${CAMPO} w-48`} />
                  </div>
                </section>
              )}

              {medioElegido === 'varios' && (
                <section className="space-y-2">
                  <h2 className="text-[17px] font-semibold text-tinta">Reparte el pago</h2>
                  {METODOS.map(m => {
                    const pagoActivo = pagos.find(p => p.metodo === m)
                    return (
                      <div key={m} className={`space-y-2 rounded-[14px] border-2 p-3 ${pagoActivo ? 'border-accion bg-superficie' : 'border-linea bg-superficie'}`}>
                        <label className="flex min-h-10 items-center gap-3">
                          <Switch checked={!!pagoActivo} onCheckedChange={() => toggleMetodoPago(m)} aria-label={METODO_LABEL[m]} />
                          <MedioPagoIcono medio={m} className="h-6 w-9" />
                          <span className="text-[15px] font-semibold text-tinta">{METODO_LABEL[m]}</span>
                        </label>
                        {pagoActivo && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label htmlFor={`monto-${m}`} className={ETIQUETA}>Monto</label>
                              <Input id={`monto-${m}`} type="number" inputMode="numeric" className={`${CAMPO} cifra text-lg`} value={pagoActivo.monto || ''} onFocus={e => e.target.select()} onChange={e => actualizarPago(m, 'monto', parseFloat(e.target.value) || 0)} />
                            </div>
                            {m === 'efectivo' && (
                              <div className="space-y-1">
                                <label htmlFor="recibido-mixto" className={ETIQUETA}>Recibido *</label>
                                <Input id="recibido-mixto" type="number" inputMode="numeric" className={`${CAMPO} cifra text-lg`} value={pagoActivo.monto_recibido || ''} onFocus={e => e.target.select()} onChange={e => actualizarPago(m, 'monto_recibido', parseFloat(e.target.value) || 0)} />
                              </div>
                            )}
                            {m === 'efectivo' && pagoActivo.vueltas > 0 && (
                              <p className="col-span-2 text-[15px] text-suave">Vuelto: <span className="cifra text-lg font-bold text-entra">{pesos(pagoActivo.vueltas)}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {Math.abs(diferenciaPago) > 1 && (
                    <p className="text-[15px] font-semibold text-sale">
                      {diferenciaPago > 0 ? `Falta repartir ${pesos(diferenciaPago)}` : `Sobran ${pesos(Math.abs(diferenciaPago))}`}
                    </p>
                  )}
                </section>
              )}

              {/* Factura y observaciones */}
              <details className="group rounded-2xl bg-superficie">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold text-tinta">
                  Factura electrónica y observaciones
                  <ChevronDown className="size-5 text-suave transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="space-y-3 px-4 pb-4">
                  <label className="flex min-h-10 items-center gap-3">
                    <Switch checked={facturaElectronica} onCheckedChange={v => {
                      setFacturaElectronica(v)
                      if (v && (cliente as any).email) setEmailFactura((cliente as any).email)
                    }} aria-label="Factura electrónica" />
                    <span className="text-[15px] text-tinta">Factura electrónica</span>
                  </label>
                  {facturaElectronica && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="nit-fe" className={ETIQUETA}>NIT del cliente</label>
                        <Input id="nit-fe" value={cliente.nit_cc ?? ''} readOnly className={`${CAMPO} bg-superficie-2`} />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="email-fe" className={ETIQUETA}>Correo del cliente</label>
                        <Input id="email-fe" type="email" className={CAMPO} placeholder="correo@ejemplo.com" value={emailFactura} onChange={e => setEmailFactura(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="obs" className={ETIQUETA}>Observaciones</Label>
                    <Textarea id="obs" className="border-linea bg-superficie-2 text-tinta placeholder:text-tenue" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Opcional" />
                  </div>
                </div>
              </details>

              <div className="rounded-2xl bg-superficie px-4 py-3 lg:hidden">{resumen}</div>

              <Button type="button" variant="outline" onClick={() => handleSubmit('sin_recibo')} disabled={submitting}
                className="h-12 w-full border-linea bg-superficie text-[15px] font-semibold text-tinta">
                {submitting && submitAction === 'sin_recibo' ? 'Guardando…' : 'Registrar sin recibo'}
              </Button>
            </>
          )}
        </div>

        {/* PC: resumen y letrero en la columna derecha */}
        <aside className="hidden lg:block lg:w-[380px] lg:shrink-0">
          <div className="sticky top-20 space-y-3 rounded-[18px] bg-superficie p-4">
            <h2 className="text-lg font-bold text-tinta">Resumen</h2>
            {resumen}
            {letrero}
          </div>
        </aside>
      </div>

      {/* Celular: letrero fijo abajo */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-fondo via-fondo/95 to-transparent px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 lg:hidden">
        {letrero}
      </div>
    </div>
  )
}

type MedioVenta = MetodoPago | 'credito' | 'varios'
const MEDIOS_VENTA: { valor: MedioVenta; nombre: string }[] = [
  { valor: 'efectivo', nombre: 'Efectivo' },
  { valor: 'nequi', nombre: 'Nequi' },
  { valor: 'daviplata', nombre: 'Daviplata' },
  { valor: 'tarjeta', nombre: 'Tarjeta' },
  { valor: 'credito', nombre: 'Crédito' },
  { valor: 'varios', nombre: 'Varios medios' },
]

/** Foto del producto sobre baldosa blanca (en los dos modos), entera y sin recortar */
function MiniaturaProducto({ url, nombre, grande = false }: { url: string | null; nombre: string; grande?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white ring-1 ring-inset ring-[#12263a]/10 ${grande ? 'size-14' : 'size-12'}`}>
      {url
        ? <img src={url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
        : <Package className={`${grande ? 'size-7' : 'size-6'} text-brand-blue`} strokeWidth={1.5} aria-label={nombre} />}
    </span>
  )
}
