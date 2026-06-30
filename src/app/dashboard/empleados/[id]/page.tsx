import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmpleadoFiltros } from '@/components/modulos/empleado-filtros'

export default async function PerfilEmpleadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    venta_desde?: string
    venta_hasta?: string
    nomina_desde?: string
    nomina_hasta?: string
  }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empleado, error } = await supabase
    .from('profiles')
    .select('id, nombre_completo, rol, telefono, salario_base, activo, created_at')
    .eq('id', id)
    .single()

  if (error || !empleado) notFound()

  const hoy = new Date().toISOString().slice(0, 10)
  const inicioMes = hoy.slice(0, 8) + '01'

  // Ventas
  let ventasQuery = supabase
    .from('ventas')
    .select('id, numero_ticket, fecha, total, tipo_pago, estado')
    .eq('empleado_id', id)
    .order('fecha', { ascending: false })
    .limit(50)

  if (sp.venta_desde) ventasQuery = ventasQuery.gte('fecha', sp.venta_desde)
  if (sp.venta_hasta) ventasQuery = ventasQuery.lte('fecha', sp.venta_hasta)

  // Nóminas
  let nominasQuery = supabase
    .from('nominas')
    .select('id, periodo_inicio, periodo_fin, total_pago, estado, fecha_pago, horas_trabajadas')
    .eq('empleado_id', id)
    .order('periodo_inicio', { ascending: false })

  if (sp.nomina_desde) nominasQuery = nominasQuery.gte('periodo_inicio', sp.nomina_desde)
  if (sp.nomina_hasta) nominasQuery = nominasQuery.lte('periodo_inicio', sp.nomina_hasta)

  const [{ data: ventas }, { data: nominas }, { data: ventasHoy }, { data: ventasMes }] = await Promise.all([
    ventasQuery,
    nominasQuery,
    supabase
      .from('ventas')
      .select('total')
      .eq('empleado_id', id)
      .eq('fecha', hoy)
      .in('estado', ['completada', 'modificada']),
    supabase
      .from('ventas')
      .select('total')
      .eq('empleado_id', id)
      .gte('fecha', inicioMes)
      .lte('fecha', hoy)
      .in('estado', ['completada', 'modificada']),
  ])

  const totalVentasHoy = (ventasHoy ?? []).reduce((s, v) => s + Number(v.total), 0)
  const numVentasHoy = ventasHoy?.length ?? 0
  const totalVentasMes = (ventasMes ?? []).reduce((s, v) => s + Number(v.total), 0)
  const numVentasMes = ventasMes?.length ?? 0

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/empleados" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4 text-white" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">{empleado.nombre_completo}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${empleado.activo ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
              {empleado.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-xs capitalize text-steel-300">{empleado.rol}</p>
        </div>
        <Link href={`/dashboard/empleados/${id}/editar`}
          className="rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2 text-sm text-white hover:bg-white/5">
          Editar
        </Link>
      </div>

      {/* Datos */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Información</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Teléfono</dt>
            <dd className="font-medium text-white">{empleado.telefono ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Salario base diario</dt>
            <dd className="font-medium text-white">
              {empleado.salario_base
                ? `$${Number(empleado.salario_base).toLocaleString('es-CO')}`
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* KPIs de ventas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-yellow bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ventas hoy</p>
          <p className="mt-1 font-display text-2xl font-black text-white">
            ${totalVentasHoy.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-steel-300">{numVentasHoy} transacciones</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ventas este mes</p>
          <p className="mt-1 font-display text-2xl font-black text-white">
            ${totalVentasMes.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-steel-300">{numVentasMes} transacciones</p>
        </div>
      </div>

      {/* Historial de ventas con filtros */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Ventas ({(ventas ?? []).length})
        </h2>
        <EmpleadoFiltros
          desdeKey="venta_desde"
          hastaKey="venta_hasta"
          desdeValue={sp.venta_desde ?? ''}
          hastaValue={sp.venta_hasta ?? ''}
        />
        {(ventas ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-steel-500">Sin ventas en este período.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead>Ticket</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ventas ?? []).map(v => (
                  <TableRow key={v.id} className="border-white/8 hover:bg-white/5">
                    <TableCell>
                      <Link href={`/dashboard/ventas/${v.id}`}
                        className="text-xs text-brand-blue hover:underline">
                        #{v.numero_ticket}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-steel-300">{v.fecha}</TableCell>
                    <TableCell className="text-right font-display text-sm font-bold text-white">${Number(v.total).toLocaleString('es-CO')}</TableCell>
                    <TableCell className="text-xs capitalize text-steel-300">{v.tipo_pago}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${v.estado === 'anulada' ? 'border-brand-red/30 bg-brand-red/20 text-brand-red' : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'}`}>
                        {v.estado}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Historial de nóminas con filtros */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Nóminas ({(nominas ?? []).length})
        </h2>
        <EmpleadoFiltros
          desdeKey="nomina_desde"
          hastaKey="nomina_hasta"
          desdeValue={sp.nomina_desde ?? ''}
          hastaValue={sp.nomina_hasta ?? ''}
        />
        {(nominas ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-steel-500">Sin nóminas en este período.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Total pagado</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(nominas ?? []).map(n => (
                  <TableRow key={n.id} className="border-white/8 hover:bg-white/5">
                    <TableCell className="text-xs text-steel-300">{n.periodo_inicio}</TableCell>
                    <TableCell className="text-right text-xs text-steel-300">
                      {n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-display text-sm font-bold text-white">
                      ${Number(n.total_pago).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${n.estado === 'pagada' ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'}`}>
                        {n.estado}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}