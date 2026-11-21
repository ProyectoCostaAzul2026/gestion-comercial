import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HorarioSemanal } from '@/components/modulos/horario-semanal'
import { PermisosEmpleados, type PermisoVista } from '@/components/modulos/permisos-empleados'
import { EmpleadosSecciones } from '@/components/modulos/empleados-secciones'

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
    .select('id, empleado_id, dia_semana, hora_inicio, hora_fin, activo, profiles(nombre_completo, foto_url)')
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
      <div className="relative py-1">
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">Horario y permisos</h1>
        <p className="mt-0.5 text-xs text-steel-300">
          Turnos de la semana, festivos y días de permiso
        </p>
      </div>
      <EmpleadosSecciones actual="horario" esAdmin={esAdmin} />
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