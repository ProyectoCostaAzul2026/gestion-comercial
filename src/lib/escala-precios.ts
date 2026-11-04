// Motor de precios por medida: orden de las medidas, redondeo, precio sugerido por margen, costos estimados y alertas
// de la escala. Lo usan el grupo de medidas (escala de precios) y el formulario de producto; más adelante también los
// precios por cantidad y la recepción de mercancía.

import { calcularMargenCalculado, calcularPrecioVentaSugerido } from './precio-utils'

// ── Redondeo ──

export type ModoRedondeo = 'auto' | '50' | '100'

export const MODOS_REDONDEO: { valor: ModoRedondeo; etiqueta: string }[] = [
  { valor: 'auto', etiqueta: 'Automático ($50 o $100)' },
  { valor: '50', etiqueta: 'A $50' },
  { valor: '100', etiqueta: 'A $100' },
]

/** Paso de redondeo. En automático: $50 (la moneda más pequeña que circula) bajo $1.000 y $100 desde $1.000. */
export function pasoRedondeo(precio: number, modo: ModoRedondeo = 'auto'): number {
  if (modo === '50') return 50
  if (modo === '100') return 100
  return precio < 1000 ? 50 : 100
}

/** Redondea hacia arriba al paso, para no quedar por debajo del margen pedido. */
export function redondearPrecio(precio: number, modo: ModoRedondeo = 'auto'): number {
  if (!(precio > 0)) return 0
  const limpio = Math.round(precio * 100) / 100
  const paso = pasoRedondeo(limpio, modo)
  return Math.ceil(limpio / paso) * paso
}

// ── Precio y margen ──

export interface DatosPrecio {
  /** Costo base del producto (el del proveedor marcado como base o el menor) */
  costo: number
  tieneIva: boolean
  ivaIncluido: boolean
  porcentajeIva: number
}

/** Precio de venta sugerido para un margen, redondeado. 0 si no hay costo o el margen no es válido. */
export function precioSugerido(datos: DatosPrecio, margen: number, modo: ModoRedondeo = 'auto'): number {
  if (!(datos.costo > 0) || !(margen >= 0 && margen < 100)) return 0
  const precio = calcularPrecioVentaSugerido(datos.costo, margen, datos.tieneIva, datos.ivaIncluido, datos.porcentajeIva)
  return redondearPrecio(precio, modo)
}

/** Margen que deja un precio con ese costo (null si falta el costo o el precio). */
export function margenResultante(datos: DatosPrecio, precio: number): number | null {
  if (!(datos.costo > 0) || !(precio > 0)) return null
  return calcularMargenCalculado(datos.costo, precio, datos.tieneIva, datos.ivaIncluido, datos.porcentajeIva)
}

// ── Medidas ──

export interface MedidaLeida {
  /** Texto completo de productos.unidad_medida */
  texto: string
  /** Última palabra: Pulgada, mm, Metro… */
  unidad: string
  /** Dimensiones numéricas (6x1-1/2 → [6, 1.5]); null si la medida no es numérica (Ref, Cat 6, Corto…) */
  valores: number[] | null
  /** La medida sin su última dimensión (6x1-1/2 → "6"); vacío si tiene una sola dimensión */
  prefijo: string
}

function leerNumero(parte: string): number | null {
  const p = parte.trim().replace(/^[m#]/i, '').replace(',', '.')
  let m = p.match(/^(\d+(?:\.\d+)?)-(\d+)\/(\d+)$/) // 1-1/4
  if (m) return Number(m[3]) === 0 ? null : Number(m[1]) + Number(m[2]) / Number(m[3])
  m = p.match(/^(\d+)\/(\d+)$/) // 3/4
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2])
  if (/^\d+(\.\d+)?$/.test(p)) return Number(p) // 6, 3.5, M8 → 8
  return null
}

/** Lee "<medida> <Unidad>" (la unidad es la última palabra, como en parseUnidadMedida del formulario de producto). */
export function leerMedida(unidadMedida: string | null | undefined): MedidaLeida {
  const texto = (unidadMedida ?? '').trim()
  const corte = texto.lastIndexOf(' ')
  const medida = corte >= 0 ? texto.slice(0, corte).trim() : ''
  const unidad = corte >= 0 ? texto.slice(corte + 1) : texto
  if (!medida) return { texto, unidad, valores: null, prefijo: '' }
  const partes = medida.split(/x/i)
  const valores = partes.map(leerNumero)
  const numerica = valores.every(v => v !== null)
  return {
    texto,
    unidad,
    valores: numerica ? (valores as number[]) : null,
    prefijo: numerica && partes.length > 1 ? partes.slice(0, -1).join('x') : '',
  }
}

/** Orden por tamaño: unidad, luego cada dimensión de menor a mayor (calibre o diámetro y después largo). */
export function compararMedidas(a: MedidaLeida, b: MedidaLeida): number {
  if (a.unidad !== b.unidad) return a.unidad.localeCompare(b.unidad, 'es')
  if (a.valores && b.valores) {
    const n = Math.max(a.valores.length, b.valores.length)
    for (let i = 0; i < n; i++) {
      const va = a.valores[i] ?? -Infinity
      const vb = b.valores[i] ?? -Infinity
      if (va !== vb) return va - vb
    }
    return 0
  }
  if (a.valores) return -1
  if (b.valores) return 1
  return a.texto.localeCompare(b.texto, 'es', { numeric: true })
}

/** Serie de una medida: su unidad y todas sus dimensiones menos la última (en tornillos, el calibre o diámetro). */
export function serieDe(m: MedidaLeida): string {
  return m.prefijo ? `${m.unidad}|${m.prefijo.toLowerCase()}` : m.unidad
}

export interface ConMedida {
  unidad_medida: string | null
  /** Orden manual dentro del grupo (null = automático por tamaño) */
  orden_medida?: number | null
}

/** Ordena los miembros de un grupo: primero el orden manual, si lo hay; si no, por tamaño. */
export function ordenarPorMedida<T extends ConMedida>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const oa = a.orden_medida ?? null
    const ob = b.orden_medida ?? null
    if (oa !== ob) {
      if (oa === null) return 1
      if (ob === null) return -1
      return oa - ob
    }
    return compararMedidas(leerMedida(a.unidad_medida), leerMedida(b.unidad_medida))
  })
}

// ── Costos estimados ──

/**
 * Costo de cada medida para la escala, en el orden recibido: el real si es mayor que 0; si no, uno estimado entre las
 * medidas vecinas de la misma serie con costo (interpolando por la última dimensión). Sin vecinas en la serie, se usa
 * el orden de todo el grupo. Sin ningún costo en el grupo, queda en 0.
 */
export function estimarCostos(filas: { costo: number; medida: MedidaLeida }[]): { costo: number; estimado: boolean }[] {
  const conCosto = (i: number) => filas[i].costo > 0
  const posicion = (i: number, usarValor: boolean) => {
    const v = filas[i].medida.valores
    return usarValor && v ? v[v.length - 1] : i
  }
  const interpolar = (i: number, candidatas: number[], usarValor: boolean): number | null => {
    const x = posicion(i, usarValor)
    let antes: number | null = null
    let despues: number | null = null
    for (const j of candidatas) {
      const xj = posicion(j, usarValor)
      if (xj === x) return filas[j].costo
      if (xj < x && (antes === null || xj > posicion(antes, usarValor))) antes = j
      if (xj > x && (despues === null || xj < posicion(despues, usarValor))) despues = j
    }
    if (antes !== null && despues !== null) {
      const x0 = posicion(antes, usarValor)
      const x1 = posicion(despues, usarValor)
      const c0 = filas[antes].costo
      const c1 = filas[despues].costo
      return c0 + ((c1 - c0) * (x - x0)) / (x1 - x0)
    }
    if (antes !== null) return filas[antes].costo
    if (despues !== null) return filas[despues].costo
    return null
  }

  return filas.map((fila, i) => {
    if (conCosto(i)) return { costo: fila.costo, estimado: false }
    const serie = serieDe(fila.medida)
    const enSerie = filas.map((_, j) => j).filter(j => j !== i && conCosto(j) && serieDe(filas[j].medida) === serie)
    const usarValor = enSerie.every(j => filas[j].medida.valores) && fila.medida.valores !== null
    let costo = interpolar(i, enSerie, usarValor)
    if (costo === null) costo = interpolar(i, filas.map((_, j) => j).filter(j => j !== i && conCosto(j)), false)
    return costo === null ? { costo: 0, estimado: false } : { costo: Math.round(costo * 100) / 100, estimado: true }
  })
}

// ── Alertas de la escala ──

export type AlertaEscala = 'perdida' | 'baja' | 'igual' | 'salto'

export const TEXTO_ALERTA: Record<AlertaEscala, string> = {
  perdida: 'Por debajo del costo',
  baja: 'Más barata que la medida anterior',
  igual: 'Mismo precio que la medida anterior',
  salto: 'Más del doble que la medida anterior',
}

/**
 * Alertas de cada fila, en el orden recibido (ya ordenado por medida). Compara cada precio con la medida anterior de
 * su misma serie: más barata, igual o más del doble (si además sube más de un paso de redondeo). Marca también los
 * precios que no cubren el costo.
 */
export function alertasEscala(
  filas: { serie: string; precio: number; datos: DatosPrecio }[],
  modo: ModoRedondeo = 'auto',
): AlertaEscala[][] {
  const anteriorPorSerie = new Map<string, number>()
  return filas.map(fila => {
    const alertas: AlertaEscala[] = []
    if (!(fila.precio > 0)) return alertas
    const margen = margenResultante(fila.datos, fila.precio)
    if (margen !== null && margen < 0) alertas.push('perdida')
    const anterior = anteriorPorSerie.get(fila.serie)
    if (anterior !== undefined) {
      if (fila.precio < anterior) alertas.push('baja')
      else if (fila.precio === anterior) alertas.push('igual')
      else if (fila.precio > anterior * 2 && fila.precio - anterior > pasoRedondeo(anterior, modo)) alertas.push('salto')
    }
    anteriorPorSerie.set(fila.serie, fila.precio)
    return alertas
  })
}
