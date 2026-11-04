// Precios por cantidad: desde cierta cantidad de un mismo producto, cada unidad vale menos (por ejemplo, desde 100
// tornillos, $250 c/u). Hasta 5 tramos por producto; no se combina con la venta por fracción.
// Las reglas son las mismas de las RPC registrar_venta, registrar_venta_credito, cambiar_productos y
// guardar_precios_cantidad (Supabase): si se cambia una aquí, hay que cambiarla allá (y al revés).

export const MAX_TRAMOS = 5

export interface TramoPrecio {
  /** Desde cuántas unidades aplica */
  cantidad_minima: number
  /** Lo que vale cada unidad desde esa cantidad */
  precio_unitario: number
}

/**
 * Tramo que aplica a una cantidad: el de mayor cantidad mínima que la cantidad alcance, entre los que son más baratos
 * que el precio normal (un tramo igual o más caro que el precio normal no se usa). null si ninguno aplica.
 */
export function tramoAplicable(
  tramos: readonly TramoPrecio[] | null | undefined,
  precioVenta: number,
  cantidad: number,
): TramoPrecio | null {
  let elegido: TramoPrecio | null = null
  for (const t of tramos ?? []) {
    if (t.cantidad_minima <= cantidad && t.precio_unitario < precioVenta
        && (elegido === null || t.cantidad_minima > elegido.cantidad_minima)) {
      elegido = t
    }
  }
  return elegido
}

/** Precio por unidad para una cantidad: el del tramo que aplica o, si ninguno, el precio normal. */
export function precioConCantidad(
  precioVenta: number,
  tramos: readonly TramoPrecio[] | null | undefined,
  cantidad: number,
): { precio: number; tramo: TramoPrecio | null } {
  const tramo = tramoAplicable(tramos, precioVenta, cantidad)
  return { precio: tramo ? tramo.precio_unitario : precioVenta, tramo }
}

/** El siguiente tramo que conviene: el más cercano por encima de la cantidad y más barato que lo que se paga hoy. */
export function siguienteTramo(
  tramos: readonly TramoPrecio[] | null | undefined,
  precioVenta: number,
  cantidad: number,
): TramoPrecio | null {
  const actual = precioConCantidad(precioVenta, tramos, cantidad).precio
  let siguiente: TramoPrecio | null = null
  for (const t of tramos ?? []) {
    if (t.cantidad_minima > cantidad && t.precio_unitario < actual
        && (siguiente === null || t.cantidad_minima < siguiente.cantidad_minima)) {
      siguiente = t
    }
  }
  return siguiente
}

/** Lo que vale el paquete de un tramo: su cantidad mínima por su precio por unidad. */
export function precioPaquete(t: TramoPrecio): number {
  return t.cantidad_minima * t.precio_unitario
}

/** Precio por unidad a partir del precio de un paquete, en pesos enteros. null si los datos no sirven. */
export function unitarioDePaquete(paquete: number, cantidad: number): number | null {
  if (!(cantidad >= 2) || !(paquete > 0)) return null
  const unitario = Math.round(paquete / cantidad)
  return unitario > 0 ? unitario : null
}

/** Ordena los tramos de menor a mayor cantidad mínima. */
export function ordenarTramos<T extends TramoPrecio>(tramos: readonly T[]): T[] {
  return [...tramos].sort((a, b) => a.cantidad_minima - b.cantidad_minima)
}

export interface DatosTramos {
  /** Precio normal de venta */
  precioVenta: number
  /** productos.precio_costo_base (0 o null si no tiene) */
  costo: number | null
  tieneIva: boolean
  ivaIncluido: boolean
  porcentajeIva: number
  ventaPorFraccion: boolean
}

/** Precio mínimo por unidad para no vender bajo el costo (margen 0, como calcularMargenCalculado). 0 sin costo. */
export function precioMinimoTramo(d: Pick<DatosTramos, 'costo' | 'tieneIva' | 'ivaIncluido' | 'porcentajeIva'>): number {
  const costo = d.costo ?? 0
  if (!(costo > 0)) return 0
  const iva = d.porcentajeIva / 100
  const costoNeto = d.tieneIva && d.ivaIncluido ? costo / (1 + iva) : costo
  return costoNeto * (1 + iva)
}

/**
 * Precio por unidad sugerido para un tramo con un margen (en %), como calcularPrecioVentaSugerido, redondeado hacia
 * arriba al peso entero: en un paquete el redondeo a $50 o $100 de la escala sería demasiado grueso. 0 sin costo.
 */
export function precioSugeridoTramo(d: Pick<DatosTramos, 'costo' | 'tieneIva' | 'ivaIncluido' | 'porcentajeIva'>, margen: number): number {
  const costo = d.costo ?? 0
  if (!(costo > 0) || !(margen >= 0 && margen < 100)) return 0
  const iva = d.porcentajeIva / 100
  const costoNeto = d.tieneIva && d.ivaIncluido ? costo / (1 + iva) : costo
  return Math.ceil(costoNeto * (1 + iva) / (1 - margen / 100) - 1e-9)
}

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`

/**
 * Problemas de una lista de tramos, con las mismas reglas que guardar_precios_cantidad: máximo 5, sin venta por
 * fracción, cantidades enteras desde 2 sin repetir, precios mayores que 0, menores que el precio normal, más baratos
 * a mayor cantidad y no bajo el costo. Lista vacía si están bien.
 */
export function erroresTramos(tramos: readonly TramoPrecio[], d: DatosTramos): string[] {
  const errores: string[] = []
  if (tramos.length === 0) return errores
  if (tramos.length > MAX_TRAMOS) errores.push(`Máximo ${MAX_TRAMOS} precios por cantidad`)
  if (d.ventaPorFraccion) errores.push('Un producto que se vende por fracción no admite precios por cantidad')
  const minimo = precioMinimoTramo(d)
  let anterior: TramoPrecio | null = null
  for (const t of ordenarTramos(tramos)) {
    const desde = `Desde ${t.cantidad_minima}`
    if (!Number.isInteger(t.cantidad_minima) || t.cantidad_minima < 2) {
      errores.push('La cantidad de cada precio debe ser un número entero desde 2')
    } else if (anterior && t.cantidad_minima === anterior.cantidad_minima) {
      errores.push(`Hay dos precios desde ${t.cantidad_minima} unidades`)
    }
    if (!(t.precio_unitario > 0)) {
      errores.push(`${desde}: escribe el precio`)
    } else {
      if (t.precio_unitario >= d.precioVenta) {
        errores.push(`${desde}: ${pesos(t.precio_unitario)} c/u debe ser menor que el precio normal (${pesos(d.precioVenta)})`)
      }
      if (anterior && anterior.precio_unitario > 0 && t.precio_unitario >= anterior.precio_unitario) {
        errores.push(`${desde}: debe ser más barato que desde ${anterior.cantidad_minima} (${pesos(anterior.precio_unitario)} c/u)`)
      }
      if (minimo > 0 && t.precio_unitario < minimo - 1e-6) {
        errores.push(`${desde}: ${pesos(t.precio_unitario)} c/u queda bajo el costo`)
      }
    }
    anterior = t
  }
  return errores
}
