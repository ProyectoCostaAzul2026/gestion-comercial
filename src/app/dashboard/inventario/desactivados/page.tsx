import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductosDesactivadosPanel, type ProductoDesactivado } from '@/components/modulos/productos-desactivados-panel'

export default async function ProductosDesactivadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'administrador') redirect('/dashboard')

  const { data: inactivos } = await supabase
    .from('productos')
    .select('id, codigo, nombre, unidad_medida, marca, updated_at')
    .eq('activo', false)
    .order('updated_at', { ascending: false })

  const ids = (inactivos ?? []).map(p => p.id)

  const idsConVentas = new Set<string>()
  if (ids.length > 0) {
    const { data: itemsVendidos } = await supabase
      .from('venta_items')
      .select('producto_id')
      .in('producto_id', ids)
    for (const row of itemsVendidos ?? []) {
      if (row.producto_id) idsConVentas.add(row.producto_id)
    }
  }

  const conRegistros: ProductoDesactivado[] = []
  const sinRegistros: ProductoDesactivado[] = []
  for (const p of inactivos ?? []) {
    const item: ProductoDesactivado = {
      id: p.id, codigo: p.codigo, nombre: p.nombre,
      unidad_medida: p.unidad_medida, marca: p.marca, updated_at: p.updated_at,
    }
    if (idsConVentas.has(p.id)) conRegistros.push(item)
    else sinRegistros.push(item)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inventario" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4 text-white" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Productos Desactivados</h1>
          <p className="text-xs text-steel-300">{(inactivos ?? []).length} producto(s) inactivo(s) en total</p>
        </div>
      </div>

      <ProductosDesactivadosPanel conRegistros={conRegistros} sinRegistros={sinRegistros} />
    </div>
  )
}