import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre_completo, rol, telefono, salario_base, activo')
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

  const listaCompleta = (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Salario base</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(empleados ?? []).map((e: any) => (
              <TableRow key={e.id} className="border-white/8 hover:bg-white/5">
                <TableCell className="text-xs font-medium text-white">{e.nombre_completo}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${e.rol === 'administrador' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
                    {e.rol === 'administrador' ? 'Administrador' : 'Empleado'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-steel-300">{e.telefono ?? '—'}</TableCell>
                <TableCell className="text-right font-display text-sm font-bold text-white">
                  {e.salario_base ? `$${Number(e.salario_base).toLocaleString('es-CO')}` : '—'}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${e.activo ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/empleados/${e.id}`}
                    className="text-xs text-brand-blue hover:underline">
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(empleados ?? []).length === 0 && (
        <p className="p-8 text-center text-sm text-steel-500">No hay empleados registrados.</p>
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
      />
    </div>
  )
}