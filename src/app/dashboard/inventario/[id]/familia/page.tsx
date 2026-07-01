import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FamiliaMedidasPanel } from '@/components/modulos/familia-medidas-panel'

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
      prioridad, unidad_medida, imagen_url, familia_id,
      vender_por_fraccion, medida_venta, cantidad_total_unidad,
      cantidad_minima_venta, precio_por_unidad_medida,
      categorias_producto(nombre),
      producto_proveedores ( id, proveedor_id, precio_costo, referencia_proveedor, notas )
    `)
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  const categoriaNombre = (producto.categorias_producto as { nombre: string } | null)?.nombre ?? null

  // Miembros de la familia (si aún no tiene familia, la lista es solo este producto)
  let miembros: { id: string; nombre: string; codigo: string | null; unidad_medida: string | null; stock_almacen: number; stock_bodega: number }[] = []

  if (producto.familia_id) {
    const { data: familiaData } = await supabase
      .from('productos')
      .select('id, nombre, codigo, unidad_medida, stock_almacen, stock_bodega')
      .eq('familia_id', producto.familia_id)
      .eq('activo', true)
      .order('created_at', { ascending: true })
    miembros = familiaData ?? []
  } else {
    miembros = [{
      id: producto.id, nombre: producto.nombre, codigo: producto.codigo,
      unidad_medida: producto.unidad_medida, stock_almacen: producto.stock_almacen, stock_bodega: producto.stock_bodega,
    }]
  }

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/inventario/${producto.id}`} className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Familia de medidas</h1>
            <p className="text-xs text-steel-300">{producto.nombre}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        <FamiliaMedidasPanel
          empleadoId={user.id}
          productoActualId={producto.id}
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