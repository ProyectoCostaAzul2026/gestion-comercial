import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ConteoInventario } from '@/components/modulos/conteo-inventario'

export default async function ConteoInventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: productos, error }, { data: categorias }] = await Promise.all([
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('productos')
        .select('id, codigo, nombre, marca, unidad_medida, ubicacion, categoria_id, familia_id, caracteristica, stock_almacen, stock_bodega, peso_unitario_g, vender_por_fraccion')
        .eq('activo', true)
        .order('nombre')
        .order('id')
        .range(filaDesde, filaHasta)
    ),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
  ])

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b border-white/10 bg-[#0a0e14] px-4 py-3 lg:top-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventario" aria-label="Volver al inventario" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Conteo de inventario</h1>
            <p className="text-xs text-steel-300">Escribe lo que hay en almacén y bodega, o pésalo</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl p-4">
        {error && (
          <p className="mb-3 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">Error al cargar productos: {error.message}</p>
        )}
        <ConteoInventario
          productos={(productos ?? []).map(p => ({ ...p, peso_unitario_g: p.peso_unitario_g === null ? null : Number(p.peso_unitario_g) }))}
          categorias={categorias ?? []}
          inicial={{ texto: sp.q, categoria: sp.categoria }}
        />
      </div>
    </div>
  )
}
