import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductoForm } from '@/components/modulos/producto-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()

  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventario" className="rounded-md border p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Nuevo Producto</h1>
          </div>
        </div>
      </div>
      <div className="p-4">
        <ProductoForm
          categorias={categorias ?? []}
          proveedores={proveedores ?? []}
          empleadoId={user.id}
          isSheet={false}
          rol={(profile?.rol as 'empleado' | 'administrador') ?? 'empleado'}
        />
      </div>
    </div>
  )
}