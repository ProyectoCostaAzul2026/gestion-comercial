import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ServiciosTable } from '@/components/modulos/servicios-table'
import { bogotaEnDias, hoyBogota } from '@/lib/fechas'

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; q?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = hoyBogota()
  const hace30 = bogotaEnDias(-30)
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
        <BotonAtras href="/dashboard/ventas" />
        <div>
          <h1 className="text-2xl font-bold text-tinta">Servicios realizados</h1>
          <p className="mt-0.5 text-xs text-steel-300">{servicios?.length ?? 0} servicios en el período</p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-sale">
          Error al cargar servicios: {error.message}
        </p>
      )}

      <ServiciosTable servicios={(servicios as any) ?? []} desde={desde} hasta={hasta} />
    </div>
  )
}