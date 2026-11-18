import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { NominaNuevaForm } from '@/components/modulos/nomina-nueva-form'
import { hoyBogota } from '@/lib/fechas'

export default async function NuevaNominaPage({
  searchParams,
}: {
  searchParams: Promise<{
    empleado?: string
    fecha?: string
    horas?: string
    salario?: string
  }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empleados } = await supabase
    .from('profiles')
    .select('id, nombre_completo, salario_base')
    .eq('activo', true)
    .order('nombre_completo')

  const hoy = hoyBogota()

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <BotonAtras href="/dashboard/nomina" />
        <h1 className="font-display text-2xl font-bold text-white">Registrar pago de nómina</h1>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-6">
        <NominaNuevaForm
          empleados={empleados ?? []}
          inicial={{
            empleado_id: sp.empleado ?? '',
            fecha: sp.fecha ?? hoy,
            horas_trabajadas: sp.horas ? parseFloat(sp.horas) : null,
            salario_base: sp.salario ? parseFloat(sp.salario) : null,
          }}
        />
      </div>
    </div>
  )
}