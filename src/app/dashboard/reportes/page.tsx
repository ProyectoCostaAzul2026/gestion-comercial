import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { redirect } from 'next/navigation'
import { ReportesPanel } from '@/components/modulos/reportes-panel'
import { hoyBogota } from '@/lib/fechas'
import { cantidadNeta, costoLineaVenta, subtotalNeto, totalNetoVenta } from '@/lib/costo-venta'
import { claveSerie, diasEntre, leerPeriodo, periodoAnterior } from '@/lib/periodos'
import { resumenPeriodo } from '@/lib/reportes-servidor'

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; fecha?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'administrador') redirect('/dashboard')

  const hoy = hoyBogota()
  const periodoActual = leerPeriodo(sp, hoy, 'mes')
  const anterior = periodoAnterior(periodoActual)
  const { desde, hasta } = periodoActual
  const diasPeriodo = diasEntre(desde, hasta)
  // Cifras del periodo anterior para comparar (se piden en paralelo con las del actual)
  const resumenAnteriorPromesa = resumenPeriodo(supabase, anterior.desde, anterior.hasta)

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
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('ventas')
        .select('id, fecha, hora, total, total_descuentos, monto_devolucion, tipo_pago, estado, empleado_id, profiles!empleado_id(nombre_completo)')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .in('estado', ['completada', 'modificada', 'credito'])
        .order('fecha')
        .order('id')
        .range(filaDesde, filaHasta)
    ),

    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('venta_pagos')
        .select('metodo, monto, ventas!inner(fecha, estado)')
        .gte('ventas.fecha', desde)
        .lte('ventas.fecha', hasta)
        .neq('ventas.estado', 'anulada')
        .order('id')
        .range(filaDesde, filaHasta)
    ),

    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('venta_items')
        .select(`
          id, nombre_producto, cantidad, precio_unitario, subtotal_linea,
          costo_unitario, es_fraccionado, cantidad_fraccion, venta_id, producto_id, devolucion_items(cantidad, cantidad_fraccion),
          productos(id, codigo, nombre, marca, unidad_medida, precio_costo_base, cantidad_total_unidad, tiene_iva, iva_incluido, porcentaje_iva,
            producto_familias(nombre_base), categorias_producto(nombre)),
          ventas!inner(fecha, estado)
        `)
        .gte('ventas.fecha', desde)
        .lte('ventas.fecha', hasta)
        .neq('ventas.estado', 'anulada')
        .order('id')
        .range(filaDesde, filaHasta)
    ),

    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('gastos')
        .select('monto, categoria_gasto')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('id')
        .range(filaDesde, filaHasta)
    ),

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

    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('productos')
        .select('id, codigo, nombre, stock_actual, stock_minimo, precio_costo_base, precio_venta, activo')
        .eq('activo', true)
        .order('id')
        .range(filaDesde, filaHasta)
    ),

    supabase
      .from('facturas_proveedor')
      .select('saldo_pendiente, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial']),

    // Flujo de caja: todos los movimientos del período
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('movimientos_caja')
        .select('fecha, tipo_movimiento, monto')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .neq('tipo_movimiento', 'transferencia_caja_mayor')
        .order('id')
        .range(filaDesde, filaHasta)
    ),
  ])

  // Créditos del período
  const { data: creditosPeriodo } = await traerTodo((filaDesde, filaHasta) =>
    supabase
      .from('ventas_credito')
      .select('monto_original, ventas!inner(fecha, estado)')
      .gte('ventas.fecha', desde)
      .lte('ventas.fecha', hasta)
      .neq('ventas.estado', 'anulada')
      .order('id')
      .range(filaDesde, filaHasta)
  )

  // ── KPIs período ──
  // Solo ventas completadas/modificadas para ingresos reales
  const ventasCompletadas = (ventas ?? []).filter((v: any) =>
    v.estado === 'completada' || v.estado === 'modificada')
  // Lo devuelto no es venta: devolver_productos no baja el total, lo anota en monto_devolucion
  const totalIngresos = (ventas ?? []).reduce((s: number, v: any) => s + totalNetoVenta(v), 0)
  const numVentasPeriodo = ventas?.length ?? 0

  const totalCMV = (ventaItems ?? []).reduce((s: number, i: any) => s + costoLineaVenta(i), 0)
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
  const ticketsPorHora: Record<number, number> = {}
  for (const v of ventas ?? []) {
    const hora = parseInt((v as any).hora?.slice(0, 2) ?? '0')
    ventasPorHora[hora] = (ventasPorHora[hora] ?? 0) + totalNetoVenta(v as any)
    ticketsPorHora[hora] = (ticketsPorHora[hora] ?? 0) + 1
  }
  const graficaHoras = Array.from({ length: 13 }, (_, i) => i + 8).map(h => ({
    hora: `${h}:00`,
    total: ventasPorHora[h] ?? 0,
    tickets: ticketsPorHora[h] ?? 0,
    valorPorTicket: (ticketsPorHora[h] ?? 0) > 0 ? (ventasPorHora[h] ?? 0) / (ticketsPorHora[h] ?? 0) : 0,
  }))

  // ── Ventas promedio por día de la semana (lunes a domingo) ──
  const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const totalPorDiaSemana = [0, 0, 0, 0, 0, 0, 0]
  const ticketsPorDiaSemana = [0, 0, 0, 0, 0, 0, 0]
  for (const v of ventas ?? []) {
    const fecha = (v as any).fecha as string
    const d = new Date(fecha + 'T00:00:00')
    const idx = (d.getDay() + 6) % 7
    totalPorDiaSemana[idx] += totalNetoVenta(v as any)
    ticketsPorDiaSemana[idx] += 1
  }
  const conteoPorDiaSemana = [0, 0, 0, 0, 0, 0, 0]
  {
    const cursor = new Date(desde + 'T00:00:00')
    const fin = new Date(hasta + 'T00:00:00')
    while (cursor <= fin) {
      conteoPorDiaSemana[(cursor.getDay() + 6) % 7]++
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  const graficaDiasSemana = DIAS_SEMANA.map((dia, i) => ({
    dia,
    promedio: conteoPorDiaSemana[i] > 0 ? totalPorDiaSemana[i] / conteoPorDiaSemana[i] : 0,
    ticketsPromedio: conteoPorDiaSemana[i] > 0 ? ticketsPorDiaSemana[i] / conteoPorDiaSemana[i] : 0,
    valorPorTicket: ticketsPorDiaSemana[i] > 0 ? totalPorDiaSemana[i] / ticketsPorDiaSemana[i] : 0,
  }))

  // ── Ventas por empleado ──
  const ventasPorEmpleado: Record<string, { nombre: string; total: number; tickets: number }> = {}
  for (const v of ventas ?? []) {
    const nombre = (v as any).profiles?.nombre_completo ?? 'Sin asignar'
    if (!ventasPorEmpleado[nombre]) ventasPorEmpleado[nombre] = { nombre, total: 0, tickets: 0 }
    ventasPorEmpleado[nombre].total += totalNetoVenta(v as any)
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
    const cant = cantidadNeta(i as any)
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
    productoStats[pid].ingresos += subtotalNeto(i as any)
    productoStats[pid].tickets.add((i as any).venta_id)
    productoStats[pid].costo += costoLineaVenta(i as any)
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

  // ── Descuentos en el tiempo ──
  const totalDescuentos = (ventas ?? []).reduce((s: number, v: any) => s + Number(v.total_descuentos ?? 0), 0)
  const descuentosPorFecha: Record<string, { descuentos: number; ventas: number; tickets: number }> = {}
  {
    // Todos los días (o meses) del periodo, aunque no haya ventas, para que la línea no salte
    const cursor = new Date(desde + 'T12:00:00Z')
    const fin = new Date(hasta + 'T12:00:00Z')
    while (cursor <= fin) {
      descuentosPorFecha[claveSerie(cursor.toISOString().slice(0, 10), diasPeriodo)] ??= { descuentos: 0, ventas: 0, tickets: 0 }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }
  for (const v of ventas ?? []) {
    const k = claveSerie((v as any).fecha, diasPeriodo)
    const d = (descuentosPorFecha[k] ??= { descuentos: 0, ventas: 0, tickets: 0 })
    d.descuentos += Number((v as any).total_descuentos ?? 0)
    d.ventas += totalNetoVenta(v as any)
    if (Number((v as any).total_descuentos ?? 0) > 0) d.tickets += 1
  }
  const serieDescuentos = Object.entries(descuentosPorFecha)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, d]) => ({ periodo: fecha.length === 7 ? fecha : fecha.slice(5), ...d }))
  const ventasConDescuento = (ventas ?? []).filter((v: any) => Number(v.total_descuentos ?? 0) > 0).length

  // ── Utilidad por categoría y por familia ──
  const agrupar = (clave: (i: any) => string) => {
    const mapa: Record<string, { nombre: string; ingresos: number; costo: number; unidades: number; productos: Set<string> }> = {}
    for (const i of ventaItems ?? []) {
      const nombre = clave(i)
      const g = (mapa[nombre] ??= { nombre, ingresos: 0, costo: 0, unidades: 0, productos: new Set() })
      g.ingresos += subtotalNeto(i as any)
      g.costo += costoLineaVenta(i as any)
      g.unidades += cantidadNeta(i as any)
      if ((i as any).producto_id) g.productos.add((i as any).producto_id)
    }
    return Object.values(mapa).map(g => ({
      nombre: g.nombre, ingresos: g.ingresos, costo: g.costo, utilidad: g.ingresos - g.costo,
      margen: g.ingresos > 0 ? ((g.ingresos - g.costo) / g.ingresos) * 100 : 0,
      unidades: g.unidades, productos: g.productos.size,
    })).sort((a, b) => b.utilidad - a.utilidad)
  }
  const utilidadPorCategoria = agrupar(i => i.productos?.categorias_producto?.nombre ?? 'Sin categoría')
  const utilidadPorFamilia = agrupar(i => i.productos?.producto_familias?.nombre_base ?? 'Sin familia')

  const resumenAnterior = await resumenAnteriorPromesa

  return (
    <ReportesPanel
      periodo={periodoActual}
      hoy={hoy}
      anterior={{ ...anterior, resumen: resumenAnterior }}
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
      graficaDiasSemana={graficaDiasSemana}
      graficaEmpleados={graficaEmpleados}
      topProductosData={topProductosData}
      inventario={{ valorCosto: valorInventarioCosto, valorVenta: valorInventarioVenta }}
      deudaProveedores={{ total: deudaTotal, top5: top5Deudas }}
      nominaPeriodo={Object.values(nominaPorEmpleado)}
      descuentos={{ total: totalDescuentos, ventasConDescuento, serie: serieDescuentos }}
      utilidadPorCategoria={utilidadPorCategoria}
      utilidadPorFamilia={utilidadPorFamilia}
    />
  )
}