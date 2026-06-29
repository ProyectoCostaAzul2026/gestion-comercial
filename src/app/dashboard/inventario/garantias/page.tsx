import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { GarantiasPanel } from '@/components/modulos/garantias-panel'

export default async function GarantiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: garantias }, { data: proveedores }] = await Promise.all([
    (supabase as any)
      .from('garantias')
      .select('id, nombre_producto, cantidad, observaciones, fecha_registro, estado, proveedores(nombre), productos(id)')
      .order('fecha_registro', { ascending: false }),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inventario" className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Garantías</h1>
<p className="text-sm text-slate-500">{(garantias as any[] ?? []).filter((g: any) => g.estado === 'pendiente').length} pendientes</p>
        </div>
      </div>
      <GarantiasPanel
        garantias={(garantias as any) ?? []}
        proveedores={proveedores ?? []}
      />
    </div>
  )
}