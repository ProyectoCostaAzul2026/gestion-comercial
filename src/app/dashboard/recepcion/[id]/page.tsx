import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { esAdmin } from '@/lib/permissions'
import type { EstadoRecepcion } from '@/lib/recepcion'
import { RecepcionPanel } from '@/components/modulos/recepcion-panel'
import type { DatosAdminRecepcion, ProductoDelProveedor, RecepcionVista, RenglonVista } from '@/components/modulos/recepcion-tipos'

export default async function RecepcionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  const administrador = esAdmin(perfil?.rol)

  const { data: rec } = await supabase.from('recepciones').select('*, proveedores(nombre)').eq('id', id).maybeSingle()
  if (!rec) notFound()

  const [{ data: items, error: errorItems }, { data: catalogo }] = await Promise.all([
    traerTodo((desde, hasta) => supabase
      .from('recepcion_items')
      .select('id, producto_id, descripcion, referencia, cantidad_facturada, costo_unitario, cantidad_contada, cantidad_averiada, cantidad_almacen, ingresado_bodega, ingresado_almacen, stock_ingresado, contado_at, precio_aprobado, productos(id, nombre, codigo, marca, unidad_medida, activo, precio_venta, tiene_iva, iva_incluido, porcentaje_iva, vender_por_fraccion, stock_bodega, stock_almacen), profiles(nombre_completo)')
      .eq('recepcion_id', id)
      .order('created_at')
      .order('id')
      .range(desde, hasta)),
    // Productos del proveedor (para buscar por referencia y ver su costo actual); un empleado no ve los inactivos
    traerTodo((desde, hasta) => supabase
      .from('producto_proveedores')
      .select('precio_costo, referencia_proveedor, productos(id, nombre, codigo, marca, unidad_medida, activo)')
      .eq('proveedor_id', rec.proveedor_id)
      .order('id')
      .range(desde, hasta)),
  ])

  const productosProveedor: ProductoDelProveedor[] = catalogo
    .filter(pp => pp.productos)
    .map(pp => ({
      id: pp.productos!.id,
      nombre: pp.productos!.nombre,
      codigo: pp.productos!.codigo,
      marca: pp.productos!.marca,
      unidad_medida: pp.productos!.unidad_medida,
      referencia: pp.referencia_proveedor,
      costo: Number(pp.precio_costo),
      activo: pp.productos!.activo,
    }))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es'))
  const costoConProveedor = new Map(productosProveedor.map(p => [p.id, p.costo]))

  let datosAdmin: DatosAdminRecepcion | null = null
  let conTramos = new Set<string>()
  if (administrador) {
    const idsProductos = items.map(i => i.producto_id).filter((x): x is string => !!x)
    const [{ data: factura }, { data: config }, { data: unidades }, { data: tramos }] = await Promise.all([
      supabase.from('facturas_proveedor').select('monto_total, estado').eq('id', rec.factura_id).maybeSingle(),
      supabase.from('configuracion_negocio').select('margen_default').maybeSingle(),
      supabase.from('unidades_medida').select('nombre').eq('activo', true).order('orden'),
      idsProductos.length > 0
        ? supabase.from('precios_cantidad').select('producto_id').in('producto_id', idsProductos)
        : Promise.resolve({ data: [] as { producto_id: string }[] }),
    ])
    datosAdmin = {
      totalFactura: Number(factura?.monto_total ?? 0),
      estadoPago: factura?.estado ?? 'pendiente',
      margenDefault: config?.margen_default != null ? Number(config.margen_default) * 100 : 40,
      unidades: (unidades ?? []).map(u => u.nombre),
    }
    conTramos = new Set((tramos ?? []).map(t => t.producto_id))
  }

  const recepcion: RecepcionVista = {
    id: rec.id,
    factura_id: rec.factura_id,
    proveedor_id: rec.proveedor_id,
    proveedor_nombre: rec.proveedores?.nombre ?? 'Proveedor',
    numero_factura: rec.numero_factura,
    fecha_factura: rec.fecha_factura,
    costos_con_iva: rec.costos_con_iva,
    estado: rec.estado as EstadoRecepcion,
    precios_aprobados_at: rec.precios_aprobados_at,
    nota_cierre: rec.nota_cierre,
    nota_resolucion: rec.nota_resolucion,
    cerrada_at: rec.cerrada_at,
    resuelta_at: rec.resuelta_at,
  }

  const renglones: RenglonVista[] = items.map(i => ({
    id: i.id,
    producto_id: i.producto_id,
    descripcion: i.descripcion,
    referencia: i.referencia,
    cantidad_facturada: i.cantidad_facturada,
    costo_unitario: Number(i.costo_unitario),
    cantidad_contada: i.cantidad_contada,
    cantidad_averiada: i.cantidad_averiada,
    cantidad_almacen: i.cantidad_almacen,
    ingresado_bodega: i.ingresado_bodega,
    ingresado_almacen: i.ingresado_almacen,
    stock_ingresado: i.stock_ingresado,
    contado_por_nombre: i.profiles?.nombre_completo ?? null,
    contado_at: i.contado_at,
    precio_aprobado: i.precio_aprobado != null ? Number(i.precio_aprobado) : null,
    producto: i.productos ? {
      id: i.productos.id,
      nombre: i.productos.nombre,
      codigo: i.productos.codigo,
      marca: i.productos.marca,
      unidad_medida: i.productos.unidad_medida,
      activo: i.productos.activo,
      precio_venta: Number(i.productos.precio_venta),
      tiene_iva: i.productos.tiene_iva,
      iva_incluido: i.productos.iva_incluido,
      porcentaje_iva: Number(i.productos.porcentaje_iva),
      vender_por_fraccion: i.productos.vender_por_fraccion,
      stock_bodega: i.productos.stock_bodega,
      stock_almacen: i.productos.stock_almacen,
    } : null,
    costo_anterior: i.producto_id ? costoConProveedor.get(i.producto_id) ?? null : null,
    tiene_tramos: i.producto_id ? conTramos.has(i.producto_id) : false,
  }))

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/dashboard/recepcion" className="inline-flex items-center gap-2 text-sm text-steel-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" />Recepciones
      </Link>
      {errorItems && <p className="text-sm text-brand-red">No se pudieron cargar los renglones: {errorItems.message}</p>}
      <RecepcionPanel recepcion={recepcion} renglones={renglones} productosProveedor={productosProveedor}
        esAdmin={administrador} datosAdmin={datosAdmin} />
    </div>
  )
}
