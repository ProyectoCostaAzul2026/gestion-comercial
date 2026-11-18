// Cifras resumidas de un periodo, para compararlo con el actual en Reportes y Contabilidad.
// Usa las mismas reglas que la página de Reportes: ventas no anuladas, costo con costoLineaVenta, gastos y nóminas pagadas.
import type { SupabaseClient } from '@supabase/supabase-js'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { costoLineaVenta, totalNetoVenta } from '@/lib/costo-venta'

export interface ResumenPeriodo {
  ingresos: number
  numVentas: number
  ticketPromedio: number
  costoVentas: number
  gananciaBruta: number
  margenBruto: number
  gastos: number
  nominas: number
  resultado: number
  descuentos: number
  /** Total vendido por medio de pago (sin el crédito, que va aparte) */
  medios: Record<string, number>
  credito: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cliente = SupabaseClient<any, any, any>

export async function resumenPeriodo(supabase: Cliente, desde: string, hasta: string): Promise<ResumenPeriodo> {
  const [ventas, items, gastos, nominas, pagos, creditos] = await Promise.all([
    traerTodo<{ total: number; total_descuentos: number | null; monto_devolucion: number | null }>((a, b) =>
      supabase.from('ventas').select('total, total_descuentos, monto_devolucion')
        .gte('fecha', desde).lte('fecha', hasta).in('estado', ['completada', 'modificada', 'credito'])
        .order('id').range(a, b)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traerTodo<any>((a, b) =>
      supabase.from('venta_items')
        .select('cantidad, es_fraccionado, cantidad_fraccion, costo_unitario, devolucion_items(cantidad, cantidad_fraccion), productos(cantidad_total_unidad, tiene_iva, iva_incluido, porcentaje_iva), ventas!inner(fecha, estado)')
        .gte('ventas.fecha', desde).lte('ventas.fecha', hasta).neq('ventas.estado', 'anulada')
        .order('id').range(a, b)),
    traerTodo<{ monto: number }>((a, b) =>
      supabase.from('gastos').select('monto').gte('fecha', desde).lte('fecha', hasta).order('id').range(a, b)),
    traerTodo<{ total_pago: number }>((a, b) =>
      supabase.from('nominas').select('total_pago').gte('periodo_inicio', desde).lte('periodo_inicio', hasta)
        .eq('estado', 'pagada').order('id').range(a, b)),
    traerTodo<{ metodo: string; monto: number }>((a, b) =>
      supabase.from('venta_pagos').select('metodo, monto, ventas!inner(fecha, estado)')
        .gte('ventas.fecha', desde).lte('ventas.fecha', hasta).neq('ventas.estado', 'anulada')
        .order('id').range(a, b)),
    traerTodo<{ monto_original: number }>((a, b) =>
      supabase.from('ventas_credito').select('monto_original, ventas!inner(fecha, estado)')
        .gte('ventas.fecha', desde).lte('ventas.fecha', hasta).neq('ventas.estado', 'anulada')
        .order('id').range(a, b)),
  ])

  const suma = <T,>(filas: T[], campo: (f: T) => unknown) => filas.reduce((s, f) => s + Number(campo(f) ?? 0), 0)
  const ingresos = ventas.data.reduce((s, v) => s + totalNetoVenta(v), 0)
  const numVentas = ventas.data.length
  const costoVentas = items.data.reduce((s, i) => s + costoLineaVenta(i), 0)
  const totalGastos = suma(gastos.data, g => g.monto)
  const totalNominas = suma(nominas.data, n => n.total_pago)
  const gananciaBruta = ingresos - costoVentas
  const medios: Record<string, number> = {}
  for (const p of pagos.data) {
    if (p.metodo === 'mixto') continue
    medios[p.metodo] = (medios[p.metodo] ?? 0) + Number(p.monto)
  }
  return {
    ingresos,
    numVentas,
    ticketPromedio: numVentas > 0 ? ingresos / numVentas : 0,
    costoVentas,
    gananciaBruta,
    margenBruto: ingresos > 0 ? (gananciaBruta / ingresos) * 100 : 0,
    gastos: totalGastos,
    nominas: totalNominas,
    resultado: gananciaBruta - totalGastos - totalNominas,
    descuentos: suma(ventas.data, v => v.total_descuentos),
    medios,
    credito: suma(creditos.data, c => c.monto_original),
  }
}
