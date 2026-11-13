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

  // Quién tiene permiso hoy: no asiste y no entra en el pago del día
  const { data: permisosHoy } = await supabase.from('permisos_empleado').select('empleado_id').eq('fecha', hoy)

  const { data: turnos } = await supabase
    .from('horario_laboral')
    .select('empleado_id, dia_semana, hora_inicio, hora_fin')
    .eq('activo', true)

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] py-3 pl-4 pr-14 md:py-4 md:pr-28">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-yellow md:text-3xl">Nómina</h1>
            <p className="mt-0.5 text-xs text-steel-300">Pago diario de empleados</p>
          </div>
          <Link
            href="/dashboard/nomina/nueva"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Registrar pago
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 overflow-hidden md:w-24">
          <div className="absolute inset-y-0 right-0 w-9 -skew-x-12 translate-x-4 bg-brand-yellow/80 md:w-20 md:translate-x-8" />
          <div className="absolute inset-y-0 right-0 w-3 -skew-x-12 translate-x-1 bg-brand-blue md:w-7" />
        </div>
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
        permisosHoy={(permisosHoy ?? []).map(p => p.empleado_id)}
      />
    </div>
  )
}