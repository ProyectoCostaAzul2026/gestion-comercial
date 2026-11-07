// Recepción de mercancía: cuentas del conteo, diferencias, costos con o sin IVA y precios propuestos.
// Flujo: transcribir → el administrador aprueba precios → contar (sabiendo el precio, repartiendo entre almacén y bodega)
// → cerrar. Replica las reglas de las RPC de recepción (contar_renglon_recepcion, aprobar_precios_recepcion y cerrar_recepcion):
// si cambias una, cambia la otra.

import { margenResultante, precioSugerido, type ModoRedondeo } from './escala-precios'

export type EstadoRecepcion = 'abierta' | 'reclamacion' | 'cerrada'

export const ETIQUETA_ESTADO_RECEPCION: Record<EstadoRecepcion, string> = {
  abierta: 'Abierta',
  reclamacion: 'Reclamación pendiente',
  cerrada: 'Cerrada',
}

/** Lo que se cuenta de un renglón */
export interface ConteoRenglon {
  cantidad_facturada: number
  cantidad_contada: number | null
  cantidad_averiada: number
}

/** Unidades buenas de un conteo: las que entran al inventario (contadas menos averiadas). 0 si no se ha contado. */
export function unidadesBuenas(r: Pick<ConteoRenglon, 'cantidad_contada' | 'cantidad_averiada'>): number {
  if (r.cantidad_contada == null) return 0
  return Math.max(r.cantidad_contada - (r.cantidad_averiada ?? 0), 0)
}

/**
 * Un renglón se cuenta sabiendo su precio: necesita el producto y el precio aprobado por el administrador. Misma regla
 * que contar_renglon_recepcion. null si se puede contar; si no, el motivo.
 */
export function motivoNoContable(r: { producto_id: string | null; precio_aprobado: number | null }): string | null {
  if (!r.producto_id) return 'Falta el producto: el administrador debe crearlo o asociarlo'
  if (r.precio_aprobado == null) return 'Falta que el administrador apruebe el precio'
  return null
}

/** Cómo se reparten las unidades buenas: `almacen` van al almacén y el resto a la bodega */
export interface RepartoConteo {
  almacen: number
  bodega: number
}

/**
 * Valida un conteo como contar_renglon_recepcion y devuelve el reparto entre almacén y bodega, o el mensaje de error.
 * `almacen` es cuántas de las buenas (contadas − averiadas) van al almacén; el resto entra a la bodega.
 */
export function validarConteo(contadas: number, averiadas: number, almacen: number):
  { ok: true; reparto: RepartoConteo } | { ok: false; error: string } {
  if (!Number.isInteger(contadas) || contadas < 0) return { ok: false, error: 'Escribe cuántas unidades contaste' }
  if (!Number.isInteger(averiadas) || averiadas < 0 || averiadas > contadas) {
    return { ok: false, error: 'Las averiadas no pueden ser más que las contadas' }
  }
  const buenas = contadas - averiadas
  if (!Number.isInteger(almacen) || almacen < 0 || almacen > buenas) {
    return { ok: false, error: `Lo que va al almacén no puede ser más que las unidades buenas (${buenas})` }
  }
  return { ok: true, reparto: { almacen, bodega: buenas - almacen } }
}

/** Texto del reparto: "10 al almacén y 5 a la bodega" */
export function textoReparto(r: RepartoConteo): string {
  const partes: string[] = []
  if (r.almacen > 0) partes.push(`${r.almacen} al almacén`)
  if (r.bodega > 0) partes.push(`${r.bodega} a la bodega`)
  return partes.length ? partes.join(' y ') : 'nada entra al inventario'
}

export interface DiferenciaRenglon {
  faltan: number
  sobran: number
  averiadas: number
  /** Sin faltantes, sobrantes ni averiadas */
  cuadra: boolean
}

/** Diferencia entre lo contado y lo facturado; null si el renglón no se ha contado. Misma regla que cerrar_recepcion. */
export function diferenciaRenglon(r: ConteoRenglon): DiferenciaRenglon | null {
  if (r.cantidad_contada == null) return null
  const faltan = Math.max(r.cantidad_facturada - r.cantidad_contada, 0)
  const sobran = Math.max(r.cantidad_contada - r.cantidad_facturada, 0)
  const averiadas = r.cantidad_averiada ?? 0
  return { faltan, sobran, averiadas, cuadra: faltan === 0 && sobran === 0 && averiadas === 0 }
}

/** Redondeo a centavos como round(numeric, 2) de Postgres (hacia arriba en la mitad), sin el error de los decimales. */
export function redondearCentavos(valor: number): number {
  return Math.round((valor + Math.sign(valor) * 1e-9) * 100) / 100
}

export interface IvaProducto {
  tieneIva: boolean
  /** El costo del producto trae el IVA */
  ivaIncluido: boolean
  porcentajeIva: number
}

/**
 * Costo de un renglón en la forma en que el producto guarda su costo (con o sin IVA), como aprobar_precios_recepcion:
 * si la factura trae los costos con IVA y el producto guarda el costo sin IVA, se le quita; al revés, se le suma.
 */
export function costoParaProducto(costo: number, costosConIva: boolean, p: IvaProducto): number {
  const factor = 1 + p.porcentajeIva / 100
  let valor = costo
  if (p.tieneIva && costosConIva && !p.ivaIncluido) valor = costo / factor
  else if (p.tieneIva && !costosConIva && p.ivaIncluido) valor = costo * factor
  return redondearCentavos(valor)
}

/**
 * Precio que se propone al aprobar: el mayor entre el actual y el sugerido, para no bajar precios sin querer. Un
 * producto nuevo (inactivo) trae el precio heredado de su familia, así que se le propone el sugerido.
 */
export function precioPropuesto(actual: number, sugerido: number, activo: boolean): number {
  if (!activo) return sugerido > 0 ? sugerido : actual
  return Math.max(actual, sugerido)
}

export interface PrecioRenglon {
  costoNuevo: number
  sugerido: number
  margen: number | null
}

/** Costo nuevo, precio sugerido con el margen y margen que deja un precio, para un renglón con producto. */
export function preciosDelRenglon(costo: number, costosConIva: boolean, p: IvaProducto, margenDeseado: number,
  precio: number, modo: ModoRedondeo = 'auto'): PrecioRenglon {
  const costoNuevo = costoParaProducto(costo, costosConIva, p)
  const datos = { costo: costoNuevo, tieneIva: p.tieneIva, ivaIncluido: p.ivaIncluido, porcentajeIva: p.porcentajeIva }
  return {
    costoNuevo,
    sugerido: precioSugerido(datos, margenDeseado, modo),
    margen: margenResultante(datos, precio),
  }
}

/**
 * Convierte empaques en unidades: 2 cajas x100 a $5.000 la caja son 200 unidades a $50. El costo por unidad se
 * redondea a centavos. null si falta un dato o no es válido.
 */
export function convertirEmpaque(empaques: number, unidadesPorEmpaque: number, costoPorEmpaque: number):
  { cantidad: number; costoUnitario: number } | null {
  if (!Number.isInteger(empaques) || empaques <= 0) return null
  if (!Number.isInteger(unidadesPorEmpaque) || unidadesPorEmpaque <= 0) return null
  if (!(costoPorEmpaque >= 0)) return null
  return {
    cantidad: empaques * unidadesPorEmpaque,
    costoUnitario: redondearCentavos(costoPorEmpaque / unidadesPorEmpaque),
  }
}

/** Lo que se necesita de un renglón para saber si la recepción se puede cerrar */
export interface RenglonParaCerrar extends ConteoRenglon {
  producto_id: string | null
  precio_aprobado: number | null
}

/**
 * Lo que falta para cerrar, con los mismos chequeos y en el mismo orden que cerrar_recepcion (vacío: se puede). El orden
 * sigue el flujo: producto, precio aprobado y conteo.
 */
export function pendientesParaCerrar(renglones: RenglonParaCerrar[]): string[] {
  if (renglones.length === 0) return ['La recepción no tiene renglones']
  const pendientes: string[] = []
  const sinProducto = renglones.filter(r => !r.producto_id).length
  const sinContar = renglones.filter(r => r.cantidad_contada == null).length
  const sinPrecio = renglones.filter(r => r.producto_id && r.precio_aprobado == null).length
  if (sinProducto > 0) pendientes.push(`Hay renglones sin producto (${sinProducto}): créalos o asócialos antes de cerrar`)
  if (sinPrecio > 0) pendientes.push('Aprueba los precios antes de cerrar')
  if (sinContar > 0) pendientes.push(`Hay renglones sin contar (${sinContar})`)
  return pendientes
}

/** Si algún renglón contado no cuadra con la factura (entonces el cierre pide la nota de reclamación) */
export function hayDiferencias(renglones: ConteoRenglon[]): boolean {
  return renglones.some(r => {
    const d = diferenciaRenglon(r)
    return d !== null && !d.cuadra
  })
}

/** Renglón para sumar la factura: porcentajeIva null cuando aún no tiene producto (se estima con el 19 %) */
export interface RenglonParaSumar {
  cantidad_facturada: number
  costo_unitario: number
  porcentajeIva: number | null
}

/**
 * Suma de los renglones tal como vienen en la factura y con el IVA estimado, para compararla con el total. Si los
 * costos ya traen el IVA, las dos sumas son iguales.
 */
export function sumaRenglones(renglones: RenglonParaSumar[], costosConIva: boolean): { valor: number; conIva: number } {
  let valor = 0
  let conIva = 0
  for (const r of renglones) {
    const linea = r.cantidad_facturada * r.costo_unitario
    valor += linea
    conIva += costosConIva ? linea : linea * (1 + (r.porcentajeIva ?? 19) / 100)
  }
  return { valor: redondearCentavos(valor), conIva: redondearCentavos(conIva) }
}

/** La suma cuadra con el total de la factura si la diferencia no pasa del 1 % (redondeos, fletes pequeños). */
export function cuadraConTotal(suma: number, totalFactura: number): boolean {
  if (!(totalFactura > 0)) return false
  return Math.abs(suma - totalFactura) <= totalFactura * 0.01
}
