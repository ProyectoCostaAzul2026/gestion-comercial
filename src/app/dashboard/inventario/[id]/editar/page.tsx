import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ProductoForm } from '@/components/modulos/producto-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()

  const { data: producto, error } = await supabase
    .from('productos')
    .select(`
      id, nombre, descripcion, codigo, categoria_id, marca, ubicacion, precio_venta,
      precio_costo_base,
      tiene_iva, iva_incluido, porcentaje_iva, stock_bodega, stock_almacen, stock_minimo,
      prioridad, unidad_medida, imagen_url,
      vender_por_fraccion, medida_venta, cantidad_total_unidad,
      cantidad_minima_venta, precio_por_unidad_medida,
      producto_proveedores ( id, proveedor_id, precio_costo, referencia_proveedor, notas )
    `)
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventario" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Editar Producto</h1>
            <p className="text-xs text-steel-300">{producto.nombre}</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl p-4">
        <ProductoForm
          categorias={categorias ?? []}
          proveedores={proveedores ?? []}
          empleadoId={user.id}
          producto={{
            ...producto,
            precio_costo_base: producto.precio_costo_base ?? 0,
            proveedores: producto.producto_proveedores ?? [],
          }}
          isSheet={false}
          rol={(profile?.rol as 'empleado' | 'administrador') ?? 'empleado'}
        />
      </div>
    </div>
  )
}