import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, Phone, Plus } from 'lucide-react'
import { AvatarIniciales, telefonoMarcable } from '@/components/modulos/avatar-iniciales'
import { NominaTable } from '@/components/modulos/nomina-table'
import { HorarioSemanal } from '@/components/modulos/horario-semanal'
import { EmpleadosTabs } from '@/components/modulos/empleados-tabs'

export default async function EmpleadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  const esAdmin = profile?.rol === 'administrador'

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

  const [
    { data: empleados },
    { data: nominasHoy },
    { data: historial },
    { data: turnos },
    { data: permisosHoy },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre_completo, rol, telefono, salario_base, activo, foto_url')
      .order('nombre_completo'),

    supabase
      .from('nominas')
      .select('id, empleado_id, total_pago, estado, horas_trabajadas')
      .eq('periodo_inicio', hoy)
      .eq('periodo_fin', hoy),

    supabase
      .from('nominas')
      .select(`
        id, periodo_inicio, periodo_fin, total_pago, estado,
        salario_base, horas_trabajadas, bonificaciones, deducciones, notas,
        profiles(nombre_completo)
      `)
      .order('periodo_inicio', { ascending: false })
      .limit(100),

    supabase
      .from('horario_laboral')
      .select('id, empleado_id, dia_semana, hora_inicio, hora_fin, activo, profiles(nombre_completo)')
      .eq('activo', true),

    supabase.from('permisos_empleado').select('empleado_id').eq('fecha', hoy),
  ])

  const empleadosActivos = (empleados ?? []).filter((e: any) => e.activo)

  const empleadosParaNomina = empleadosActivos.map((e: any) => ({
    id: e.id,
    nombre_completo: e.nombre_completo,
    salario_base: Number(e.salario_base ?? 0),
    activo: e.activo,
    nominaHoy: (nominasHoy ?? []).find((n: any) => n.empleado_id === e.id) ?? null,
    turnosSemana: (turnos ?? []).filter((t: any) => t.empleado_id === e.id),
  }))

  const empleadosParaHorario = empleadosActivos.map((e: any) => ({
    id: e.id,
    nombre_completo: e.nombre_completo,
  }))

  // Día de hoy en Bogotá, como lo guarda horario_laboral.dia_semana (sin tildes)
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const diaHoy = DIAS[new Date(`${hoy}T12:00:00`).getDay()]
  const hora = (h: string) => h.slice(0, 5)
  const turnoDeHoy = (empleadoId: string) => (turnos ?? [])
    .filter(t => t.empleado_id === empleadoId && t.dia_semana === diaHoy)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    .map(t => `${hora(t.hora_inicio)} a ${hora(t.hora_fin)}`)
    .join(', ')

  const listaCompleta = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(empleados ?? []).map((e: any) => {
          const turno = turnoDeHoy(e.id)
          return (
            <div key={e.id}
              className={`relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111820] p-4 transition hover:border-brand-yellow/50 ${e.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <AvatarIniciales nombre={e.nombre_completo} foto={e.foto_url} />
                <div className="min-w-0 flex-1">
                  {/* El enlace cubre toda la tarjeta; el teléfono queda encima para poder llamar */}
                  <Link href={`/dashboard/empleados/${e.id}`}
                    className="line-clamp-2 text-sm font-bold text-white after:absolute after:inset-0 after:rounded-2xl">
                    {e.nombre_completo}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${e.rol === 'administrador' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
                      {e.rol === 'administrador' ? 'Administrador' : 'Empleado'}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${e.activo ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-steel-300">
                {e.telefono && (
                  <a href={`tel:${telefonoMarcable(e.telefono)}`}
                    className="relative z-10 inline-flex items-center gap-1.5 text-brand-blue hover:underline">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />{e.telefono}
                  </a>
                )}
                {e.activo && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {turno ? `Hoy de ${turno}` : 'Hoy no tiene turno'}
                  </p>
                )}
              </div>

              <div className="mt-auto border-t border-white/10 pt-3">
                <p className="text-[10px] uppercase tracking-wide text-steel-500">Salario base</p>
                <p className="font-display text-lg font-bold text-white">
                  {e.salario_base ? `$${Number(e.salario_base).toLocaleString('es-CO')}` : '—'}
                </p>
              </div>
            </div>
          )
        })}
        {esAdmin && (
          <Link href="/dashboard/empleados/nuevo"
            className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-yellow/40 p-3 text-center text-sm font-bold text-brand-yellow hover:border-brand-yellow hover:bg-brand-yellow/5">
            <Plus className="h-8 w-8" aria-hidden />
            Agregar empleado
          </Link>
        )}
      </div>
      {(empleados ?? []).length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500">No hay empleados registrados.</p>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-yellow">Empleados</h1>
            <p className="mt-0.5 text-xs text-steel-300">{empleados?.length ?? 0} registrados · {hoy}</p>
          </div>
          {esAdmin && (
            <Link href="/dashboard/empleados/nuevo"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105">
              <Plus className="h-4 w-4" />Agregar empleado
            </Link>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      <EmpleadosTabs
        listaCompleta={listaCompleta}
        empleadosParaNomina={empleadosParaNomina}
        historial={(historial as any) ?? []}
        turnos={(turnos as any) ?? []}
        empleadosParaHorario={empleadosParaHorario}
        fechaHoy={hoy}
        esAdmin={esAdmin}
        permisosHoy={(permisosHoy ?? []).map(p => p.empleado_id)}
      />
    </div>
  )
}