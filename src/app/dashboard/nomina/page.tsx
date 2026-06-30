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
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-yellow">Nómina</h1>
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
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
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
      />
    </div>
  )
}