import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContabilidadPanel } from '@/components/modulos/contabilidad-panel'

function getPeriodo(periodo: string, desde?: string, hasta?: string) {
  const hoy = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  switch (periodo) {
    case 'hoy': return { desde: fmt(hoy), hasta: fmt(hoy) }
    case 'semana': {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      return { desde: fmt(lunes), hasta: fmt(hoy) }
    }
    case 'mes': return { desde: fmt(hoy).slice(0, 8) + '01', hasta: fmt(hoy) }
    case 'año': return { desde: fmt(hoy).slice(0, 4) + '-01-01', hasta: fmt(hoy) }
    case 'rango': return { desde: desde ?? fmt(hoy).slice(0, 8) + '01', hasta: hasta ?? fmt(hoy) }
    default: return { desde: fmt(hoy).slice(0, 8) + '01', hasta: fmt(hoy) }
  }
}

export default async function ContabilidadPage({
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

  const periodo = sp.periodo ?? 'mes'
  const { desde, hasta } = getPeriodo(periodo, sp.desde, sp.hasta)

  const [
    { data: ventas },
    { data: ventaServicios },
    { data: ventaItems },
    { data: gastos },
    { data: nominas },
    { data: proveedores },
    { data: empleados },
    { data: categoriasGasto },
    { data: cuentasCobrar },
    { data: cuentasPagar },
  ] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, numero_ticket, fecha, total, tipo_pago, estado, clientes(nombre)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .in('estado', ['completada', 'modificada', 'credito'])
      .order('fecha', { ascending: false }),

    supabase
      .from('venta_servicios')
      .select('id, nombre_servicio, precio_aplicado, ventas!inner(id, fecha, numero_ticket, estado)')
      .gte('ventas.fecha', desde)
      .lte('ventas.fecha', hasta)
      .neq('ventas.estado', 'anulada'),

    supabase
      .from('venta_items')
      .select(`
        id, nombre_producto, cantidad, costo_unitario, subtotal_linea,
        es_fraccionado, cantidad_fraccion,
        productos(id, nombre, producto_proveedores(proveedor_id, proveedores(nombre))),
        ventas!inner(fecha, estado)
      `)
      .gte('ventas.fecha', desde)
      .lte('ventas.fecha', hasta)
      .neq('ventas.estado', 'anulada'),

    supabase
      .from('gastos')
      .select('id, fecha, concepto, categoria_gasto, monto, metodo_pago, notas, proveedores(nombre)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false }),

    supabase
      .from('nominas')
      .select('id, periodo_inicio, total_pago, horas_trabajadas, salario_base, bonificaciones, deducciones, profiles(nombre_completo)')
      .gte('periodo_inicio', desde)
      .lte('periodo_inicio', hasta)
      .eq('estado', 'pagada')
      .order('periodo_inicio', { ascending: false }),

    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('profiles').select('id, nombre_completo').eq('activo', true).order('nombre_completo'),
    supabase.from('categorias_gasto').select('id, nombre').eq('activo', true).order('nombre'),

    supabase
      .from('ventas_credito')
      .select(`
        id, monto_original, saldo_pendiente, estado, fecha_pago_programada, created_at,
        cliente_id,
        ventas(numero_ticket, fecha)
      `)
      .in('estado', ['pendiente', 'parcial'])
      .order('created_at', { ascending: false }),

    supabase
      .from('facturas_proveedor')
      .select('id, numero_factura, fecha_emision, fecha_vencimiento, monto_total, saldo_pendiente, estado, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])
      .order('fecha_vencimiento', { ascending: true }),
  ])

  // Enriquecer cuentas por cobrar con nombre de cliente
  const clienteIds = [...new Set((cuentasCobrar ?? []).map((c: any) => c.cliente_id).filter(Boolean))]
  const { data: clientesCredito } = clienteIds.length > 0
    ? await supabase.from('clientes').select('id, nombre').in('id', clienteIds)
    : { data: [] }

  const clientesMap: Record<string, string> = {}
  for (const c of clientesCredito ?? []) {
    clientesMap[(c as any).id] = (c as any).nombre
  }

  const cuentasCobrarConNombre = (cuentasCobrar ?? []).map((c: any) => ({
    ...c,
    clientes: { nombre: clientesMap[c.cliente_id] ?? '—' },
  }))

  // ✅ Ingresos = ventas + servicios (los créditos ya están en ventas con estado 'credito')
  const totalIngresos = (ventas ?? []).reduce((s: number, v: any) => s + Number(v.total), 0)
  const totalServicios = (ventaServicios ?? []).reduce((s: number, vs: any) => s + Number(vs.precio_aplicado), 0)
  const totalIngresosReal = totalIngresos + totalServicios
  const totalCMV = (ventaItems ?? []).reduce((s: number, i: any) => {
    const cant = i.es_fraccionado ? Number(i.cantidad_fraccion ?? 1) : Number(i.cantidad)
    return s + cant * Number(i.costo_unitario ?? 0)
  }, 0)
  const totalGastos = (gastos ?? []).reduce((s: number, g: any) => s + Number(g.monto), 0)
  const totalNominas = (nominas ?? []).reduce((s: number, n: any) => s + Number(n.total_pago), 0)
  const resultado = totalIngresos - totalCMV - totalGastos - totalNominas
  const totalCobrar = cuentasCobrarConNombre.reduce((s: number, c: any) => s + Number(c.saldo_pendiente), 0)
  const totalPagar = (cuentasPagar ?? []).reduce((s: number, f: any) => s + Number(f.saldo_pendiente), 0)

  return (
    <ContabilidadPanel
      ventas={(ventas as any) ?? []}
      ventaServicios={(ventaServicios as any) ?? []}
      ventaItems={(ventaItems as any) ?? []}
      gastos={(gastos as any) ?? []}
      nominas={(nominas as any) ?? []}
      proveedores={proveedores ?? []}
      empleados={empleados ?? []}
      categoriasGasto={categoriasGasto ?? []}
      cuentasCobrar={cuentasCobrarConNombre}
      nombresClientesCredito={Object.values(clientesMap).filter(Boolean)}
      cuentasPagar={(cuentasPagar as any) ?? []}
      desde={desde}
      hasta={hasta}
      periodo={periodo}
      balance={{ totalIngresos: totalIngresosReal, totalServicios, totalCMV, totalGastos, totalNominas, resultado: totalIngresosReal - totalCMV - totalGastos - totalNominas, totalCobrar, totalPagar }}

    />
  )
}