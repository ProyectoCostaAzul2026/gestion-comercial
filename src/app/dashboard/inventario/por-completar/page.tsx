import { createClient } from '@/lib/supabase/server'
import { MiniaturaProducto, ProductoConFoto, EnlaceA } from '@/components/ui/producto-miniatura'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ClipboardList, Pencil } from 'lucide-react'
import { faltantesPorCompletar } from '@/lib/por-completar'

/**
 * Productos creados con el alta rápida de Nueva venta que aún no tienen todos sus datos. Cada uno sale de la lista solo
 * cuando tiene categoría, familia y un proveedor con costo (trigger trg_revisar_por_completar).
 */
export default async function PorCompletarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, codigo, imagen_url, precio_venta, stock_actual, categoria_id, familia_id, created_at, producto_proveedores(precio_costo)')
    .eq('por_completar', true)
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .order('id')
    .limit(1000)

  const productos = (data ?? []).map(p => ({
    ...p,
    faltan: faltantesPorCompletar({
      categoria_id: p.categoria_id,
      familia_id: p.familia_id,
      costos: (p.producto_proveedores ?? []).map(pp => Number(pp.precio_costo)),
    }),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BotonAtras href="/dashboard/inventario" etiqueta="Volver al inventario" />
        <div>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold text-tinta">
            <ClipboardList className="h-5 w-5 text-brand-yellow" />Productos por completar
          </h1>
          <p className="text-xs text-steel-300">{productos.length} producto{productos.length === 1 ? '' : 's'} de alta rápida</p>
        </div>
      </div>

      <p className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3 text-xs text-brand-yellow">
        Se crearon desde Nueva venta solo con nombre y precio. En Editar producto escribe el nombre como &quot;Familia - Característica&quot;,
        elige la categoría y agrega el proveedor con su costo: al guardar, el producto sale de esta lista.
      </p>

      {error && <p className="text-sm text-sale">No se pudieron cargar: {error.message}</p>}

      {productos.length === 0 ? (
        <p className="rounded-2xl border border-linea bg-superficie p-8 text-center text-sm text-steel-500">No hay productos por completar.</p>
      ) : (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-superficie">
          {productos.map(p => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-3">
              <MiniaturaProducto url={(p as any).imagen_url} nombre={p.nombre} tam="sm" />
              <div className="min-w-0 flex-1">
                <EnlaceA href={`/dashboard/inventario/${p.id}`}><span className="truncate text-[15px] font-bold text-tinta">{p.nombre}</span></EnlaceA>
                <p className="text-xs text-steel-300">
                  <span className="font-mono text-brand-yellow">{p.codigo ?? '—'}</span> · ${Number(p.precio_venta).toLocaleString('es-CO')} · Stock {p.stock_actual}
                </p>
                <p className="text-xs text-sale">Falta: {p.faltan.join(', ')}</p>
              </div>
              <Link href={`/dashboard/inventario/${p.id}/editar?volver=por-completar`}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-yellow px-3 text-sm font-bold text-steel-900 hover:brightness-105">
                <Pencil className="h-4 w-4" /> Completar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
