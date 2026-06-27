import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ServiciosTable } from '@/components/modulos/servicios-table'

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; q?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date().toISOString().slice(0, 10)
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const desde = sp.desde || hace30
  const hasta = sp.hasta || hoy

  const { data: servicios, error } = await supabase
    .from('venta_servicios')
    .select(`
      id, nombre_servicio, precio_aplicado, created_at,
      ventas!inner(
        id, numero_ticket, fecha, estado,
        clientes(nombre),
        empleado:profiles!empleado_id(nombre_completo)
      )
    `)
    .gte('ventas.fecha', desde)
    .lte('ventas.fecha', hasta)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/ventas" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">Servicios realizados</h1>
          <p className="mt-1 text-sm text-steel-500">{servicios?.length ?? 0} servicios en el período</p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-brand-red-soft p-4 text-sm text-brand-red">
          Error al cargar servicios: {error.message}
        </p>
      )}

      <ServiciosTable servicios={(servicios as any) ?? []} desde={desde} hasta={hasta} />
    </div>
  )
}