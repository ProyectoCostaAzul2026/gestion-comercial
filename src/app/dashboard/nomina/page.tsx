import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { NominaTable } from '@/components/modulos/nomina-table'

export default async function NominaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

  const { data: empleados } = await supabase
    .from('profiles')
    .select('id, nombre_completo, salario_base, activo')
    .eq('activo', true)
    .order('nombre_completo')

  const { data: nominasHoy } = await supabase
    .from('nominas')
    .select('id, empleado_id, total_pago, estado, horas_trabajadas')
    .eq('periodo_inicio', hoy)
    .eq('periodo_fin', hoy)

  const { data: historial } = await supabase
    .from('nominas')
    .select(`
      id, periodo_inicio, periodo_fin, total_pago, estado,
      salario_base, horas_trabajadas, bonificaciones, deducciones, notas,
      profiles(nombre_completo)
    `)
    .order('periodo_inicio', { ascending: false })
    .limit(50)

  const { data: turnos } = await supabase
    .from('horario_laboral')
    .select('empleado_id, dia_semana, hora_inicio, hora_fin')
    .eq('activo', true)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nómina</h1>
          <p className="mt-1 text-sm text-slate-500">Pago diario de empleados</p>
        </div>
        <Link
          href="/dashboard/nomina/nueva"
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Registrar pago
        </Link>
      </div>

      <NominaTable
        empleados={(empleados ?? []).map(e => ({
          ...e,
          salario_base: Number(e.salario_base ?? 0),
          nominaHoy: (nominasHoy ?? []).find(n => n.empleado_id === e.id) ?? null,
          turnosSemana: (turnos ?? []).filter(t => t.empleado_id === e.id),
        }))}
        historial={(historial as any) ?? []}
        fechaHoy={hoy}
      />
    </div>
  )
}