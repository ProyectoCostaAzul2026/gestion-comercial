import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardAdmin } from '@/components/modulos/dashboard-admin'
import { DashboardEmpleado } from '@/components/modulos/dashboard-empleado'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    venta_desde?: string
    venta_hasta?: string
    nomina_desde?: string
    nomina_hasta?: string
  }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre_completo, rol, telefono, salario_base, activo, foto_url, email')
    .eq('id', user.id)
    .single()

  const esAdmin = (profile as any)?.rol === 'administrador'
  const hoy = new Date().toISOString().slice(0, 10)

  const { data: config } = await supabase
    .from('configuracion_negocio')
    .select('nombre, logo_url')
    .maybeSingle()

  if (esAdmin) {
    const [
      { data: ventasHoy },
      { data: pagosHoy },
      { data: nominasHoy },
      { data: empleadosActivos },
      { data: ultimasVentas },
      { data: productosAgotados },
      { data: facturasPendientes },
      { data: pagosProgramados },
      { data: cajaMayor },
    ] = await Promise.all([
      supabase.from('ventas').select('id, total, estado')
        .eq('fecha', hoy).in('estado', ['completada', 'modificada']),
      supabase.from('venta_pagos').select('metodo, monto, ventas!inner(fecha, estado)')
        .eq('ventas.fecha', hoy).neq('ventas.estado', 'anulada'),
      supabase.from('nominas').select('id, empleado_id')
        .eq('periodo_inicio', hoy).eq('estado', 'pagada'),
      supabase.from('profiles').select('id').eq('activo', true),
      supabase.from('ventas').select(`
        id, numero_ticket, hora, total, tipo_pago, estado,
        clientes(nombre), profiles!empleado_id(nombre_completo)
      `).eq('fecha', hoy).in('estado', ['completada', 'modificada'])
        .order('hora', { ascending: false }).limit(5),
      supabase.from('productos').select('id, codigo, nombre, stock_actual, stock_minimo')
        .eq('activo', true).lte('stock_actual', 0),
      supabase.from('facturas_proveedor')
        .select('id, numero_factura, saldo_pendiente, fecha_vencimiento, proveedores(id, nombre)')
        .in('estado', ['pendiente', 'parcial'])
        .lte('fecha_vencimiento', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('fecha_vencimiento'),
      supabase.from('pagos_programados_proveedor')
        .select('id, monto, fecha_programada, nota, factura_id, facturas_proveedor(proveedores(id, nombre))')
        .eq('pagado', false)
        .lte('fecha_programada', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('fecha_programada'),
      supabase.from('caja_mayor').select('saldo_actual').maybeSingle(),
    ])

    const totalVentasHoy = (ventasHoy ?? []).reduce((s: number, v: any) => s + Number(v.total), 0)
    const numTicketsHoy = ventasHoy?.length ?? 0
    const ticketPromedio = numTicketsHoy > 0 ? totalVentasHoy / numTicketsHoy : 0
    const desglosePago: Record<string, number> = {}
    for (const p of pagosHoy ?? []) {
      desglosePago[(p as any).metodo] = (desglosePago[(p as any).metodo] ?? 0) + Number((p as any).monto)
    }

    return (
      <DashboardAdmin
        profile={profile as any}
        config={config as any}
        fechaHoy={hoy}
        kpisHoy={{
          totalVentas: totalVentasHoy,
          numTickets: numTicketsHoy,
          ticketPromedio,
          desglosePago,
          nominasPagadas: nominasHoy?.length ?? 0,
          empleadosActivos: empleadosActivos?.length ?? 0,
          cajaMayor: Number((cajaMayor as any)?.saldo_actual ?? 0),
        }}
        ultimasVentas={(ultimasVentas as any) ?? []}
        alertas={{
          productosAgotados: (productosAgotados as any) ?? [],
          facturasPendientes: (facturasPendientes as any) ?? [],
          pagosProgramados: (pagosProgramados as any) ?? [],
        }}
      />
    )
  }

  // Empleado
  const ventaDesde = sp.venta_desde ?? hoy.slice(0, 8) + '01'
  const ventaHasta = sp.venta_hasta ?? hoy
  const nominaDesde = sp.nomina_desde ?? hoy.slice(0, 8) + '01'
  const nominaHasta = sp.nomina_hasta ?? hoy

  const [
    { data: ventasEmpleado },
    { data: nominasEmpleado },
    { data: turnosEmpleado },
  ] = await Promise.all([
    supabase.from('ventas')
      .select('id, numero_ticket, fecha, hora, total, tipo_pago, estado, clientes(nombre)')
      .eq('empleado_id', user.id)
      .gte('fecha', ventaDesde)
      .lte('fecha', ventaHasta)
      .in('estado', ['completada', 'modificada'])
      .order('fecha', { ascending: false }),
    supabase.from('nominas')
      .select('id, periodo_inicio, total_pago, horas_trabajadas, salario_base, bonificaciones, deducciones, estado')
      .eq('empleado_id', user.id)
      .gte('periodo_inicio', nominaDesde)
      .lte('periodo_inicio', nominaHasta)
      .order('periodo_inicio', { ascending: false }),
    supabase.from('horario_laboral')
      .select('dia_semana, hora_inicio, hora_fin')
      .eq('empleado_id', user.id)
      .eq('activo', true),
  ])

  const totalVentas = (ventasEmpleado ?? []).reduce((s: number, v: any) => s + Number(v.total), 0)
  const numVentas = ventasEmpleado?.length ?? 0

  return (
    <DashboardEmpleado
      profile={profile as any}
      config={config as any}
      fechaHoy={hoy}
      ventas={(ventasEmpleado as any) ?? []}
      nominas={(nominasEmpleado as any) ?? []}
      turnos={(turnosEmpleado as any) ?? []}
      kpis={{
        totalVentas,
        numVentas,
        ventaPromedio: numVentas > 0 ? totalVentas / numVentas : 0,
      }}
      filtros={{
        ventaDesde, ventaHasta, nominaDesde, nominaHasta,
      }}
    />
  )
}