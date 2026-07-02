import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FamiliaMedidasPanel, type Miembro } from '@/components/modulos/familia-medidas-panel'

export default async function FamiliaMedidasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: producto, error } = await supabase
    .from('productos')
    .select(`
      id, nombre, descripcion, codigo, categoria_id, marca, ubicacion, precio_venta,
      tiene_iva, iva_incluido, porcentaje_iva, stock_bodega, stock_almacen, stock_minimo,
      prioridad, unidad_medida, imagen_url, familia_id, caracteristica,
      vender_por_fraccion, medida_venta, cantidad_total_unidad,
      cantidad_minima_venta, precio_por_unidad_medida,
      categorias_producto(nombre),
      producto_proveedores ( id, proveedor_id, precio_costo, referencia_proveedor, notas )
    `)
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  const categoriaNombre = (producto.categorias_producto as { nombre: string } | null)?.nombre ?? null

  // Nombre base de la familia (título del panel). Si aún no tiene familia, se usa el nombre actual del producto.
  let nombreBase = producto.nombre
  if (producto.familia_id) {
    const { data: familia } = await supabase
      .from('producto_familias')
      .select('nombre_base')
      .eq('id', producto.familia_id)
      .single()
    if (familia) nombreBase = familia.nombre_base
  }

  // Miembros de la familia (si aún no tiene familia, la lista es solo este producto)
  let miembros: Miembro[] = []

  type MiembroCrudo = {
    id: string; nombre: string; codigo: string | null; unidad_medida: string | null
    marca: string | null; caracteristica: string | null
    stock_almacen: number; stock_bodega: number
    producto_proveedores: { precio_costo: number }[] | null
  }

  const mapear = (m: MiembroCrudo): Miembro => {
    const costos = (m.producto_proveedores ?? []).map(p => p.precio_costo)
    const costoMinimo = costos.length > 0 ? Math.min(...costos) : 0
    const sinActualizar = m.stock_almacen === 0 && m.stock_bodega === 0 && costoMinimo === 0
    return {
      id: m.id, nombre: m.nombre, codigo: m.codigo, unidad_medida: m.unidad_medida,
      marca: m.marca, caracteristica: m.caracteristica,
      stock_almacen: m.stock_almacen, stock_bodega: m.stock_bodega, sinActualizar,
    }
  }

  if (producto.familia_id) {
    const { data: familiaData } = await supabase
      .from('productos')
      .select('id, nombre, codigo, unidad_medida, marca, caracteristica, stock_almacen, stock_bodega, producto_proveedores(precio_costo)')
      .eq('familia_id', producto.familia_id)
      .eq('activo', true)
      .order('created_at', { ascending: true })
    miembros = (familiaData ?? []).map(mapear)
  } else {
    miembros = [mapear({
      id: producto.id, nombre: producto.nombre, codigo: producto.codigo,
      unidad_medida: producto.unidad_medida, marca: producto.marca, caracteristica: producto.caracteristica,
      stock_almacen: producto.stock_almacen, stock_bodega: producto.stock_bodega,
      producto_proveedores: producto.producto_proveedores,
    })]
  }

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/inventario/${producto.id}`} className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Familia de productos</h1>
            <p className="text-xs text-steel-300">{nombreBase}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        <FamiliaMedidasPanel
          empleadoId={user.id}
          productoActualId={producto.id}
          nombreBase={nombreBase}
          producto={{
            id: producto.id,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            categoria_id: producto.categoria_id,
            categoriaNombre,
            marca: producto.marca,
            ubicacion: producto.ubicacion,
            precio_venta: producto.precio_venta,
            tiene_iva: producto.tiene_iva,
            iva_incluido: producto.iva_incluido,
            porcentaje_iva: producto.porcentaje_iva,
            stock_minimo: producto.stock_minimo,
            prioridad: producto.prioridad,
            unidad_medida: producto.unidad_medida,
            imagen_url: producto.imagen_url,
            familia_id: producto.familia_id,
            vender_por_fraccion: producto.vender_por_fraccion,
            medida_venta: producto.medida_venta,
            cantidad_total_unidad: producto.cantidad_total_unidad,
            cantidad_minima_venta: producto.cantidad_minima_venta,
            precio_por_unidad_medida: producto.precio_por_unidad_medida,
            proveedores: producto.producto_proveedores ?? [],
          }}
          miembrosIniciales={miembros}
        />
      </div>
    </div>
  )
}