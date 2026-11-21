/**
 * Bonos por topes de venta (configuracion_negocio.bonos_ventas). La nómina los sugiere solos y el administrador los
 * aprueba o los quita antes de pagar.
 *
 * - Bono para todos (equipo): si las ventas netas del día llegan a un tope, cada empleado que se paga ese día gana el
 *   bono del tope más alto alcanzado.
 * - Bono individual: por cada venta de un vendedor que llega a un tope, él gana el bono del tope más alto que alcanzó
 *   esa venta.
 * Hasta 3 topes de cada clase. Las ventas anuladas no cuentan y las devoluciones se descuentan (totalNetoVenta).
 */

export interface TopeBono { tope: number; bono: number }
export interface BonosVentas { equipo: TopeBono[]; individual: TopeBono[] }

export const MAX_TOPES = 3
export const SIN_BONOS: BonosVentas = { equipo: [], individual: [] }

const limpiar = (lista: unknown): TopeBono[] =>
  (Array.isArray(lista) ? lista : [])
    .map(t => ({ tope: Math.round(Number((t as TopeBono)?.tope) || 0), bono: Math.round(Number((t as TopeBono)?.bono) || 0) }))
    .filter(t => t.tope > 0 && t.bono > 0)
    .sort((a, b) => a.tope - b.tope)
    .slice(0, MAX_TOPES)

/** Lee lo guardado en la base (puede venir vacío o incompleto) */
export function leerBonos(raw: unknown): BonosVentas {
  const r = (raw ?? {}) as Partial<BonosVentas>
  return { equipo: limpiar(r.equipo), individual: limpiar(r.individual) }
}

/** Revisa una lista de topes escrita por el administrador. Devuelve el error o null. */
export function validarTopes(lista: { tope: number; bono: number }[], nombre: string): string | null {
  const llenos = lista.filter(t => t.tope > 0 || t.bono > 0)
  for (const t of llenos) {
    if (!(t.tope > 0)) return `${nombre}: falta el tope de venta de un bono.`
    if (!(t.bono > 0)) return `${nombre}: falta el valor del bono del tope de $${t.tope.toLocaleString('es-CO')}.`
  }
  for (let i = 1; i < llenos.length; i++) {
    if (llenos[i].tope <= llenos[i - 1].tope) return `${nombre}: cada tope debe ser mayor que el anterior.`
  }
  return null
}

/** Tope más alto alcanzado por un monto (null si no alcanza ninguno) */
export function topeAlcanzado(monto: number, topes: TopeBono[]): (TopeBono & { nivel: number }) | null {
  let r: (TopeBono & { nivel: number }) | null = null
  topes.forEach((t, i) => { if (monto >= t.tope) r = { ...t, nivel: i + 1 } })
  return r
}

export interface BonoSugerido {
  clave: string
  tipo: 'equipo' | 'individual'
  monto: number
  concepto: string
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/** Bono para todos del día según las ventas netas del negocio */
export function bonoEquipoDelDia(ventasDelDia: number, bonos: BonosVentas): BonoSugerido | null {
  const t = topeAlcanzado(ventasDelDia, bonos.equipo)
  if (!t) return null
  return { clave: `equipo-${t.nivel}`, tipo: 'equipo', monto: t.bono, concepto: `Ventas del día pasaron ${pesos(t.tope)} (tope ${t.nivel})` }
}

/** Bonos individuales de un vendedor según cada una de sus ventas del día (agrupados por tope) */
export function bonosIndividualesDelDia(ventasDelVendedor: number[], bonos: BonosVentas): BonoSugerido[] {
  const porNivel = new Map<number, { t: TopeBono; n: number }>()
  for (const monto of ventasDelVendedor) {
    const t = topeAlcanzado(monto, bonos.individual)
    if (!t) continue
    const g = porNivel.get(t.nivel) ?? { t, n: 0 }
    g.n++
    porNivel.set(t.nivel, g)
  }
  return [...porNivel.entries()].sort((a, b) => a[0] - b[0]).map(([nivel, { t, n }]) => ({
    clave: `individual-${nivel}`,
    tipo: 'individual' as const,
    monto: t.bono * n,
    concepto: `${n} venta${n === 1 ? '' : 's'} de ${pesos(t.tope)} o más (tope ${nivel})`,
  }))
}
