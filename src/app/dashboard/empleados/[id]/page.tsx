import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
        <Link href="/dashboard/empleados" className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{empleado.nombre_completo}</h1>
            <Badge variant={empleado.activo ? 'default' : 'secondary'}>
              {empleado.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 capitalize">{empleado.rol}</p>
        </div>
        <Link href={`/dashboard/empleados/${id}/editar`}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
          Editar
        </Link>
      </div>

      {/* Datos */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Información</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Teléfono</dt>
            <dd className="font-medium">{empleado.telefono ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Salario base diario</dt>
            <dd className="font-medium">
              {empleado.salario_base
                ? `$${Number(empleado.salario_base).toLocaleString('es-CO')}`
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* KPIs de ventas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Ventas hoy</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            ${totalVentasHoy.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-slate-400">{numVentasHoy} transacciones</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Ventas este mes</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            ${totalVentasMes.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-slate-400">{numVentasMes} transacciones</p>
        </div>
      </div>

      {/* Historial de ventas con filtros */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">
          Ventas ({(ventas ?? []).length})
        </h2>
        <EmpleadoFiltros
          desdeKey="venta_desde"
          hastaKey="venta_hasta"
          desdeValue={sp.venta_desde ?? ''}
          hastaValue={sp.venta_hasta ?? ''}
        />
        {(ventas ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 mt-3">Sin ventas en este período.</p>
        ) : (
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ventas ?? []).map(v => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link href={`/dashboard/ventas/${v.id}`}
                      className="text-slate-600 hover:underline">
                      #{v.numero_ticket}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-500">{v.fecha}</TableCell>
                  <TableCell className="text-right">${Number(v.total).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-slate-500 capitalize">{v.tipo_pago}</TableCell>
                  <TableCell>
                    <Badge variant={v.estado === 'anulada' ? 'destructive' : 'default'}>
                      {v.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Historial de nóminas con filtros */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">
          Nóminas ({(nominas ?? []).length})
        </h2>
        <EmpleadoFiltros
          desdeKey="nomina_desde"
          hastaKey="nomina_hasta"
          desdeValue={sp.nomina_desde ?? ''}
          hastaValue={sp.nomina_hasta ?? ''}
        />
        {(nominas ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 mt-3">Sin nóminas en este período.</p>
        ) : (
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Total pagado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(nominas ?? []).map(n => (
                <TableRow key={n.id}>
                  <TableCell className="text-slate-500">{n.periodo_inicio}</TableCell>
                  <TableCell className="text-right text-slate-500">
                    {n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(n.total_pago).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.estado === 'pagada' ? 'default' : 'secondary'}>
                      {n.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}