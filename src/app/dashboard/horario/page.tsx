import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HorarioSemanal } from '@/components/modulos/horario-semanal'

export default async function HorarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const esAdmin = profile?.rol === 'administrador'

  const { data: empleados } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('activo', true)
    .order('nombre_completo')

  const { data: turnos } = await supabase
    .from('horario_laboral')
    .select('id, empleado_id, dia_semana, hora_inicio, hora_fin, activo, profiles(nombre_completo)')
    .eq('activo', true)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Horario Laboral</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vista semanal de turnos asignados
        </p>
      </div>
      <HorarioSemanal
        turnos={(turnos as any) ?? []}
        empleados={empleados ?? []}
        esAdmin={esAdmin}
        fechaHoy={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}
      />
    </div>
  )
}