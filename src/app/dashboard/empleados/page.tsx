import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
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
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.nombre_completo}</TableCell>
              <TableCell className="text-slate-500 capitalize">{e.rol}</TableCell>
              <TableCell className="text-slate-500">{e.telefono ?? '—'}</TableCell>
              <TableCell className="text-right">
                {e.salario_base ? `$${Number(e.salario_base).toLocaleString('es-CO')}` : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={e.activo ? 'default' : 'secondary'}>
                  {e.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/dashboard/empleados/${e.id}`}
                  className="text-sm text-slate-500 hover:text-slate-900 hover:underline">
                  Ver
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(empleados ?? []).length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">No hay empleados registrados.</p>
      )}
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="mt-1 text-sm text-slate-500">{empleados?.length ?? 0} registrados · {hoy}</p>
        </div>
        {esAdmin && (
          <Link href="/dashboard/empleados/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" />Agregar empleado
          </Link>
        )}
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