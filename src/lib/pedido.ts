// Pedido sugerido a un proveedor (Inventario › Agotados y la página del proveedor).

/**
 * Cuántas unidades pedir de un producto:
 *  - lo que se vendería en los días que cubre el pedido (rotación diaria de los últimos 90 días) menos lo que hay, y
 *  - como mínimo, lo que falta para llegar al doble del stock mínimo.
 * La segunda regla hace que el pedido sirva aunque el producto aún no tenga ventas registradas (rotación 0):
 * antes de ella, un catálogo sin historial de ventas sugería pedir 0 de todo.
 */
export function cantidadSugerida({ rotacionDiaria, dias, stock, stockMinimo }: {
  rotacionDiaria: number
  dias: number
  stock: number
  stockMinimo: number
}): number {
  const existencias = Math.max(0, stock)
  const porRotacion = Math.ceil(Math.max(0, rotacionDiaria) * Math.max(0, dias)) - existencias
  const porMinimo = Math.max(0, stockMinimo) * 2 - existencias
  return Math.max(0, porRotacion, porMinimo)
}
