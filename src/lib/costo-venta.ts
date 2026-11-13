// Costo de lo vendido en una línea de venta. Lo usan Reportes y Contabilidad.

export interface LineaCosto {
  cantidad: number | string
  es_fraccionado?: boolean | null
  cantidad_fraccion?: number | string | null
  costo_unitario?: number | string | null
  /** Producto de la línea: `cantidad_total_unidad` es cuántos metros o kilos trae la unidad completa (el rollo) */
  productos?: { cantidad_total_unidad?: number | string | null } | null
}

/** Unidades vendidas: en una línea por fracción son los metros o kilos, no los rollos */
export function cantidadVendida(i: LineaCosto): number {
  return i.es_fraccionado ? Number(i.cantidad_fraccion ?? 0) : Number(i.cantidad)
}

/**
 * Costo de una unidad vendida. `venta_items.costo_unitario` guarda el costo de la unidad completa (el rollo de 100 m),
 * así que en una línea por fracción el costo de cada metro es ese costo dividido entre lo que trae el rollo.
 * Si el producto ya no existe o no dice cuánto trae, no se puede saber: devuelve 0.
 */
export function costoPorUnidadVendida(i: LineaCosto): number {
  const costo = Number(i.costo_unitario ?? 0)
  if (!i.es_fraccionado) return costo
  const contenido = Number(i.productos?.cantidad_total_unidad ?? 0)
  return contenido > 0 ? costo / contenido : 0
}

/** Costo total de la línea */
export function costoLineaVenta(i: LineaCosto): number {
  return cantidadVendida(i) * costoPorUnidadVendida(i)
}
