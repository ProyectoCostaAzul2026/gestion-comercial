/**
 * Lógica de cálculo de precios e IVA
 * Según especificaciones v2.0 - Sección 6
 */

export function calcularPrecioVentaSugerido(
  precioCosto: number,
  margenDeseado: number,
  tieneIva: boolean,
  ivaIncluido: boolean,
  porcentajeIva: number
): number {
  const ivaDecimal = porcentajeIva / 100
  const margenDecimal = margenDeseado / 100

  let costoNeto: number

  if (tieneIva && ivaIncluido) {
    costoNeto = precioCosto / (1 + ivaDecimal)
  } else {
    costoNeto = precioCosto
  }

  const precioSugerido = costoNeto * (1 + ivaDecimal) / (1 - margenDecimal)
  return Math.round(precioSugerido * 100) / 100
}

export function calcularMargenCalculado(
  precioCosto: number,
  precioVenta: number,
  tieneIva: boolean,
  ivaIncluido: boolean,
  porcentajeIva: number
): number {
  const ivaDecimal = porcentajeIva / 100

  let costoNeto: number

  if (tieneIva && ivaIncluido) {
    costoNeto = precioCosto / (1 + ivaDecimal)
  } else {
    costoNeto = precioCosto
  }

  const precioSinIva = precioVenta / (1 + ivaDecimal)
  const margen = 1 - (costoNeto / precioSinIva)
  return Math.round(margen * 10000) / 100
}

/**
 * IVA contenido en un precio de venta. El precio de venta siempre trae el IVA
 * (`calcularPrecioVentaSugerido` lo suma) y `iva_incluido` solo se refiere al costo,
 * así que el IVA de una venta se extrae del precio y nunca se suma aparte.
 * Ej: $11.900 con IVA 19 % → $1.900.
 */
export function calcularIvaUnitario(
  precioUnitario: number,
  porcentajeIva: number
): number {
  const ivaDecimal = porcentajeIva / 100
  return precioUnitario - (precioUnitario / (1 + ivaDecimal))
}