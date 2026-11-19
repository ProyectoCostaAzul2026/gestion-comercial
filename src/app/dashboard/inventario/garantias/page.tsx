import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
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
        <BotonAtras href="/dashboard/inventario" />
        <div>
          <h1 className="text-2xl font-bold text-tinta">Garantías</h1>
          <p className="text-xs text-steel-300">{(garantias as any[] ?? []).filter((g: any) => g.estado === 'pendiente').length} pendientes</p>
        </div>
      </div>
      <GarantiasPanel
        garantias={(garantias as any) ?? []}
        proveedores={proveedores ?? []}
      />
    </div>
  )
}