// Peso por unidad: para contar productos pequeños (tornillos, puntillas, arandelas…) pesándolos en vez de contarlos uno
// por uno. El precio sigue siendo por unidad; el peso solo ayuda a contar al vender y al hacer inventario.
// Todos los pesos van en gramos.

const redondear = (n: number, decimales: number) => {
  const f = 10 ** decimales
  return Math.round((n + Number.EPSILON) * f) / f
}

/** Peso de una unidad a partir de una muestra: pesar varias unidades juntas es más preciso que pesar una. */
export function pesoUnitarioDeMuestra(pesoTotal: number, unidades: number): number | null {
  if (!(pesoTotal > 0) || !(unidades > 0)) return null
  return redondear(pesoTotal / unidades, 3)
}

/** Lo que deben pesar `cantidad` unidades. */
export function pesoDeCantidad(cantidad: number, pesoUnitario: number): number {
  if (!(cantidad > 0) || !(pesoUnitario > 0)) return 0
  return redondear(cantidad * pesoUnitario, 2)
}

/**
 * Pesos entre los que la báscula marca exactamente `cantidad` unidades: media unidad por debajo y media por encima. No
 * depende de la precisión de la báscula: cualquier lectura dentro del rango redondea a esa cantidad.
 */
export function rangoDePeso(cantidad: number, pesoUnitario: number): [number, number] | null {
  if (!(cantidad > 0) || !(pesoUnitario > 0)) return null
  return [redondear((cantidad - 0.5) * pesoUnitario, 2), redondear((cantidad + 0.5) * pesoUnitario, 2)]
}

/** Unidades que hay en un peso total, descontando el recipiente; redondeado a la unidad más cercana. */
export function cantidadDePeso(pesoTotal: number, pesoUnitario: number, pesoRecipiente = 0): number | null {
  if (!(pesoTotal > 0) || !(pesoUnitario > 0)) return null
  const neto = pesoTotal - (pesoRecipiente > 0 ? pesoRecipiente : 0)
  if (neto <= 0) return 0
  return Math.round(neto / pesoUnitario)
}

/** "250 g", "2,35 g", "1.250 g (1,25 kg)" */
export function formatearPeso(gramos: number): string {
  const decimales = gramos < 10 ? 2 : gramos < 100 ? 1 : 0
  const texto = `${gramos.toLocaleString('es-CO', { maximumFractionDigits: decimales })} g`
  if (gramos < 1000) return texto
  return `${texto} (${(gramos / 1000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg)`
}
