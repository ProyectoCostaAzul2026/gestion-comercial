// Conteo de inventario: se recorre una ubicación, un grupo o una búsqueda con el celular, se escribe lo contado en
// almacén y en bodega (o se pesa, si el producto tiene peso por unidad) y se guardan todos los ajustes en un solo paso.
// La función registrar_conteo_inventario de la base replica estas reglas: si cambias una, cambia la otra.

export interface ProductoConteo {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  unidad_medida: string | null
  ubicacion: string | null
  categoria_id: string | null
  familia_id: string | null
  caracteristica: string | null
  stock_almacen: number
  stock_bodega: number
  peso_unitario_g: number | null
  vender_por_fraccion: boolean
}

/** Lo escrito para un producto; '' = ese lugar no se contó y su stock no cambia */
export interface Contado {
  almacen: string
  bodega: string
  /** Se usó la báscula en alguno de los dos lugares */
  porPeso?: boolean
}

export interface LineaConteo {
  producto: ProductoConteo
  almacen: number | null
  bodega: number | null
  /** Diferencia total frente al sistema (contado menos sistema) */
  diferencia: number
  porPeso: boolean
}

/** Entero no negativo escrito por el usuario, o null si está vacío o no es válido */
export function leerCantidad(texto: string): number | null {
  const t = texto.trim()
  if (t === '' || !/^\d+$/.test(t)) return null
  return Number(t)
}

/** Productos con algo contado, con su diferencia frente al sistema */
export function lineasContadas(productos: ProductoConteo[], contados: Record<string, Contado>): LineaConteo[] {
  const lineas: LineaConteo[] = []
  for (const producto of productos) {
    const c = contados[producto.id]
    if (!c) continue
    const almacen = leerCantidad(c.almacen)
    const bodega = leerCantidad(c.bodega)
    if (almacen === null && bodega === null) continue
    const diferencia = (almacen === null ? 0 : almacen - producto.stock_almacen) + (bodega === null ? 0 : bodega - producto.stock_bodega)
    lineas.push({ producto, almacen, bodega, diferencia, porPeso: !!c.porPeso })
  }
  return lineas
}

/**
 * Lo que se envía a la base. Lleva el stock que mostraba la pantalla (`esperado_*`): si entre tanto hubo una venta o una
 * recepción, la base rechaza ese producto en lugar de borrar ese movimiento con el conteo.
 */
export function cargaConteo(lineas: LineaConteo[]) {
  return lineas
    .filter(l => (l.almacen !== null && l.almacen !== l.producto.stock_almacen) || (l.bodega !== null && l.bodega !== l.producto.stock_bodega))
    .map(l => ({
      producto_id: l.producto.id,
      stock_almacen: l.almacen,
      stock_bodega: l.bodega,
      esperado_almacen: l.producto.stock_almacen,
      esperado_bodega: l.producto.stock_bodega,
      por_peso: l.porPeso,
    }))
}
