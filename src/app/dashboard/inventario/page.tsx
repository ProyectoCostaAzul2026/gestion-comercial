import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { InventarioTable } from '@/components/modulos/inventario-table'
import { Plus, AlertTriangle } from 'lucide-react'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, codigo, nombre, marca, ubicacion, unidad_medida, precio_venta, stock_actual')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="mt-1 text-sm text-slate-500">{productos?.length ?? 0} productos registrados</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href="/dashboard/inventario/nuevo"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar producto
          </Link>
          <Link
            href="/dashboard/inventario/agotados"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Ver agotados
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          Error al cargar productos: {error.message}
        </p>
      )}

      <InventarioTable productos={productos ?? []} />
    </div>
  )
}