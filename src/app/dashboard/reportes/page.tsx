import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportesPanel } from '@/components/modulos/reportes-panel'

function getPeriodo(periodo: string, desde?: string, hasta?: string) {
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const hoy = new Date()
  switch (periodo) {
    case 'hoy': return { desde: fmt(hoy), hasta: fmt(hoy) }
    case 'semana': {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      return { desde: fmt(lunes), hasta: fmt(hoy) }
    }
    case 'mes_anterior': {
      const hace1mes = new Date(hoy)
      hace1mes.setMonth(hoy.getMonth() - 1)
      return { desde: fmt(hace1mes), hasta: fmt(hoy) }
    }
    case 'mes': return { desde: fmt(hoy).slice(0, 8) + '01', hasta: fmt(hoy) }
    case 'año': return { desde: fmt(hoy).slice(0, 4) + '-01-01', hasta: fmt(hoy) }
    case 'rango': return { desde: desde ?? fmt(hoy).slice(0, 8) + '01', hasta: hasta ?? fmt(hoy) }
    default: {
      const hace1mes = new Date(hoy)
      hace1mes.setMonth(hoy.getMonth() - 1)
      return { desde: fmt(hace1mes), hasta: fmt(hoy) }
    }
  }
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'administrador') redirect('/dashboard')

  const hoy = new Date().toISOString().slice(0, 10)
  const periodo = sp.periodo ?? 'mes_anterior'
  const { desde, hasta } = getPeriodo(periodo, sp.desde, sp.hasta)

  const diasPeriodo = Math.max(1, Math.round(
    (new Date(hasta).getTime() - new Date(desde).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1)

  const [
    { data: ventas },
    { data: pagosPeriodo },
    { data: ventaItems },
    { data: gastos },
    { data: nominas },
    { data: empleados },
    { data: inventario },
    { data: facturasPendientes },
    { data: movimientosCaja },
  ] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, fecha, hora, total, tipo_pago, estado, empleado_id, profiles!empleado_id(nombre_completo)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .in('estado', ['completada', 'modificada', 'credito'])
      .order('fecha'),

    supabase
      .from('venta_pagos')
      .select('metodo, monto, ventas!inner(fecha, estado)')
      .gte('ventas.fecha', desde)
      .lte('ventas.fecha', hasta)
      .neq('ventas.estado', 'anulada'),

    supabase
      .from('venta_items')
      .select(`
        id, nombre_producto, cantidad, precio_unitario, subtotal_linea,
        costo_unitario, es_fraccionado, cantidad_fraccion, venta_id, producto_id,
        productos(id, codigo, nombre, marca, unidad_medida, precio_costo_base),
        ventas!inner(fecha, estado)
      `)
      .gte('ventas.fecha', desde)
      .lte('ventas.fecha', hasta)
      .neq('ventas.estado', 'anulada'),

    supabase
      .from('gastos')
      .select('monto, categoria_gasto')
      .gte('fecha', desde)
      .lte('fecha', hasta),

    supabase
      .from('nominas')
      .select('total_pago, empleado_id, profiles(nombre_completo)')
      .gte('periodo_inicio', desde)
      .lte('periodo_inicio', hasta)
      .eq('estado', 'pagada'),

    supabase
      .from('profiles')
      .select('id, nombre_completo')
      .eq('activo', true),

    supabase
      .from('productos')
      .select('id, codigo, nombre, stock_actual, stock_minimo, precio_costo_base, precio_venta, activo')
      .eq('activo', true),

    supabase
      .from('facturas_proveedor')
      .select('saldo_pendiente, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial']),

    // Flujo de caja: todos los movimientos del período
    supabase
      .from('movimientos_caja')
      .select('fecha, tipo_movimiento, monto')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .neq('tipo_movimiento', 'transferencia_caja_mayor'),
  ])

  // Créditos del período
  const { data: creditosPeriodo } = await supabase
    .from('ventas_credito')
    .select('monto_original, ventas!inner(fecha)')
    .gte('ventas.fecha', desde)
    .lte('ventas.fecha', hasta)

  // ── KPIs período ──
  // Solo ventas completadas/modificadas para ingresos reales
  const ventasCompletadas = (ventas ?? []).filter((v: any) =>
    v.estado === 'completada' || v.estado === 'modificada')
  const totalIngresos = (ventas ?? []).reduce((s: number, v: any) => s + Number(v.total), 0)
  const numVentasPeriodo = ventas?.length ?? 0

  const totalCMV = (ventaItems ?? []).reduce((s: number, i: any) => {
    const cant = i.es_fraccionado ? Number(i.cantidad_fraccion ?? 1) : Number(i.cantidad)
    return s + cant * Number(i.costo_unitario ?? 0)
  }, 0)
  const totalGastos = (gastos ?? []).reduce((s: number, g: any) => s + Number(g.monto), 0)
  const totalNominas = (nominas ?? []).reduce((s: number, n: any) => s + Number(n.total_pago), 0)
  const gananciaBruta = totalIngresos - totalCMV
  const resultado = gananciaBruta - totalGastos - totalNominas
  const margenBruto = totalIngresos > 0 ? (gananciaBruta / totalIngresos) * 100 : 0
  const ventaPromedioDiaria = diasPeriodo > 0 ? totalIngresos / diasPeriodo : 0
  const ticketPromedioPeriodo = numVentasPeriodo > 0 ? totalIngresos / numVentasPeriodo : 0
  const ticketsPromedioDiarios = diasPeriodo > 0 ? numVentasPeriodo / diasPeriodo : 0

  // ── Medios de pago período ──
  const mediosPeriodoStats: Record<string, { total: number; count: number }> = {}
  for (const p of pagosPeriodo ?? []) {
    const metodo = (p as any).metodo
    if (metodo === 'mixto') continue
    if (!mediosPeriodoStats[metodo]) mediosPeriodoStats[metodo] = { total: 0, count: 0 }
    mediosPeriodoStats[metodo].total += Number((p as any).monto)
    mediosPeriodoStats[metodo].count += 1
  }
  const totalCreditoPeriodo = (creditosPeriodo ?? [])
    .reduce((s: number, c: any) => s + Number(c.monto_original), 0)
  if (totalCreditoPeriodo > 0) {
    mediosPeriodoStats['credito'] = { total: totalCreditoPeriodo, count: creditosPeriodo?.length ?? 0 }
  }

  // ── Flujo de caja por día o mes ──
  const agruparPorMes = diasPeriodo > 90
  const flujoPorPeriodo: Record<string, { ingresos: number; egresos: number }> = {}

  for (const m of movimientosCaja ?? []) {
    const fecha = (m as any).fecha as string
    const key = agruparPorMes ? fecha.slice(0, 7) : fecha
    if (!flujoPorPeriodo[key]) flujoPorPeriodo[key] = { ingresos: 0, egresos: 0 }
    if ((m as any).tipo_movimiento === 'ingreso') {
      flujoPorPeriodo[key].ingresos += Number((m as any).monto)
    } else {
      flujoPorPeriodo[key].egresos += Number((m as any).monto)
    }
  }

  const graficaFlujoCaja = Object.entries(flujoPorPeriodo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, { ingresos, egresos }]) => ({
      periodo: agruparPorMes ? periodo.slice(5) : periodo.slice(5),
      ingresos,
      egresos: -egresos, // negativo para la gráfica
      utilidad: ingresos - egresos,
    }))

  // ── Gráfica medios período ──
  const graficaMedios = Object.entries(mediosPeriodoStats)
    .map(([metodo, { total }]) => ({ metodo, total }))

  // ── Ventas por hora ──
  const ventasPorHora: Record<number, number> = {}
  for (const v of ventas ?? []) {
    const hora = parseInt((v as any).hora?.slice(0, 2) ?? '0')
    ventasPorHora[hora] = (ventasPorHora[hora] ?? 0) + Number((v as any).total)
  }
  const graficaHoras = Array.from({ length: 13 }, (_, i) => i + 8).map(h => ({
    hora: `${h}:00`,
    total: ventasPorHora[h] ?? 0,
  }))

  // ── Ventas por empleado ──
  const ventasPorEmpleado: Record<string, { nombre: string; total: number; tickets: number }> = {}
  for (const v of ventas ?? []) {
    const nombre = (v as any).profiles?.nombre_completo ?? 'Sin asignar'
    if (!ventasPorEmpleado[nombre]) ventasPorEmpleado[nombre] = { nombre, total: 0, tickets: 0 }
    ventasPorEmpleado[nombre].total += Number((v as any).total)
    ventasPorEmpleado[nombre].tickets += 1
  }
  const graficaEmpleados = Object.values(ventasPorEmpleado).sort((a, b) => b.total - a.total)

  // ── Top productos ──
  const productoStats: Record<string, {
    producto_id: string; codigo: string; nombre: string; marca: string | null
    unidad_medida: string | null; cantidad: number; ingresos: number
    tickets: Set<string>; costo: number
  }> = {}
  for (const i of ventaItems ?? []) {
    const pid = (i as any).producto_id
    if (!pid) continue
    const cant = (i as any).es_fraccionado ? Number((i as any).cantidad_fraccion ?? 1) : Number((i as any).cantidad)
    if (!productoStats[pid]) {
      productoStats[pid] = {
        producto_id: pid,
        codigo: (i as any).productos?.codigo ?? '—',
        nombre: (i as any).nombre_producto,
        marca: (i as any).productos?.marca ?? null,
        unidad_medida: (i as any).productos?.unidad_medida ?? null,
        cantidad: 0, ingresos: 0, tickets: new Set(), costo: 0,
      }
    }
    productoStats[pid].cantidad += cant
    productoStats[pid].ingresos += Number((i as any).subtotal_linea)
    productoStats[pid].tickets.add((i as any).venta_id)
    productoStats[pid].costo += cant * Number((i as any).costo_unitario ?? 0)
  }
  const topProductosData = Object.values(productoStats).map(p => ({
    ...p,
    tickets: p.tickets.size,
    pct_ganancia: p.ingresos > 0 ? ((p.ingresos - p.costo) / p.ingresos) * 100 : 0,
    unidades_por_dia: diasPeriodo > 0 ? p.cantidad / diasPeriodo : 0,
  }))

  // ── Inventario ──
  const valorInventarioCosto = (inventario ?? []).reduce((s: number, p: any) =>
    s + Number(p.stock_actual) * Number(p.precio_costo_base ?? 0), 0)
  const valorInventarioVenta = (inventario ?? []).reduce((s: number, p: any) =>
    s + Number(p.stock_actual) * Number(p.precio_venta ?? 0), 0)

  // ── Deuda proveedores ──
  const deudaTotal = (facturasPendientes ?? []).reduce((s: number, f: any) =>
    s + Number(f.saldo_pendiente), 0)
  const deudaPorProveedor: Record<string, number> = {}
  for (const f of facturasPendientes ?? []) {
    const nombre = (f as any).proveedores?.nombre ?? '—'
    deudaPorProveedor[nombre] = (deudaPorProveedor[nombre] ?? 0) + Number((f as any).saldo_pendiente)
  }
  const top5Deudas = Object.entries(deudaPorProveedor)
    .map(([nombre, deuda]) => ({ nombre, deuda }))
    .sort((a, b) => b.deuda - a.deuda).slice(0, 5)

  // ── Nómina por empleado ──
  const nominaPorEmpleado: Record<string, { nombre: string; total: number; dias: number }> = {}
  for (const n of nominas ?? []) {
    const nombre = (n as any).profiles?.nombre_completo ?? '—'
    if (!nominaPorEmpleado[nombre]) nominaPorEmpleado[nombre] = { nombre, total: 0, dias: 0 }
    nominaPorEmpleado[nombre].total += Number((n as any).total_pago)
    nominaPorEmpleado[nombre].dias += 1
  }

  return (
    <ReportesPanel
      periodo={periodo}
      desde={desde}
      hasta={hasta}
      diasPeriodo={diasPeriodo}
      kpisPeriodo={{
        totalIngresos, totalCMV, totalGastos, totalNominas,
        gananciaBruta, resultado, margenBruto,
        numVentas: numVentasPeriodo,
        ventaPromedioDiaria,
        ticketPromedioPeriodo,
        ticketsPromedioDiarios,
      }}
      mediosPeriodoStats={mediosPeriodoStats}
      graficaFlujoCaja={graficaFlujoCaja}
      graficaMedios={graficaMedios}
      graficaHoras={graficaHoras}
      graficaEmpleados={graficaEmpleados}
      topProductosData={topProductosData}
      inventario={{ valorCosto: valorInventarioCosto, valorVenta: valorInventarioVenta }}
      deudaProveedores={{ total: deudaTotal, top5: top5Deudas }}
      nominaPeriodo={Object.values(nominaPorEmpleado)}
    />
  )
}