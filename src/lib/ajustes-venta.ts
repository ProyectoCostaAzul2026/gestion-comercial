// Cálculos de devoluciones y cambios de una venta, para mostrarlos antes de confirmar.
// Replican las RPC anular_venta, devolver_productos y cambiar_productos (Supabase): si se cambia una fórmula aquí,
// hay que cambiarla también allá (y al revés).

export const MEDIOS_AJUSTE = ['efectivo', 'nequi', 'daviplata', 'tarjeta'] as const
export type MedioAjuste = (typeof MEDIOS_AJUSTE)[number]

export const MEDIO_AJUSTE_LABEL: Record<MedioAjuste, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
}

/** Medio por defecto: el de la venta si se pagó con uno solo; si no (mixto, crédito), efectivo. */
export function medioPorDefecto(tipoPago: string | null | undefined): MedioAjuste {
  return (MEDIOS_AJUSTE as readonly string[]).includes(tipoPago ?? '') ? (tipoPago as MedioAjuste) : 'efectivo'
}

// Quita el ruido de punto flotante antes de redondear (la BD calcula con numeric exacto)
const limpiar = (n: number) => Math.round(n * 1e6) / 1e6
const redondear2 = (n: number) => Math.round((limpiar(n) + Number.EPSILON) * 100) / 100

/** Redondeo del total de una venta: hacia arriba a la centena, como registrar_venta. */
export function redondearCentena(n: number): number {
  const v = limpiar(n)
  return v % 100 === 0 ? v : Math.ceil(v / 100) * 100
}

export interface LineaDevolucion {
  /** venta_items.subtotal_linea (ya trae el descuento de la línea) */
  subtotalLinea: number
  /** venta_items.cantidad o, en una línea fraccionada, venta_items.cantidad_fraccion */
  cantidadLinea: number
  /** Unidades (o fracción) que se devuelven ahora */
  cantidadDevuelta: number
}

/**
 * Monto a devolver: la parte del total pagado que corresponde a lo devuelto (incluye el descuento global y el
 * redondeo de la venta), redondeada hacia abajo a la centena.
 * @param baseVenta suma de subtotal_linea de todas las líneas de la venta más sus servicios
 */
export function calcularMontoDevolucion(lineas: LineaDevolucion[], totalVenta: number, baseVenta: number): number {
  if (baseVenta <= 0) return 0
  const monto = lineas.reduce(
    (suma, l) =>
      l.cantidadLinea > 0 ? suma + (l.subtotalLinea * totalVenta * l.cantidadDevuelta) / (baseVenta * l.cantidadLinea) : suma,
    0,
  )
  return Math.floor(limpiar(monto) / 100) * 100
}

export interface LineaRetiro {
  precioUnitario: number
  /** venta_items.cantidad */
  cantidadLinea: number
  /** venta_items.descuento_linea */
  descuentoLinea: number
  /** venta_items.subtotal_linea */
  subtotalLinea: number
  cantidadRetirada: number
}

/**
 * Resultado de un cambio, como lo calcula cambiar_productos. El valor calculado de la venta es líneas (con su
 * descuento) más servicios, menos el descuento global, redondeado a la centena. La línea retirada en parte conserva el
 * descuento de sus unidades restantes y los productos nuevos entran a precio de venta. Se cobra (o devuelve) lo que
 * cambia ese valor, y el total pagado se ajusta en esa cantidad: un total editado a mano conserva su descuento.
 */
export function calcularCambio(params: {
  /** ventas.total actual */
  totalVenta: number
  /** Suma de subtotal_linea de todas las líneas más los servicios, antes del cambio */
  baseVenta: number
  retiros: LineaRetiro[]
  agregados: { precioVenta: number; cantidad: number }[]
  /** Descuento global de la venta en porcentaje (0 si no tiene) */
  descuentoGlobalPorcentaje: number
}): { totalNuevo: number; diferencia: number } {
  const pct = params.descuentoGlobalPorcentaje
  const valorCalculado = (base: number) => redondearCentena(pct > 0 ? base - (base * pct) / 100 : base)

  let base = params.baseVenta
  for (const r of params.retiros) {
    const restante = r.cantidadLinea - r.cantidadRetirada
    const subtotalRestante =
      restante > 0 ? r.precioUnitario * restante - redondear2((r.descuentoLinea * restante) / r.cantidadLinea) : 0
    base += subtotalRestante - r.subtotalLinea
  }
  for (const a of params.agregados) base += a.precioVenta * a.cantidad

  const totalNuevo = Math.max(params.totalVenta + valorCalculado(base) - valorCalculado(params.baseVenta), 0)
  return { totalNuevo, diferencia: totalNuevo - params.totalVenta }
}

/**
 * Reparte un ajuste de una venta a crédito entre la deuda y la caja, como devolver_productos y cambiar_productos.
 * - A favor del cliente (devolución o cambio que baja el total): baja primero la deuda y solo lo que pase de ella se
 *   devuelve en dinero.
 * - A cobrar (cambio que sube el total): se suma a la deuda si el crédito sigue abierto; si ya está pagado, se cobra
 *   en caja como en una venta de contado.
 * En una venta de contado (`saldoPendiente` null) todo va por caja.
 * @param diferencia lo que cambia lo que debe pagar el cliente: el monto devuelto en negativo, o la diferencia del cambio
 * @param saldoPendiente ventas_credito.saldo_pendiente, o null si la venta no es a crédito
 * @param devuelveTodo se devuelven todos los productos (venta sin servicios): se cancela toda la deuda aunque lo
 *   devuelto quede por debajo por el redondeo
 * @returns `deuda`: cuánto sube (+) o baja (−) la deuda; `caja`: dinero que entra (+) o sale (−) por el medio elegido
 */
export function repartirAjusteCredito(
  diferencia: number,
  saldoPendiente: number | null,
  devuelveTodo = false,
): { deuda: number; caja: number } {
  if (saldoPendiente == null) return { deuda: 0, caja: diferencia }
  const saldo = limpiar(saldoPendiente)
  if (devuelveTodo) return { deuda: -saldo, caja: Math.min(limpiar(diferencia + saldo), 0) }
  if (diferencia > 0) return saldo > 0 ? { deuda: diferencia, caja: 0 } : { deuda: 0, caja: diferencia }
  const deuda = -Math.min(-diferencia, saldo)
  return { deuda, caja: limpiar(diferencia - deuda) }
}
