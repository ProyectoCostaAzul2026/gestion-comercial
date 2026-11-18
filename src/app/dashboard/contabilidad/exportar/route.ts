import { NextResponse, type NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { hoyBogota } from '@/lib/fechas'
import { cantidadNeta, costoPorUnidadVendida, subtotalNeto } from '@/lib/costo-venta'
import { diasVencido } from '@/lib/cartera'
import { agregarTabla, congelar, datoSuelto, nuevaHoja, type Columna } from '@/lib/excel-contador'

// Libro de Excel para el contador con todo el movimiento de un periodo: ventas, detalle, compras, pagos a proveedores,
// gastos, nómina y caja, más la cartera al día de hoy. Solo administradores (el proxy también lo exige).
// GET /dashboard/contabilidad/exportar?desde=AAAA-MM-DD&hasta=AAAA-MM-DD

/* eslint-disable @typescript-eslint/no-explicit-any */
const fecha = (f?: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : null)
const ESTADOS: Record<string, string> = { completada: 'Completada', modificada: 'Modificada', credito: 'Crédito', anulada: 'Anulada' }
const MEDIOS: Record<string, string> = {
  efectivo: 'Efectivo', caja_menor: 'Caja menor', nequi: 'Nequi', daviplata: 'Daviplata', tarjeta: 'Tarjeta',
  credito: 'Crédito', caja_mayor: 'Caja mayor', mixto: 'Mixto', transferencia: 'Transferencia',
}
const medio = (m?: string | null) => (m ? MEDIOS[m] ?? m : '')

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') return new NextResponse('Solo un administrador puede exportar.', { status: 403 })

  const hoy = hoyBogota()
  const sp = request.nextUrl.searchParams
  let desde = fecha(sp.get('desde')) ?? hoy.slice(0, 8) + '01'
  let hasta = fecha(sp.get('hasta')) ?? hoy
  if (desde > hasta) [desde, hasta] = [hasta, desde]

  const [ventas, pagosVenta, items, servicios, compras, pagosProv, gastos, nominas, caja, cobrar, pagar, negocio] = await Promise.all([
    traerTodo((a, b) => supabase.from('ventas')
      .select('id, numero_ticket, fecha, hora, tipo_pago, subtotal, total_descuentos, total_iva, total, monto_devolucion, estado, motivo_anulacion, clientes(nombre, nit_cc), profiles!empleado_id(nombre_completo)')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha').order('hora').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('venta_pagos')
      .select('venta_id, metodo, monto, ventas!inner(fecha)')
      .gte('ventas.fecha', desde).lte('ventas.fecha', hasta).order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('venta_items')
      .select('nombre_producto, cantidad, es_fraccionado, cantidad_fraccion, precio_unitario, descuento_linea, subtotal_linea, iva_unitario, costo_unitario, devolucion_items(cantidad, cantidad_fraccion), productos(codigo, cantidad_total_unidad, tiene_iva, iva_incluido, porcentaje_iva), ventas!inner(numero_ticket, fecha, estado)')
      .gte('ventas.fecha', desde).lte('ventas.fecha', hasta).neq('ventas.estado', 'anulada').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('venta_servicios')
      .select('nombre_servicio, precio_aplicado, ventas!inner(numero_ticket, fecha, estado)')
      .gte('ventas.fecha', desde).lte('ventas.fecha', hasta).neq('ventas.estado', 'anulada').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('facturas_proveedor')
      .select('numero_factura, fecha_emision, fecha_vencimiento, monto_total, monto_pagado, saldo_pendiente, estado, proveedores(nombre, nit_ruc)')
      .gte('fecha_emision', desde).lte('fecha_emision', hasta).order('fecha_emision').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('pagos_factura_proveedor')
      .select('fecha_pago, monto, metodo_pago, observaciones, facturas_proveedor(numero_factura, proveedores(nombre, nit_ruc))')
      .gte('fecha_pago', desde).lte('fecha_pago', hasta).order('fecha_pago').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('gastos')
      .select('fecha, concepto, categoria_gasto, metodo_pago, monto, notas, proveedores(nombre)')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('nominas')
      .select('periodo_inicio, periodo_fin, horas_trabajadas, salario_base, bonificaciones, deducciones, total_pago, estado, profiles(nombre_completo)')
      .gte('periodo_inicio', desde).lte('periodo_inicio', hasta).eq('estado', 'pagada').order('periodo_inicio').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('movimientos_caja')
      .select('fecha, hora, tipo_movimiento, origen_destino, monto, referencia_tipo, observaciones')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha').order('hora').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('ventas_credito')
      .select('monto_original, saldo_pendiente, fecha_pago_programada, clientes(nombre, nit_cc), ventas(numero_ticket, fecha)')
      .in('estado', ['pendiente', 'parcial']).order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('facturas_proveedor')
      .select('numero_factura, fecha_emision, fecha_vencimiento, monto_total, saldo_pendiente, proveedores(nombre, nit_ruc)')
      .in('estado', ['pendiente', 'parcial']).order('fecha_vencimiento').order('id').range(a, b)),
    supabase.from('configuracion_negocio').select('nombre, nit, regimen').maybeSingle(),
  ])

  const mediosPorVenta = new Map<string, string[]>()
  for (const p of pagosVenta.data as any[]) {
    const l = mediosPorVenta.get(p.venta_id) ?? []
    l.push(`${medio(p.metodo)} ${Math.round(Number(p.monto)).toLocaleString('es-CO')}`)
    mediosPorVenta.set(p.venta_id, l)
  }

  const libro = new ExcelJS.Workbook()
  libro.creator = 'Gestión Comercial'
  libro.created = new Date()

  // El Resumen va primero en el libro, pero se llena al final: sus fórmulas apuntan a los totales de las demás hojas
  const hResumen = nuevaHoja(libro, 'Resumen', 'Resumen contable del periodo', 2)

  const hVentas = nuevaHoja(libro, 'Ventas', `Ventas del ${desde} al ${hasta}`, 14)
  const tVentas = agregarTabla(hVentas, 4, 'Ventas (incluye las anuladas, que no suman)', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (v: any) => v.fecha },
    { titulo: 'Hora', tipo: 'texto', valor: (v: any) => v.hora?.slice(0, 5) },
    { titulo: 'Ticket', tipo: 'entero', valor: (v: any) => v.numero_ticket },
    { titulo: 'Cliente', tipo: 'texto', valor: (v: any) => v.clientes?.nombre ?? 'Cliente general' },
    { titulo: 'NIT o CC', tipo: 'texto', valor: (v: any) => v.clientes?.nit_cc },
    { titulo: 'Vendedor', tipo: 'texto', valor: (v: any) => v.profiles?.nombre_completo },
    { titulo: 'Forma de pago', tipo: 'texto', valor: (v: any) => (v.tipo_pago === 'credito' ? 'Crédito' : (mediosPorVenta.get(v.id) ?? [medio(v.tipo_pago)]).join(' + ')) },
    { titulo: 'Subtotal', tipo: 'dinero', valor: (v: any) => v.subtotal, total: (c, d, h) => `SUMIF(${c('Estado')}${d}:${c('Estado')}${h},"<>Anulada",${c('Subtotal')}${d}:${c('Subtotal')}${h})` },
    { titulo: 'Descuentos', tipo: 'dinero', valor: (v: any) => v.total_descuentos, total: (c, d, h) => `SUMIF(${c('Estado')}${d}:${c('Estado')}${h},"<>Anulada",${c('Descuentos')}${d}:${c('Descuentos')}${h})` },
    { titulo: 'IVA contenido', tipo: 'dinero', valor: (v: any) => v.total_iva, nota: 'Informativo: el negocio no es responsable de IVA. Es el IVA que trae el precio, no se suma al total.', total: (c, d, h) => `SUMIF(${c('Estado')}${d}:${c('Estado')}${h},"<>Anulada",${c('IVA contenido')}${d}:${c('IVA contenido')}${h})` },
    { titulo: 'Total', tipo: 'dinero', valor: (v: any) => v.total, total: (c, d, h) => `SUMIF(${c('Estado')}${d}:${c('Estado')}${h},"<>Anulada",${c('Total')}${d}:${c('Total')}${h})`, nota: 'El total ya incluye los servicios de la venta.' },
    { titulo: 'Devoluciones', tipo: 'dinero', valor: (v: any) => Number(v.monto_devolucion ?? 0), total: (c, d, h) => `SUMIF(${c('Estado')}${d}:${c('Estado')}${h},"<>Anulada",${c('Devoluciones')}${d}:${c('Devoluciones')}${h})`, nota: 'Dinero devuelto al cliente por productos devueltos.' },
    { titulo: 'Total neto', tipo: 'dinero', formula: (c, r) => `IF(${c('Estado')}${r}="Anulada",0,${c('Total')}${r}-${c('Devoluciones')}${r})`, total: 'suma', nota: 'Lo que de verdad se vendió: total menos devoluciones. Una venta anulada vale 0.' },
    { titulo: 'Estado', tipo: 'texto', valor: (v: any) => ESTADOS[v.estado] ?? v.estado },
  ] as Columna<any>[], ventas.data)
  congelar(hVentas, 5)

  const filasDetalle = [
    // Sin lo devuelto: cantidad y valor de lo que el cliente se quedó (las líneas devueltas del todo no salen)
    ...(items.data as any[]).filter(i => cantidadNeta(i) > 0).map(i => {
      const vendida = Number(i.es_fraccionado ? i.cantidad_fraccion : i.cantidad) || 1
      const parte = cantidadNeta(i) / vendida
      return {
        fecha: i.ventas?.fecha, ticket: i.ventas?.numero_ticket, tipo: i.es_fraccionado ? 'Producto por fracción' : 'Producto',
        codigo: i.productos?.codigo, nombre: i.nombre_producto, cantidad: cantidadNeta(i),
        // Precio de lista por unidad (en fracción, por metro o kilo); el descuento y el subtotal, de lo que se quedó el cliente
        precio: i.es_fraccionado ? (Number(i.subtotal_linea) + Number(i.descuento_linea ?? 0)) / vendida : Number(i.precio_unitario),
        descuento: Number(i.descuento_linea ?? 0) * parte, subtotal: subtotalNeto(i), costo: costoPorUnidadVendida(i),
      }
    }),
    ...(servicios.data as any[]).map(s => ({
      fecha: s.ventas?.fecha, ticket: s.ventas?.numero_ticket, tipo: 'Servicio', codigo: '', nombre: s.nombre_servicio,
      cantidad: 1, precio: Number(s.precio_aplicado), descuento: 0, subtotal: Number(s.precio_aplicado), costo: 0,
    })),
  ].sort((a, b) => `${a.fecha}${String(a.ticket).padStart(8, '0')}`.localeCompare(`${b.fecha}${String(b.ticket).padStart(8, '0')}`))
  const hDetalle = nuevaHoja(libro, 'Detalle ventas', 'Detalle de lo vendido y su costo', 12)
  const tDetalle = agregarTabla(hDetalle, 4, 'Productos y servicios vendidos (sin anuladas)', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (f: any) => f.fecha },
    { titulo: 'Ticket', tipo: 'entero', valor: (f: any) => f.ticket },
    { titulo: 'Tipo', tipo: 'texto', valor: (f: any) => f.tipo },
    { titulo: 'Código', tipo: 'texto', valor: (f: any) => f.codigo },
    { titulo: 'Producto o servicio', tipo: 'texto', valor: (f: any) => f.nombre, ancho: 40 },
    { titulo: 'Cantidad', tipo: 'numero', valor: (f: any) => f.cantidad, nota: 'En los productos por fracción son metros o kilos.' },
    { titulo: 'Precio unitario', tipo: 'dinero', valor: (f: any) => f.precio },
    { titulo: 'Descuento', tipo: 'dinero', valor: (f: any) => f.descuento, total: 'suma' },
    { titulo: 'Subtotal', tipo: 'dinero', valor: (f: any) => f.subtotal, total: 'suma' },
    { titulo: 'Costo unitario', tipo: 'dinero', valor: (f: any) => f.costo, nota: 'Costo de compra. Incluye el IVA pagado al proveedor, porque el negocio no lo recupera.' },
    { titulo: 'Costo total', tipo: 'dinero', formula: (c, r) => `${c('Cantidad')}${r}*${c('Costo unitario')}${r}`, total: 'suma' },
    { titulo: 'Utilidad', tipo: 'dinero', formula: (c, r) => `${c('Subtotal')}${r}-${c('Costo total')}${r}`, total: 'suma' },
  ] as Columna<any>[], filasDetalle)
  congelar(hDetalle, 5)

  const hCompras = nuevaHoja(libro, 'Compras', 'Facturas de proveedores recibidas en el periodo', 9)
  const tCompras = agregarTabla(hCompras, 4, 'Facturas por fecha de emisión', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (f: any) => f.fecha_emision },
    { titulo: 'Proveedor', tipo: 'texto', valor: (f: any) => f.proveedores?.nombre },
    { titulo: 'NIT', tipo: 'texto', valor: (f: any) => f.proveedores?.nit_ruc },
    { titulo: 'Número', tipo: 'texto', valor: (f: any) => f.numero_factura },
    { titulo: 'Vence', tipo: 'fecha', valor: (f: any) => f.fecha_vencimiento },
    { titulo: 'Total', tipo: 'dinero', valor: (f: any) => f.monto_total, total: 'suma' },
    { titulo: 'Pagado', tipo: 'dinero', valor: (f: any) => f.monto_pagado, total: 'suma' },
    { titulo: 'Saldo', tipo: 'dinero', formula: (c, r) => `${c('Total')}${r}-${c('Pagado')}${r}`, total: 'suma' },
    { titulo: 'Estado', tipo: 'texto', valor: (f: any) => ({ pendiente: 'Pendiente', parcial: 'Parcial', pagada: 'Pagada', pagado: 'Pagada' } as Record<string, string>)[f.estado] ?? f.estado },
  ] as Columna<any>[], compras.data)
  congelar(hCompras, 5)

  const hPagos = nuevaHoja(libro, 'Pagos proveedores', 'Pagos hechos a proveedores en el periodo', 6)
  const tPagos = agregarTabla(hPagos, 4, 'Pagos por fecha', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (p: any) => p.fecha_pago },
    { titulo: 'Proveedor', tipo: 'texto', valor: (p: any) => p.facturas_proveedor?.proveedores?.nombre },
    { titulo: 'NIT', tipo: 'texto', valor: (p: any) => p.facturas_proveedor?.proveedores?.nit_ruc },
    { titulo: 'Factura', tipo: 'texto', valor: (p: any) => p.facturas_proveedor?.numero_factura },
    { titulo: 'Medio', tipo: 'texto', valor: (p: any) => medio(p.metodo_pago) },
    { titulo: 'Monto', tipo: 'dinero', valor: (p: any) => p.monto, total: 'suma' },
  ] as Columna<any>[], pagosProv.data)

  const hGastos = nuevaHoja(libro, 'Gastos', 'Gastos del periodo', 7)
  const tGastos = agregarTabla(hGastos, 4, 'Gastos por fecha', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (g: any) => g.fecha },
    { titulo: 'Concepto', tipo: 'texto', valor: (g: any) => g.concepto, ancho: 32 },
    { titulo: 'Categoría', tipo: 'texto', valor: (g: any) => g.categoria_gasto },
    { titulo: 'Proveedor', tipo: 'texto', valor: (g: any) => g.proveedores?.nombre },
    { titulo: 'Medio', tipo: 'texto', valor: (g: any) => medio(g.metodo_pago) },
    { titulo: 'Monto', tipo: 'dinero', valor: (g: any) => g.monto, total: 'suma' },
    { titulo: 'Notas', tipo: 'texto', valor: (g: any) => g.notas, ancho: 32 },
  ] as Columna<any>[], gastos.data)

  const hNomina = nuevaHoja(libro, 'Nómina', 'Pagos de nómina del periodo', 7)
  const tNomina = agregarTabla(hNomina, 4, 'Pagos por empleado', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (n: any) => n.periodo_inicio },
    { titulo: 'Empleado', tipo: 'texto', valor: (n: any) => n.profiles?.nombre_completo },
    { titulo: 'Horas', tipo: 'numero', valor: (n: any) => n.horas_trabajadas, total: 'suma' },
    { titulo: 'Salario base', tipo: 'dinero', valor: (n: any) => n.salario_base },
    { titulo: 'Bonificaciones', tipo: 'dinero', valor: (n: any) => n.bonificaciones, total: 'suma' },
    { titulo: 'Deducciones', tipo: 'dinero', valor: (n: any) => n.deducciones, total: 'suma' },
    { titulo: 'Total pagado', tipo: 'dinero', valor: (n: any) => n.total_pago, total: 'suma' },
  ] as Columna<any>[], nominas.data)

  const hCaja = nuevaHoja(libro, 'Caja', 'Movimientos de caja del periodo', 7)
  const tCaja = agregarTabla(hCaja, 4, 'Entradas y salidas de dinero por medio', [
    { titulo: 'Fecha', tipo: 'fecha', valor: (m: any) => m.fecha },
    { titulo: 'Hora', tipo: 'texto', valor: (m: any) => m.hora?.slice(0, 5) },
    { titulo: 'Tipo', tipo: 'texto', valor: (m: any) => String(m.tipo_movimiento).replace(/_/g, ' ') },
    { titulo: 'Medio', tipo: 'texto', valor: (m: any) => medio(m.origen_destino) },
    { titulo: 'Origen', tipo: 'texto', valor: (m: any) => String(m.referencia_tipo ?? '').replace(/_/g, ' ') },
    { titulo: 'Monto', tipo: 'dinero', valor: (m: any) => (m.tipo_movimiento === 'ingreso' ? 1 : m.tipo_movimiento === 'transferencia_caja_mayor' ? 0 : -1) * Number(m.monto), nota: 'Entradas en positivo y salidas en negativo. Los traslados entre medios quedan en 0 para no duplicar.', total: 'suma' },
    { titulo: 'Detalle', tipo: 'texto', valor: (m: any) => m.observaciones, ancho: 40 },
  ] as Columna<any>[], caja.data)
  congelar(hCaja, 5)

  const hCobrar = nuevaHoja(libro, 'Por cobrar', `Cuentas por cobrar al ${hoy}`, 8)
  const tCobrar = agregarTabla(hCobrar, 4, 'Créditos de clientes con saldo', [
    { titulo: 'Cliente', tipo: 'texto', valor: (c: any) => c.clientes?.nombre },
    { titulo: 'NIT o CC', tipo: 'texto', valor: (c: any) => c.clientes?.nit_cc },
    { titulo: 'Ticket', tipo: 'entero', valor: (c: any) => c.ventas?.numero_ticket },
    { titulo: 'Fecha venta', tipo: 'fecha', valor: (c: any) => c.ventas?.fecha },
    { titulo: 'Vence', tipo: 'fecha', valor: (c: any) => c.fecha_pago_programada },
    { titulo: 'Valor original', tipo: 'dinero', valor: (c: any) => c.monto_original, total: 'suma' },
    { titulo: 'Saldo', tipo: 'dinero', valor: (c: any) => c.saldo_pendiente, total: 'suma' },
    { titulo: 'Días de mora', tipo: 'entero', valor: (c: any) => diasVencido(c.fecha_pago_programada ?? c.ventas?.fecha ?? null, hoy) },
  ] as Columna<any>[], cobrar.data)

  const hPagar = nuevaHoja(libro, 'Por pagar', `Cuentas por pagar al ${hoy}`, 7)
  const tPagar = agregarTabla(hPagar, 4, 'Facturas de proveedores con saldo', [
    { titulo: 'Proveedor', tipo: 'texto', valor: (f: any) => f.proveedores?.nombre },
    { titulo: 'NIT', tipo: 'texto', valor: (f: any) => f.proveedores?.nit_ruc },
    { titulo: 'Factura', tipo: 'texto', valor: (f: any) => f.numero_factura },
    { titulo: 'Emisión', tipo: 'fecha', valor: (f: any) => f.fecha_emision },
    { titulo: 'Vence', tipo: 'fecha', valor: (f: any) => f.fecha_vencimiento },
    { titulo: 'Saldo', tipo: 'dinero', valor: (f: any) => f.saldo_pendiente, total: 'suma' },
    { titulo: 'Días de mora', tipo: 'entero', valor: (f: any) => diasVencido(f.fecha_vencimiento ?? f.fecha_emision, hoy) },
  ] as Columna<any>[], pagar.data)

  // ── Resumen: primera hoja, con fórmulas que apuntan a los totales de las demás ──
  let f = 4
  datoSuelto(hResumen, f++, 'Negocio', negocio.data?.nombre ?? '')
  datoSuelto(hResumen, f++, 'NIT', negocio.data?.nit ?? '')
  datoSuelto(hResumen, f++, 'Régimen', negocio.data?.regimen ?? 'No responsable de IVA')
  datoSuelto(hResumen, f++, 'Periodo', `${desde} al ${hasta}`)
  datoSuelto(hResumen, f++, 'Generado', hoy)
  f++
  const tituloER = f
  hResumen.mergeCells(f, 2, f, 3)
  const tc = hResumen.getCell(f, 2)
  tc.value = 'Estado de resultados'
  tc.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } }
  tc.alignment = { horizontal: 'center' }
  f = tituloER + 1
  const ingresos = datoSuelto(hResumen, f++, 'Ventas', { formula: tVentas.totales['Total neto'] }, 'dinero', 'Total neto de la hoja Ventas: sin anuladas ni devoluciones. Incluye servicios.')
  const costo = datoSuelto(hResumen, f++, 'Costo de lo vendido', { formula: tDetalle.totales['Costo total'] }, 'dinero', 'Suma de la hoja Detalle ventas. Incluye el IVA de compra.')
  const bruta = datoSuelto(hResumen, f++, 'Ganancia bruta', { formula: `${ingresos}-${costo}` }, 'dinero')
  const gasto = datoSuelto(hResumen, f++, 'Gastos', { formula: tGastos.totales['Monto'] }, 'dinero')
  const nomina = datoSuelto(hResumen, f++, 'Nómina', { formula: tNomina.totales['Total pagado'] }, 'dinero')
  const resultado = datoSuelto(hResumen, f++, 'Resultado del periodo', { formula: `${bruta}-${gasto}-${nomina}` }, 'dinero', 'Ganancia bruta menos gastos y nómina.')
  hResumen.getCell(resultado).font = { name: 'Arial', size: 10, bold: true }
  datoSuelto(hResumen, f++, 'Margen bruto', { formula: `IF(${ingresos}=0,0,${bruta}/${ingresos})` }, 'porcentaje')
  datoSuelto(hResumen, f++, 'Descuentos dados', { formula: tVentas.totales['Descuentos'] }, 'dinero')
  f++
  hResumen.mergeCells(f, 2, f, 3)
  const tc2 = hResumen.getCell(f, 2)
  tc2.value = 'Compras, pagos y cartera'
  tc2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  tc2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } }
  tc2.alignment = { horizontal: 'center' }
  f++
  datoSuelto(hResumen, f++, 'Compras del periodo', { formula: tCompras.totales['Total'] }, 'dinero')
  datoSuelto(hResumen, f++, 'Pagos a proveedores', { formula: tPagos.totales['Monto'] }, 'dinero')
  datoSuelto(hResumen, f++, 'Neto de caja', { formula: tCaja.totales['Monto'] }, 'dinero', 'Entradas menos salidas de dinero en el periodo, en todos los medios.')
  datoSuelto(hResumen, f++, `Por cobrar al ${hoy}`, { formula: tCobrar.totales['Saldo'] }, 'dinero')
  datoSuelto(hResumen, f++, `Por pagar al ${hoy}`, { formula: tPagar.totales['Saldo'] }, 'dinero')
  hResumen.getColumn(2).width = 28
  hResumen.getColumn(3).width = 30

  const buffer = await libro.xlsx.writeBuffer()
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contabilidad-${desde}-a-${hasta}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
