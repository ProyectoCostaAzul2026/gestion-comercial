import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HorarioSemanal } from '@/components/modulos/horario-semanal'
import { PermisosEmpleados, type PermisoVista } from '@/components/modulos/permisos-empleados'

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

  // Permisos desde el lunes de esta semana (para marcarlos en la vista semanal) en adelante
  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const lunes = new Date(fechaHoy + 'T12:00:00')
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  const { data: permisos } = await supabase
    .from('permisos_empleado')
    .select('id, empleado_id, fecha, motivo, profiles!permisos_empleado_empleado_id_fkey(nombre_completo)')
    .gte('fecha', lunes.toISOString().slice(0, 10))
    .order('fecha')
    .order('id')
    .limit(500)

  const listaPermisos: PermisoVista[] = (permisos ?? []).map(p => ({
    id: p.id,
    empleado_id: p.empleado_id,
    fecha: p.fecha,
    motivo: p.motivo,
    nombre: p.profiles?.nombre_completo ?? 'Empleado',
  }))

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <h1 className="font-display text-3xl font-bold text-brand-yellow">Horario Laboral</h1>
        <p className="mt-0.5 text-xs text-steel-300">
          Vista semanal de turnos asignados
        </p>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>
      <HorarioSemanal
        turnos={(turnos as any) ?? []}
        empleados={empleados ?? []}
        esAdmin={esAdmin}
        fechaHoy={fechaHoy}
        permisos={listaPermisos}
      />
      <PermisosEmpleados
        permisos={listaPermisos}
        empleados={empleados ?? []}
        esAdmin={esAdmin}
        usuarioId={user.id}
        fechaHoy={fechaHoy}
      />
    </div>
  )
}