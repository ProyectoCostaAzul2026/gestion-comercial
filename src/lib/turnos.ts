// Quién trabaja hoy: empleados activos con turno en el día de la semana y sin permiso para esa fecha.
// Lo usan el Inicio, Caja y Nómina para contar la nómina pendiente con la misma regla.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

/** Día de la semana de una fecha AAAA-MM-DD, como lo guarda `horario_laboral.dia_semana` (sin tildes) */
export function diaSemana(fecha: string): (typeof DIAS)[number] {
  const [a, m, d] = fecha.split('-').map(Number)
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
}

/** Ids de los empleados activos que tienen turno en esa fecha y no sacaron permiso */
export async function empleadosEnTurno(supabase: SupabaseClient<Database>, fecha: string): Promise<string[]> {
  const [{ data: turnos }, { data: permisos }, { data: activos }] = await Promise.all([
    supabase.from('horario_laboral').select('empleado_id').eq('activo', true).eq('dia_semana', diaSemana(fecha)),
    supabase.from('permisos_empleado').select('empleado_id').eq('fecha', fecha),
    supabase.from('profiles').select('id').eq('activo', true),
  ])
  const conPermiso = new Set((permisos ?? []).map(p => p.empleado_id))
  const deActivos = new Set((activos ?? []).map(p => p.id))
  return [...new Set((turnos ?? []).map(t => t.empleado_id))].filter(id => deActivos.has(id) && !conPermiso.has(id))
}
