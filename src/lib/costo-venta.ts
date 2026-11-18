// Costo de lo vendido en una línea de venta. Lo usan Reportes y Contabilidad.

export interface LineaCosto {
  cantidad: number | string
  es_fraccionado?: boolean | null
  cantidad_fraccion?: number | string | null
  costo_unitario?: number | string | null
  /**
   * Producto de la línea: `cantidad_total_unidad` es cuántos metros o kilos trae la unidad completa (el rollo); los
   * campos de IVA dicen si al costo guardado hay que sumarle el IVA.
   */
  /** Lo devuelto de la línea (devolver_productos no cambia la línea: guarda las unidades en devolucion_items) */
  devolucion_items?: { cantidad: number | string | null; cantidad_fraccion?: number | string | null }[] | null
  productos?: {
    cantidad_total_unidad?: number | string | null
    tiene_iva?: boolean | null
    iva_incluido?: boolean | null
    porcentaje_iva?: number | string | null
  } | null
}

/** Unidades vendidas: en una línea por fracción son los metros o kilos, no los rollos */
export function cantidadVendida(i: LineaCosto): number {
  return i.es_fraccionado ? Number(i.cantidad_fraccion ?? 0) : Number(i.cantidad)
}

/**
 * Costo de una unidad vendida. `venta_items.costo_unitario` guarda el costo de la unidad completa (el rollo de 100 m),
 * así que en una línea por fracción el costo de cada metro es ese costo dividido entre lo que trae el rollo.
 * Si el producto ya no existe o no dice cuánto trae, no se puede saber: devuelve 0.
 *
 * El negocio no es responsable de IVA: el IVA que le paga al proveedor no lo recupera, así que es parte del costo.
 * `costo_unitario` viene sin IVA salvo que el producto diga `iva_incluido`.
 */
export function costoPorUnidadVendida(i: LineaCosto): number {
  const p = i.productos
  const factorIva = p?.tiene_iva && !p.iva_incluido ? 1 + Number(p.porcentaje_iva ?? 0) / 100 : 1
  const costo = Number(i.costo_unitario ?? 0) * factorIva
  if (!i.es_fraccionado) return costo
  const contenido = Number(i.productos?.cantidad_total_unidad ?? 0)
  return contenido > 0 ? costo / contenido : 0
}

/** Unidades devueltas de la línea (metros o kilos si es por fracción) */
export function cantidadDevuelta(i: LineaCosto): number {
  return (i.devolucion_items ?? []).reduce((s, d) => s + Number((i.es_fraccionado ? d.cantidad_fraccion : d.cantidad) ?? 0), 0)
}

/** Unidades que de verdad se quedó el cliente: lo vendido menos lo devuelto */
export function cantidadNeta(i: LineaCosto): number {
  return Math.max(cantidadVendida(i) - cantidadDevuelta(i), 0)
}

/** Lo que vale la línea después de devoluciones (proporcional a lo que se quedó el cliente) */
export function subtotalNeto(i: LineaCosto & { subtotal_linea: number | string }): number {
  const vendida = cantidadVendida(i)
  return vendida > 0 ? Number(i.subtotal_linea) * cantidadNeta(i) / vendida : Number(i.subtotal_linea)
}

/**
 * Costo total de la línea, sin lo devuelto (lo devuelto volvió al inventario). Para que descuente las devoluciones,
 * la consulta debe traer `devolucion_items(cantidad, cantidad_fraccion)`.
 */
export function costoLineaVenta(i: LineaCosto): number {
  return cantidadNeta(i) * costoPorUnidadVendida(i)
}

/** Lo que de verdad se vendió en una venta: devolver_productos no baja el total, lo anota en monto_devolucion */
export function totalNetoVenta(v: { total: number | string; monto_devolucion?: number | string | null }): number {
  return Number(v.total) - Number(v.monto_devolucion ?? 0)
}
