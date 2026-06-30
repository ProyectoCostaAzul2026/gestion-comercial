import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AgotadosTable, type ProductoAgotado } from '@/components/modulos/agotados-table'

export default async function AgotadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data, error }, { data: todosProveedores }] = await Promise.all([
    supabase
      .from('productos')
      .select(`
        id, nombre, codigo, marca, unidad_medida, prioridad, stock_actual, stock_minimo, stock_bodega, stock_almacen,
        producto_proveedores(precio_costo, proveedor_id, proveedores(id, nombre))
      `)
      .eq('activo', true),
    supabase
      .from('proveedores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
  ])

  const productos: ProductoAgotado[] = (data ?? [])
    .filter((p: any) => p.stock_actual <= p.stock_minimo)
    .map((p: any) => {
      const ordenados = [...(p.producto_proveedores ?? [])].sort((a: any, b: any) => a.precio_costo - b.precio_costo)
      return {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo ?? '—',
        marca: p.marca,
        unidad_medida: p.unidad_medida,
        prioridad: p.prioridad,
        stock_actual: p.stock_actual,
        stock_bodega: p.stock_bodega ?? 0,
        stock_almacen: p.stock_almacen ?? 0,
        proveedor1: ordenados[0]?.proveedores?.nombre ?? null,
        proveedor2: ordenados[1]?.proveedores?.nombre ?? null,
      }
    })

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventario" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Productos en bajo stock o agotados</h1>
            <p className="text-xs text-steel-300">{productos.length} productos</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <p className="mb-4 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
            Error al cargar productos: {error.message}
          </p>
        )}
        <AgotadosTable productos={productos} proveedores={todosProveedores ?? []} />
      </div>
    </div>
  )
}