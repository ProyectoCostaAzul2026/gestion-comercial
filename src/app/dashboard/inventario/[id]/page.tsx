import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { ListaPreciosCantidad } from '@/components/modulos/precios-cantidad'

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

  // Últimos cambios de precio: la tabla solo la pueden leer los administradores (RLS), así que a un empleado le llega vacía
  const [{ data: cambiosPrecio }, { data: tramos }] = await Promise.all([
    supabase
      .from('historial_precios')
      .select('id, campo, cantidad_minima, precio_anterior, precio_nuevo, origen, created_at, usuario:profiles(nombre_completo)')
      .eq('producto_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('precios_cantidad').select('cantidad_minima, precio_unitario').eq('producto_id', id).order('cantidad_minima'),
  ])
  const preciosCantidad = (tramos ?? []).map(t => ({ cantidad_minima: t.cantidad_minima, precio_unitario: Number(t.precio_unitario) }))
  const ETIQUETA_CAMPO: Record<string, string> = { precio_venta: 'Precio de venta', precio_por_unidad_medida: 'Precio por fracción' }
  const ETIQUETA_ORIGEN: Record<string, string> = { escala: 'Escala de precios', grupo: 'Grupo de medidas', producto: 'Producto' }

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

        {preciosCantidad.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Precios por cantidad</h2>
            <ListaPreciosCantidad tramos={preciosCantidad} precioVenta={Number(producto.precio_venta)} />
          </div>
        )}

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
            Familia de productos
          </Link>
          <Link
            href={`/dashboard/inventario/${producto.id}/grupo`}
            className="block w-full rounded-xl border border-white/20 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/5"
          >
            Grupo de medidas
          </Link>
        </div>

        {(cambiosPrecio ?? []).length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Últimos cambios de precio</h2>
            <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[#111820]">
              {cambiosPrecio!.map(c => {
                const usuario = c.usuario as { nombre_completo: string } | null
                return (
                  <li key={c.id} className="px-3 py-2 text-xs">
                    <p className="text-white">
                      {c.campo === 'precio_cantidad'
                        ? `Precio desde ${c.cantidad_minima ?? '?'} unidades`
                        : ETIQUETA_CAMPO[c.campo] ?? c.campo}: de{' '}
                      {c.precio_anterior != null ? `$${Number(c.precio_anterior).toLocaleString('es-CO')}` : 'sin precio'} a{' '}
                      {c.precio_nuevo != null ? `$${Number(c.precio_nuevo).toLocaleString('es-CO')}` : 'sin precio'}
                    </p>
                    <p className="text-steel-500">
                      {new Date(c.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}{ETIQUETA_ORIGEN[c.origen] ?? c.origen}
                      {usuario?.nombre_completo ? ` · ${usuario.nombre_completo}` : ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}