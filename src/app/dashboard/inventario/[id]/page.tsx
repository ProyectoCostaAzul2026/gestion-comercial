import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'

export default async function DetalleProductoPage({
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
      id, nombre, descripcion, codigo, marca, ubicacion,
      precio_venta, precio_costo_base, margen_calculado,
      tiene_iva, iva_incluido, porcentaje_iva,
      stock_bodega, stock_almacen, stock_actual, stock_minimo,
      prioridad, unidad_medida, imagen_url,
      categorias_producto(nombre)
    `)
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  const categoriaNombre = (producto.categorias_producto as { nombre: string } | null)?.nombre ?? '—'

  const filas: [string, string][] = [
    ['Código', producto.codigo ?? '—'],
    ['Marca', producto.marca ?? '—'],
    ['Categoría', categoriaNombre],
    ['Medida', producto.unidad_medida ?? '—'],
    ['Ubicación', producto.ubicacion ?? '—'],
    ['Descripción', producto.descripcion ?? '—'],
    ['Precio de venta', `$${Number(producto.precio_venta).toLocaleString('es-CO')}`],
    ['Costo base', producto.precio_costo_base != null ? `$${Number(producto.precio_costo_base).toLocaleString('es-CO')}` : '—'],
    ['Margen calculado', producto.margen_calculado != null ? `${Number(producto.margen_calculado).toFixed(1)}%` : '—'],
    ['IVA', producto.tiene_iva ? `${producto.porcentaje_iva}% (${producto.iva_incluido ? 'incluido en el costo' : 'no incluido'})` : 'No aplica'],
    ['Stock Bodega', String(producto.stock_bodega)],
    ['Stock Almacén', String(producto.stock_almacen)],
    ['Stock total', String(producto.stock_actual)],
    ['Stock mínimo', String(producto.stock_minimo)],
    ['Prioridad', String(producto.prioridad)],
  ]

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventario" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">{producto.nombre}</h1>
            <p className="text-xs text-steel-300">Detalle del producto</p>
          </div>
        </div>
      </div>

      <div className="max-w-md space-y-6 p-4">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="mx-auto h-48 w-48 rounded-2xl border border-white/10 object-cover"
          />
        ) : (
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border border-white/10 bg-[#1a2430]">
            <Package className="size-16 text-brand-yellow/50" />
          </div>
        )}

        <dl className="space-y-3 text-sm">
          {filas.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-white/8 pb-2">
              <dt className="text-steel-300">{label}</dt>
              <dd className="text-right font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-2">
          <Link
            href={`/dashboard/inventario/${producto.id}/editar`}
            className="block w-full rounded-xl bg-brand-yellow px-4 py-3 text-center text-sm font-bold text-steel-900 hover:brightness-105"
          >
            Editar producto
          </Link>
          <Link
            href={`/dashboard/inventario/${producto.id}/familia`}
            className="block w-full rounded-xl border border-brand-blue/60 px-4 py-3 text-center text-sm font-bold text-brand-blue hover:bg-brand-blue/10"
          >
            Familia de medidas
          </Link>
        </div>
      </div>
    </div>
  )
}