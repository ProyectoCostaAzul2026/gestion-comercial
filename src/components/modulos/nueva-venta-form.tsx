'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Trash2, AlertTriangle, ArrowRightLeft, MapPin, Package, Wrench } from 'lucide-react'

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

function calcularIva(p: Pick<ProductoSearch, 'tiene_iva' | 'iva_incluido' | 'porcentaje_iva' | 'precio_venta'>): number {
  if (!p.tiene_iva) return 0
  if (p.iva_incluido) return p.precio_venta - p.precio_venta / (1 + p.porcentaje_iva / 100)
  return p.precio_venta * (p.porcentaje_iva / 100)
}

function redondear100(valor: number): number {
  if (valor % 100 === 0) return valor
  return Math.ceil(valor / 100) * 100
}

export function NuevaVentaForm({ clienteGeneral, catalogo, maxDescuentoPct = 0.10, whatsappNegocio }: NuevaVentaFormProps) {
  const router = useRouter()
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

  const descuentoTotalMonto = useMemo(() => {
    if (!descuentoHabilitado || !descuentoTotalActivo) return 0
    return subtotalTotal * descuentoTotalPct / 100
  }, [descuentoHabilitado, descuentoTotalActivo, subtotalTotal, descuentoTotalPct])

  const totalAntesRedondeo = useMemo(() => {
    if (editandoTotalManual && totalManual !== '') return parseFloat(totalManual) || 0
    return subtotalTotal - descuentoTotalMonto
  }, [subtotalTotal, descuentoTotalMonto, editandoTotalManual, totalManual])

  const totalRedondeado = useMemo(() => redondear100(totalAntesRedondeo), [totalAntesRedondeo])

  const ivaInformativo = useMemo(() =>
    carrito.reduce((sum, item) => item.es_fraccionado ? sum : sum + item.iva_unitario * item.cantidad, 0),
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
    if (error) { toast.error('Error: ' + error.message); return }
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
        setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: nuevaCantidad } : it))
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
        imagen_url: p.imagen_url,
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
      precio_unitario: p.precio_por_unidad_medida ?? 0, iva_unitario: 0,
      cantidad: 1, stock_almacen: p.stock_almacen, stock_bodega: p.stock_bodega, ubicacion: p.ubicacion,
      descuento_habilitado: false, descuento_porcentaje: 0,
      es_fraccionado: true, cantidad_fraccion: p.cantidad_minima_venta ?? 1,
      medida_venta: p.medida_venta, cantidad_minima_venta: p.cantidad_minima_venta,
      remanente_fraccion: p.remanente_fraccion, cantidad_total_unidad: p.cantidad_total_unidad,
      imagen_url: p.imagen_url,
    }])
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
      toast.error('Error al transferir: ' + err.message)
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
    }).select('id, nombre, precio_venta, tiene_iva, iva_incluido, porcentaje_iva').single()
    setGuardandoAltaRapida(false)
    if (error) { toast.error('Error: ' + error.message); return }
    const iva = calcularIva({ ...data, precio_venta: data.precio_venta })
    setCarrito(prev => [...prev, {
      key: `${data.id}-${Date.now()}`, producto_id: data.id, nombre: data.nombre,
      precio_unitario: data.precio_venta, iva_unitario: iva,
      cantidad: 1, stock_almacen: 0, stock_bodega: 0, ubicacion: null,
      descuento_habilitado: false, descuento_porcentaje: 0,
      es_fraccionado: false, cantidad_fraccion: 0,
      medida_venta: null, cantidad_minima_venta: null, remanente_fraccion: 0, cantidad_total_unidad: null,
      imagen_url: null,
    }])
    setMostrarAltaRapida(false)
    setAltaRapida({ nombre: '', precio: 0, margen: 30 })
    toast.success('Producto creado y agregado al carrito')
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
    if (error) { toast.error('Error: ' + error.message); return }
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
    if (esCredito) return null
    for (const item of carrito) {
      if (item.es_fraccionado && item.cantidad_minima_venta && item.cantidad_fraccion % item.cantidad_minima_venta !== 0) {
        return `La cantidad de "${item.nombre}" debe ser múltiplo de ${item.cantidad_minima_venta} ${item.medida_venta}`
      }
    }
    if (descuentoAcumuladoPct > maxDescuentoPct + 0.001) {
      return `Descuento acumulado (${(descuentoAcumuladoPct * 100).toFixed(1)}%) supera el máximo permitido (${(maxDescuentoPct * 100).toFixed(0)}%). Mínimo a pagar: $${minPagoPermitido.toLocaleString('es-CO')}`
    }
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
      }))

      const serviciosPayload = serviciosCarrito.map(s => ({
        servicio_id: s.servicio_id,
        nombre_servicio: s.nombre_servicio,
        precio_aplicado: s.descuento_habilitado ? s.precio_aplicado * (1 - s.descuento_porcentaje / 100) : s.precio_aplicado,
      }))

      let descuentoTipo: string | null = null
      if (descuentoHabilitado) {
        if (editandoTotalManual && totalManual !== '') descuentoTipo = 'manual'
        else if (descuentoTotalActivo) descuentoTipo = 'total'
        else descuentoTipo = 'por_producto'
      }

      // ── Venta a crédito ──
      if (esCredito) {
        const { data, error: rpcError } = await supabase.rpc('registrar_venta_credito', {
          p_cliente_id: cliente.id,
          p_items: items,
          p_servicios: serviciosPayload.length > 0 ? serviciosPayload : null,
          p_descuento_habilitado: descuentoHabilitado,
          p_descuento_tipo: descuentoTipo,
          p_descuento_total_porcentaje: descuentoHabilitado && descuentoTotalActivo ? descuentoTotalPct : 0,
          p_fecha_pago_programada: fechaPagoCredito || null,
          p_observaciones: observaciones || null,
          p_factura_electronica: facturaElectronica,
        })
        if (rpcError) throw rpcError
        toast.success('Venta a crédito registrada')
        if (action === 'con_recibo') router.push(`/dashboard/ventas/${data}?recibo=1`)
        else { router.push('/dashboard/ventas'); router.refresh() }
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
        p_descuento_tipo: descuentoTipo,
        p_descuento_total_porcentaje: descuentoHabilitado && descuentoTotalActivo ? descuentoTotalPct : 0,
        p_factura_electronica: facturaElectronica,
        p_observaciones: observaciones || null,
        p_servicios: serviciosPayload.length > 0 ? serviciosPayload : null,
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

      if (action === 'con_recibo') router.push(`/dashboard/ventas/${data}?recibo=1`)
      else { router.push('/dashboard/ventas'); router.refresh() }

    } catch (err: any) {
      toast.error('Error al registrar venta: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">

        {/* HEADER DIAGONAL */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
          <h1 className="font-display text-3xl font-bold text-white">Nueva <span className="text-brand-yellow">Venta</span></h1>
          <p className="mt-0.5 text-xs text-steel-300">Registra productos, servicios y cobro</p>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
            <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
          </div>
        </div>

        {/* CLIENTE */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Cliente
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
              <Input
                value={queryCliente}
                onChange={async (e) => { setQueryCliente(e.target.value); await buscarClientes(e.target.value) }}
                placeholder="Buscar por nombre, teléfono o documento…"
                className="h-12 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
              />
              {resultadosCliente.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#111820] shadow-xl">
                  {resultadosCliente.map(c => (
                    <button key={c.id} type="button"
                      className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => {
                        setCliente(c)
                        setQueryCliente('')
                        setResultadosCliente([])
                        if (facturaElectronica && (c as any).email) setEmailFactura((c as any).email)
                      }}
                    >
                      <span className="font-medium text-white">{c.nombre}</span>
                      {c.telefono && <span className="text-xs text-steel-300">{c.telefono}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" className="h-12 border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setMostrarNuevoCliente(v => !v)}>
              <Plus className="mr-1 h-4 w-4" />Nuevo
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#1a2430] px-3 py-2.5 text-sm">
            <span className="font-medium text-white">{cliente.nombre}</span>
            {cliente.es_cliente_generico && (
              <span className="inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">General</span>
            )}
            {!cliente.es_cliente_generico && (
              <button type="button" onClick={() => setCliente(clienteGeneral)} className="ml-auto text-xs text-steel-300 hover:text-white">
                Usar Cliente General
              </button>
            )}
          </div>

          {mostrarNuevoCliente && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Nuevo cliente rápido</p>
              <Input placeholder="Nombre *" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={nuevoCliente.nombre} onChange={e => setNuevoCliente(p => ({ ...p, nombre: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Teléfono" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={nuevoCliente.telefono} onChange={e => setNuevoCliente(p => ({ ...p, telefono: e.target.value }))} />
                <Input placeholder="NIT/CC" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={nuevoCliente.nit_cc} onChange={e => setNuevoCliente(p => ({ ...p, nit_cc: e.target.value }))} />
              </div>
              <Input placeholder="Email" type="email" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={nuevoCliente.email} onChange={e => setNuevoCliente(p => ({ ...p, email: e.target.value }))} />

              <div className="flex gap-2">
                <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={guardarNuevoCliente} disabled={guardandoCliente}>
                  {guardandoCliente ? 'Guardando…' : 'Guardar'}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setMostrarNuevoCliente(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </section>

        {/* PRODUCTOS */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
              <span className="h-5 w-1 rounded-full bg-brand-yellow" />Productos
            </h2>
            <Button type="button" variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setMostrarAltaRapida(v => !v)}>
              <Plus className="mr-1 h-4 w-4" />Alta rápida ⚡
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
            <Input
              value={queryProducto}
              onChange={async e => { setQueryProducto(e.target.value); await buscarProductos(e.target.value) }}
              placeholder="Buscar por nombre o código…"
              className="h-12 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
            />
            {resultadosProducto.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111820] shadow-xl">
                {resultadosProducto.map(p => (
                  <div key={p.id} className="border-b border-white/8 last:border-0">
                    {p.vender_por_fraccion ? (
                      <div className="px-3 py-2">
                        <p className="mb-1 text-sm font-medium text-white">{p.nombre}</p>
                        <div className="flex gap-2">
                          <button type="button" className="flex-1 rounded-xl border border-white/10 px-2 py-1.5 text-left text-xs hover:border-brand-blue/40 hover:bg-white/5" onClick={() => agregarProducto(p, 'completo')}>
                            <span className="block font-medium text-white">Unidad completa</span>
                            <span className="text-steel-300">${p.precio_venta.toLocaleString('es-CO')} · Almacén: {p.stock_almacen}</span>
                          </button>
                          <button type="button" className="flex-1 rounded-xl border border-white/10 px-2 py-1.5 text-left text-xs hover:border-brand-blue/40 hover:bg-white/5" onClick={() => agregarProducto(p, 'fraccion')}>
                            <span className="block font-medium text-white">Por {p.medida_venta}</span>
                            <span className="text-steel-300">${(p.precio_por_unidad_medida ?? 0).toLocaleString('es-CO')}/{p.medida_venta} · Rem: {p.remanente_fraccion}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-50"
                        onClick={() => agregarProducto(p, 'completo')}
                        disabled={p.stock_almacen <= 0 && p.stock_bodega <= 0}
                      >
                        <div>
                          <span className="font-medium text-white">{p.nombre}</span>
                          {p.codigo && <span className="ml-2 font-mono text-xs text-brand-yellow">{p.codigo}</span>}
                          {p.ubicacion && <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-steel-300"><MapPin className="h-3 w-3" />{p.ubicacion}</span>}
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <div className="text-xs font-medium text-white">${p.precio_venta.toLocaleString('es-CO')}</div>
                          <div className={`text-xs ${p.stock_almacen <= 0 ? 'text-brand-red' : 'text-steel-300'}`}>
                            Almacén: {p.stock_almacen}
                            {p.stock_almacen <= 0 && p.stock_bodega > 0 && ` · Bodega: ${p.stock_bodega}`}
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {mostrarAltaRapida && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Alta rápida — el producto quedará en Inventario para completar después</p>
              <Input placeholder="Nombre del producto *" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={altaRapida.nombre} onChange={e => setAltaRapida(p => ({ ...p, nombre: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Precio de venta *</label>
                  <Input type="number" className="border-white/10 bg-[#111820] text-white" value={altaRapida.precio || ''} onChange={e => setAltaRapida(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Margen %</label>
                  <Input type="number" min={0} max={99} className="border-white/10 bg-[#111820] text-white" value={altaRapida.margen || ''} onChange={e => setAltaRapida(p => ({ ...p, margen: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              {altaRapida.precio > 0 && (
                <p className="text-xs text-steel-300">Costo calculado: ${Math.round(altaRapida.precio * (1 - altaRapida.margen / 100) / 1.19).toLocaleString('es-CO')}</p>
              )}
              <div className="flex gap-2">
                <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={guardarAltaRapida} disabled={guardandoAltaRapida}>
                  {guardandoAltaRapida ? 'Creando…' : 'Crear y agregar'}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setMostrarAltaRapida(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {alertaStock && (
            <div className="space-y-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" />
                <div className="text-sm">
                  <p className="font-medium text-brand-yellow">{alertaStock.productoNombre}: stock insuficiente en Almacén</p>
                  <p className="mt-0.5 text-xs text-brand-yellow/80">Disponible en Almacén: <strong>{alertaStock.stockAlmacen}</strong> · En Bodega: <strong>{alertaStock.stockBodega}</strong></p>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-[#111820] p-3">
                <p className="text-xs font-medium text-white">Transferir desde Bodega a Almacén</p>
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={alertaStock.stockBodega} value={cantidadTransferir || ''} onChange={e => setCantidadTransferir(parseInt(e.target.value) || 0)} className="h-9 w-24 border-white/10 bg-[#1a2430] text-sm text-white" />
                  <span className="text-xs text-steel-300">unidades (máx {alertaStock.stockBodega})</span>
                  <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleTransferirStock} disabled={transfiriendo}>
                    <ArrowRightLeft className="mr-1 h-4 w-4" />
                    {transfiriendo ? 'Transfiriendo…' : 'Transferir'}
                  </Button>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setAlertaStock(null)}>Cancelar</Button>
            </div>
          )}

          {carrito.length > 0 && (
            <div className="space-y-2">
              {carrito.map((item, idx) => (
                <div key={item.key} className="rounded-xl border border-white/10 bg-[#1a2430] p-3">
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#111820]">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="size-6 text-brand-yellow/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{item.nombre}</p>
                      <div className="mt-0.5 flex flex-wrap gap-3">
                        {item.ubicacion && <span className="inline-flex items-center gap-0.5 text-xs text-steel-300"><MapPin className="h-3 w-3" />{item.ubicacion}</span>}
                        {!item.es_fraccionado && <span className="text-xs text-steel-300">Almacén: {item.stock_almacen} · Bodega: {item.stock_bodega}</span>}
                        {item.es_fraccionado && <span className="text-xs text-steel-300">Fraccionado · {item.medida_venta}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => setCarrito(prev => prev.filter((_, i) => i !== idx))} className="shrink-0 text-steel-300 hover:text-brand-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {item.es_fraccionado ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Cantidad ({item.medida_venta}) — mín {item.cantidad_minima_venta}</label>
                        <Input
                          type="number"
                          className="border-white/10 bg-[#111820] text-white"
                          step={item.cantidad_minima_venta ?? 0.5}
                          min={item.cantidad_minima_venta ?? 0.5}
                          value={item.cantidad_fraccion || ''}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad_fraccion: val } : it))
                          }}
                        />
                        {item.cantidad_minima_venta && item.cantidad_fraccion > 0 && item.cantidad_fraccion % item.cantidad_minima_venta !== 0 && (
                          <p className="text-xs text-brand-red">Debe ser múltiplo de {item.cantidad_minima_venta}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Subtotal</label>
                        <p className="mt-2 text-sm font-semibold text-white">${(item.precio_unitario * item.cantidad_fraccion).toLocaleString('es-CO')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 items-end gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Cantidad (máx {item.stock_almacen})</label>
                        <Input
                          type="number" min={1} max={item.stock_almacen}
                          className="border-white/10 bg-[#111820] text-white"
                          value={item.cantidad || ''}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const raw = e.target.value
                            if (raw === '') { setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: 0 } : it)); return }
                            const val = parseInt(raw)
                            if (isNaN(val) || val < 1) return
                            if (val > item.stock_almacen) {
                              if (item.stock_bodega > 0) {
                                setAlertaStock({ productoId: item.producto_id, productoNombre: item.nombre, stockAlmacen: item.stock_almacen, stockBodega: item.stock_bodega, cantidadNecesaria: val - item.stock_almacen })
                                setCantidadTransferir(Math.min(val - item.stock_almacen, item.stock_bodega))
                              } else {
                                toast.error(`Máximo disponible en almacén: ${item.stock_almacen}`)
                              }
                              return
                            }
                            setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: val } : it))
                          }}
                          onBlur={e => {
                            if (!e.target.value || parseInt(e.target.value) < 1) {
                              setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: 1 } : it))
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Precio unit.</label>
                        <p className="mt-2 text-sm text-white">${item.precio_unitario.toLocaleString('es-CO')}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Subtotal</label>
                        <p className="mt-2 text-sm font-semibold text-white">
                          ${(item.precio_unitario * item.cantidad * (1 - (item.descuento_habilitado ? item.descuento_porcentaje / 100 : 0))).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                  )}

                  {descuentoHabilitado && !item.es_fraccionado && (
                    <div className="flex items-center gap-2 border-t border-white/8 pt-2">
                      <Switch checked={item.descuento_habilitado} onCheckedChange={v => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_habilitado: v, descuento_porcentaje: v ? 5 : 0 } : it))} />
                      <span className="text-xs text-steel-300">Descuento</span>
                      {item.descuento_habilitado && (
                        <div className="ml-auto flex items-center gap-1">
                          <Input type="number" min={0} max={10} className="h-8 w-16 border-white/10 bg-[#111820] text-xs text-white" value={item.descuento_porcentaje || ''}
                            onChange={e => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_porcentaje: validarDescuento(parseFloat(e.target.value) || 0) } : it))} />
                          <span className="text-xs text-steel-300">% (máx 10)</span>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}

          {carrito.length === 0 && !mostrarAltaRapida && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Package className="size-16 text-brand-yellow/50" />
              <p className="text-sm text-steel-300">Busca un producto para agregarlo</p>
            </div>
          )}
        </section>

        {/* SERVICIOS */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
              <span className="h-5 w-1 rounded-full bg-brand-yellow" />Servicios
            </h2>
            <Button type="button" variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setMostrarNuevoServicio(v => !v)}>
              <Plus className="mr-1 h-4 w-4" />Nuevo servicio
            </Button>
          </div>

          {catalogo.length > 0 && (
            <Select
              items={catalogo.map(s => ({ value: s.id, label: `${s.nombre} — $${s.precio.toLocaleString('es-CO')}` }))}
              onValueChange={v => { if (!v) return; const servicio = catalogo.find(s => s.id === v); if (servicio) agregarServicio(servicio) }}
              value=""
            >
              <SelectTrigger className="h-12 border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Selecciona un servicio del catálogo…" /></SelectTrigger>
              <SelectContent>
                {catalogo.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre} — ${s.precio.toLocaleString('es-CO')}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {mostrarNuevoServicio && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Nuevo servicio</p>
              <Input placeholder="Nombre *" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={nuevoServicio.nombre} onChange={e => setNuevoServicio(p => ({ ...p, nombre: e.target.value }))} />
              <Input placeholder="Descripción" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" value={nuevoServicio.descripcion} onChange={e => setNuevoServicio(p => ({ ...p, descripcion: e.target.value }))} />
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Precio *</label>
                <Input type="number" className="border-white/10 bg-[#111820] text-white" value={nuevoServicio.precio || ''} onChange={e => setNuevoServicio(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={guardarNuevoServicio} disabled={guardandoServicio}>
                  {guardandoServicio ? 'Guardando…' : 'Guardar y agregar'}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setMostrarNuevoServicio(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {serviciosCarrito.length > 0 && (
            <div className="space-y-1">
              {serviciosCarrito.map((s, idx) => (
                <div key={s.key} className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-white">{s.nombre_servicio}</span>
                      <span className="ml-2 text-sm text-steel-300">${s.precio_aplicado.toLocaleString('es-CO')}</span>
                      {s.descuento_habilitado && s.descuento_porcentaje > 0 && (
                        <span className="ml-2 text-xs text-emerald-400">-{s.descuento_porcentaje}% = ${(s.precio_aplicado * (1 - s.descuento_porcentaje / 100)).toLocaleString('es-CO')}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => setServiciosCarrito(prev => prev.filter((_, i) => i !== idx))} className="text-steel-300 hover:text-brand-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {descuentoHabilitado && (
                    <div className="flex items-center gap-2 border-t border-white/8 pt-1">
                      <Switch checked={s.descuento_habilitado} onCheckedChange={v => setServiciosCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_habilitado: v, descuento_porcentaje: v ? 5 : 0 } : it))} />
                      <span className="text-xs text-steel-300">Descuento</span>
                      {s.descuento_habilitado && (
                        <div className="ml-auto flex items-center gap-1">
                          <Input type="number" min={0} max={10} className="h-8 w-16 border-white/10 bg-[#111820] text-xs text-white" value={s.descuento_porcentaje || ''}
                            onChange={e => setServiciosCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_porcentaje: validarDescuento(parseFloat(e.target.value) || 0) } : it))} />
                          <span className="text-xs text-steel-300">%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {serviciosCarrito.length === 0 && !mostrarNuevoServicio && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Wrench className="size-12 text-brand-yellow/50" />
              <p className="text-sm text-steel-300">Sin servicios agregados</p>
            </div>
          )}
        </section>

        {/* DESCUENTOS */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
              <span className="h-5 w-1 rounded-full bg-brand-yellow" />Descuentos
            </h2>
            <div className="flex items-center gap-2">
              <Switch checked={descuentoHabilitado} onCheckedChange={v => {
                setDescuentoHabilitado(v)
                if (!v) {
                  setDescuentoTotalActivo(false); setEditandoTotalManual(false); setTotalManual('')
                  setCarrito(prev => prev.map(it => ({ ...it, descuento_habilitado: false, descuento_porcentaje: 0 })))
                  setServiciosCarrito(prev => prev.map(it => ({ ...it, descuento_habilitado: false, descuento_porcentaje: 0 })))
                }
              }} />
              <span className={`text-sm font-semibold ${descuentoHabilitado ? 'text-brand-yellow' : 'text-steel-300'}`}>{descuentoHabilitado ? 'Habilitado' : 'Deshabilitado'}</span>
            </div>
          </div>

          {descuentoHabilitado && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2430] p-3">
                <Switch checked={descuentoTotalActivo} onCheckedChange={v => { setDescuentoTotalActivo(v); if (v) setEditandoTotalManual(false) }} />
                <span className="text-sm text-white">Descuento sobre el total</span>
                {descuentoTotalActivo && (
                  <div className="ml-auto flex items-center gap-1">
                    <Input type="number" min={0} max={10} className="h-8 w-16 border-white/10 bg-[#111820] text-xs text-white" value={descuentoTotalPct || ''}
                      onChange={e => setDescuentoTotalPct(validarDescuento(parseFloat(e.target.value) || 0))} />
                    <span className="text-xs text-steel-300">% (máx 10)</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2430] p-3">
                <Switch checked={editandoTotalManual} onCheckedChange={v => {
                  setEditandoTotalManual(v)
                  if (v) { setDescuentoTotalActivo(false); setTotalManual(String(totalRedondeado)) }
                  else setTotalManual('')
                }} />
                <span className="text-sm text-white">Editar total manualmente</span>
                {editandoTotalManual && (
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-xs text-steel-300">$</span>
                    <Input type="number" className="h-8 w-32 border-white/10 bg-[#111820] text-xs text-white" value={totalManual}
                      onChange={e => setTotalManual(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(totalManual) || 0
                        if (val < minPagoPermitido) {
                          toast.error(`Mínimo a pagar: $${minPagoPermitido.toLocaleString('es-CO')} (descuento máx ${(maxDescuentoPct * 100).toFixed(0)}%)`)
                          setTotalManual(String(minPagoPermitido))
                        }
                      }} />
                  </div>
                )}
              </div>
              <div className="flex justify-between rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2 text-xs">
                <span className="text-steel-300">
                  Descuento acumulado: <strong className={descuentoAcumuladoPct > maxDescuentoPct ? 'text-brand-red' : 'text-white'}>{(descuentoAcumuladoPct * 100).toFixed(1)}%</strong> / {(maxDescuentoPct * 100).toFixed(0)}%
                </span>
                <span className="text-steel-300">Mín: <strong className="text-white">${minPagoPermitido.toLocaleString('es-CO')}</strong></span>
              </div>
              <p className="text-xs text-steel-500">Los descuentos por producto/servicio se activan en cada línea del carrito.</p>
            </div>
          )}
        </section>

        {/* PAGO */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
              <span className="h-5 w-1 rounded-full bg-brand-yellow" />Método de pago
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={esCredito}
                  onCheckedChange={v => {
                    if (v && cliente.es_cliente_generico) {
                      toast.error('Selecciona un cliente para registrar a crédito')
                      return
                    }
                    setEsCredito(v)
                  }}
                />
                <span className="text-sm text-steel-300">Venta a crédito</span>
              </div>
              {!esCredito && (
                <div className="flex items-center gap-2">
                  <Switch checked={esMixto} onCheckedChange={v => {
                    setEsMixto(v)
                    if (!v) setPagos([{ metodo: metodoPagoUnico, monto: totalRedondeado, monto_recibido: 0, vueltas: 0 }])
                    else setPagos([{ metodo: 'efectivo', monto: 0, monto_recibido: 0, vueltas: 0 }])
                  }} />
                  <span className="text-sm text-steel-300">Pago mixto</span>
                </div>
              )}
            </div>
          </div>

          {esCredito ? (
            <div className="space-y-3 rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-3">
              <p className="text-sm font-medium text-brand-blue">Venta a crédito — sin cobro inmediato</p>
              <p className="text-xs text-brand-blue/80">
                El inventario se descuenta normalmente. El saldo quedará pendiente en el perfil del cliente.
              </p>
              {cliente.es_cliente_generico && (
                <p className="flex items-center gap-1 text-xs font-medium text-brand-red"><AlertTriangle className="h-3.5 w-3.5" /> Debes seleccionar un cliente específico para continuar</p>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Fecha de pago programada (opcional)</label>
                <Input type="date" value={fechaPagoCredito} onChange={e => setFechaPagoCredito(e.target.value)} className="h-12 w-44 border-white/10 bg-[#111820] text-white" />
              </div>
            </div>
          ) : !esMixto ? (
            <div className="space-y-3">
              <Select
                items={METODOS.map(m => ({ value: m, label: METODO_LABEL[m] }))}
                onValueChange={v => {
                  if (!v) return
                  setMetodoPagoUnico(v as MetodoPago)
                  setPagos([{ metodo: v as MetodoPago, monto: totalRedondeado, monto_recibido: 0, vueltas: 0 }])
                }}
                value={metodoPagoUnico}
              >
                <SelectTrigger className="h-12 w-48 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map(m => <SelectItem key={m} value={m}>{METODO_LABEL[m]}</SelectItem>)}
                </SelectContent>
              </Select>

              {metodoPagoUnico === 'efectivo' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Monto recibido *</label>
                    <Input type="number" className="h-12 border-white/10 bg-[#1a2430] text-white" value={pagos[0]?.monto_recibido || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const recibido = parseFloat(e.target.value) || 0
                        setPagos([{ metodo: 'efectivo', monto: totalRedondeado, monto_recibido: recibido, vueltas: Math.max(0, recibido - totalRedondeado) }])
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Vueltas</label>
                    <p className="mt-2 font-display text-xl font-bold text-emerald-400">
                      ${Math.max(0, (pagos[0]?.monto_recibido ?? 0) - totalRedondeado).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {METODOS.map(m => {
                const pagoActivo = pagos.find(p => p.metodo === m)
                return (
                  <div key={m} className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={!!pagoActivo} onCheckedChange={() => toggleMetodoPago(m)} />
                      <span className="text-sm font-medium text-white">{METODO_LABEL[m]}</span>
                    </div>
                    {pagoActivo && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Monto</label>
                          <Input type="number" className="border-white/10 bg-[#111820] text-white" value={pagoActivo.monto || ''} onFocus={e => e.target.select()} onChange={e => actualizarPago(m, 'monto', parseFloat(e.target.value) || 0)} />
                        </div>
                        {m === 'efectivo' && (
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Monto recibido *</label>
                            <Input type="number" className="border-white/10 bg-[#111820] text-white" value={pagoActivo.monto_recibido || ''} onFocus={e => e.target.select()} onChange={e => actualizarPago(m, 'monto_recibido', parseFloat(e.target.value) || 0)} />
                          </div>
                        )}
                        {m === 'efectivo' && pagoActivo.vueltas > 0 && (
                          <div className="col-span-2">
                            <span className="text-xs text-steel-300">Vueltas: </span>
                            <span className="font-bold text-emerald-400">${pagoActivo.vueltas.toLocaleString('es-CO')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {Math.abs(diferenciaPago) > 1 && (
                <p className="text-xs font-medium text-brand-red">
                  {diferenciaPago > 0 ? `Falta asignar: $${diferenciaPago.toLocaleString('es-CO')}` : `Excede en: $${Math.abs(diferenciaPago).toLocaleString('es-CO')}`}
                </p>
              )}
            </div>
          )}
        </section>

        {/* FACTURA Y OBSERVACIONES */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center gap-2">
            <Switch checked={facturaElectronica} onCheckedChange={v => {
              setFacturaElectronica(v)
              if (v && (cliente as any).email) setEmailFactura((cliente as any).email)
            }} />
            <span className="text-sm font-medium text-white">Factura electrónica</span>
          </div>
          {facturaElectronica && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">NIT cliente</label>
                <Input value={cliente.nit_cc ?? ''} readOnly className="border-white/10 bg-[#1a2430] text-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Email cliente</label>
                <Input
                  type="email"
                  className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500"
                  placeholder="email@ejemplo.com"
                  value={emailFactura}
                  onChange={e => setEmailFactura(e.target.value)}
                />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="obs" className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Observaciones</Label>
            <Textarea id="obs" className="mt-1 border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Observaciones opcionales" />
          </div>
        </section>

        {/* BOTONES */}
        <div className="flex flex-col gap-2 pb-8">
          <Button type="button" onClick={() => handleSubmit('con_recibo')} disabled={submitting} className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
            {submitting && submitAction === 'con_recibo' ? 'Guardando…' : esCredito ? 'Registrar venta a crédito y generar recibo' : 'Guardar y generar recibo'}
          </Button>
          <Button type="button" variant="outline" onClick={() => handleSubmit('sin_recibo')} disabled={submitting} className="h-12 w-full border-white/10 bg-[#1a2430] font-semibold text-white hover:bg-white/5 hover:text-white">
            {submitting && submitAction === 'sin_recibo' ? 'Guardando…' : esCredito ? 'Registrar venta a crédito' : 'Guardar sin recibo'}
          </Button>
          <button type="button" onClick={() => router.push('/dashboard/ventas')}
            className={buttonVariants({ variant: 'outline', className: 'h-12 w-full border-white/10 bg-transparent text-steel-300 hover:bg-white/5 hover:text-white' })}>
            Cancelar
          </button>
        </div>
      </div>

      {/* ── Resumen sticky ── */}
      <div className="lg:w-72 lg:shrink-0">
        <div className="sticky top-4 space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Resumen
          </h2>
          {esCredito && (
            <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-3 py-2">
              <p className="text-xs font-medium text-brand-blue">Venta a crédito</p>
              <p className="text-xs text-brand-blue/80">Cliente: {cliente.nombre}</p>
            </div>
          )}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-steel-300">Subtotal bruto</dt>
              <dd className="text-white">${subtotalProductosBruto.toLocaleString('es-CO')}</dd>
            </div>
            {descuentosPorProducto > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>Desc. por producto</dt>
                <dd>-${descuentosPorProducto.toLocaleString('es-CO')}</dd>
              </div>
            )}
            {subtotalServicios > 0 && (
              <div className="flex justify-between">
                <dt className="text-steel-300">Servicios</dt>
                <dd className="text-white">${subtotalServicios.toLocaleString('es-CO')}</dd>
              </div>
            )}
            {descuentosPorServicio > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>Desc. servicios</dt>
                <dd>-${descuentosPorServicio.toLocaleString('es-CO')}</dd>
              </div>
            )}
            {descuentoTotalMonto > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>Desc. total ({descuentoTotalPct}%)</dt>
                <dd>-${descuentoTotalMonto.toLocaleString('es-CO')}</dd>
              </div>
            )}
            {ivaInformativo > 0 && (
              <div className="mt-2 flex justify-between border-t border-white/8 pt-2 text-xs text-steel-500">
                <dt>IVA incluido (informativo)</dt>
                <dd>${Math.round(ivaInformativo).toLocaleString('es-CO')}</dd>
              </div>
            )}
            <div className={`mt-2 flex items-center justify-between rounded-xl border px-3 py-2.5 ${totalAntesRedondeo > 0 ? 'border-white/10 bg-[#1a2430]' : 'border-white/10 bg-[#1a2430] opacity-60'}`}>
              <dt className="text-sm font-medium text-white">{esCredito ? 'Total a crédito' : 'Total a cobrar'}</dt>
              <dd className="font-display text-lg font-bold text-brand-yellow">${totalRedondeado.toLocaleString('es-CO')}</dd>
            </div>
            {totalRedondeado !== Math.round(totalAntesRedondeo) && totalAntesRedondeo > 0 && (
              <p className="text-right text-xs text-steel-500">Redondeado desde ${Math.round(totalAntesRedondeo).toLocaleString('es-CO')}</p>
            )}
          </dl>

          {hayEfectivo && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xs font-medium text-emerald-400">Vueltas a entregar</p>
              <p className="mt-0.5 font-display text-2xl font-bold text-emerald-400">
                ${Math.max(0, esMixto ? (pagoEfectivo?.vueltas ?? 0) : (pagos[0]?.vueltas ?? 0)).toLocaleString('es-CO')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}