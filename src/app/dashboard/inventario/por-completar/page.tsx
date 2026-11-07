import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Pencil } from 'lucide-react'
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
    .select('id, nombre, codigo, precio_venta, stock_actual, categoria_id, familia_id, created_at, producto_proveedores(precio_costo)')
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
        <Link href="/dashboard/inventario" className="rounded-xl border border-white/20 p-2 hover:bg-white/5" aria-label="Volver al inventario">
          <ArrowLeft className="h-4 w-4 text-white" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <ClipboardList className="h-5 w-5 text-brand-yellow" />Productos por completar
          </h1>
          <p className="text-xs text-steel-300">{productos.length} producto{productos.length === 1 ? '' : 's'} de alta rápida</p>
        </div>
      </div>

      <p className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3 text-xs text-brand-yellow">
        Se crearon desde Nueva venta solo con nombre y precio. En Editar producto escribe el nombre como &quot;Familia - Característica&quot;,
        elige la categoría y agrega el proveedor con su costo: al guardar, el producto sale de esta lista.
      </p>

      {error && <p className="text-sm text-brand-red">No se pudieron cargar: {error.message}</p>}

      {productos.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500">No hay productos por completar.</p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          {productos.map(p => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{p.nombre}</p>
                <p className="text-[11px] text-steel-300">
                  <span className="font-mono text-brand-yellow">{p.codigo ?? '—'}</span> · ${Number(p.precio_venta).toLocaleString('es-CO')} · Stock {p.stock_actual}
                </p>
                <p className="text-[11px] text-brand-red">Falta: {p.faltan.join(', ')}</p>
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
