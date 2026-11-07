// Productos de alta rápida (Nueva venta) "por completar". Replica la regla del trigger trg_revisar_por_completar:
// el producto sale de la lista cuando tiene categoría, familia y un proveedor con costo mayor que cero.

export interface DatosPorCompletar {
  categoria_id: string | null
  familia_id: string | null
  /** Costos de sus proveedores */
  costos: number[]
}

/** Lo que le falta a un producto para salir de "por completar" (vacío: ya está completo) */
export function faltantesPorCompletar(p: DatosPorCompletar): string[] {
  const faltan: string[] = []
  if (!p.categoria_id) faltan.push('categoría')
  if (!p.familia_id) faltan.push('familia (nombre "Familia - Característica")')
  if (!p.costos.some(c => c > 0)) faltan.push('proveedor con costo')
  return faltan
}
