// Árbol del inventario por tarjetas: categoría → familia → grupo de medidas → productos.
// Todo se arma en el navegador con la lista de productos activos que trae la página.
import { ordenarPorMedida } from '@/lib/escala-precios'

export interface ProductoInventario {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  ubicacion: string | null
  unidad_medida: string | null
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  familia_id: string | null
  caracteristica: string | null
  orden_medida: number | null
  categoria_id: string | null
  imagen_url: string | null
}

export interface Resumen {
  productos: number
  stock: number
  /** Productos con stock en 0 */
  agotados: number
  precioMin: number
  precioMax: number
  /** Imagen de referencia: la del primer producto que tenga una */
  imagen: string | null
}

/** Clave de las tarjetas que no tienen categoría o familia */
export const SIN = 'sin'

export interface NivelCategoria { id: string; nombre: string; familias: number; resumen: Resumen }
export interface NivelFamilia { id: string; nombre: string; grupos: number; resumen: Resumen }
export interface NivelGrupo {
  clave: string
  /** Nombre del grupo: el del producto (familia - característica) */
  nombre: string
  caracteristica: string | null
  marca: string | null
  resumen: Resumen
  items: ProductoInventario[]
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' })

export function resumir(items: ProductoInventario[]): Resumen {
  let stock = 0, agotados = 0, precioMin = Infinity, precioMax = 0
  let imagen: string | null = null
  for (const p of items) {
    stock += p.stock_actual
    if (p.stock_actual <= 0) agotados++
    const precio = Number(p.precio_venta)
    if (precio < precioMin) precioMin = precio
    if (precio > precioMax) precioMax = precio
    if (!imagen && p.imagen_url) imagen = p.imagen_url
  }
  return { productos: items.length, stock, agotados, precioMin: items.length ? precioMin : 0, precioMax, imagen }
}

export const claveCategoria = (p: ProductoInventario) => p.categoria_id ?? SIN
export const claveFamilia = (p: ProductoInventario) => p.familia_id ?? SIN

/** Grupo de medidas: misma familia, característica y marca. Un producto sin familia es su propio grupo. */
export function claveGrupo(p: ProductoInventario): string {
  return p.familia_id ? `${p.caracteristica ?? ''}|${p.marca ?? ''}` : `p:${p.id}`
}

function agrupar<T>(items: T[], clave: (item: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const item of items) {
    const k = clave(item)
    const lista = mapa.get(k)
    if (lista) lista.push(item); else mapa.set(k, [item])
  }
  return mapa
}

export function nivelCategorias(productos: ProductoInventario[], categorias: { id: string; nombre: string }[]): NivelCategoria[] {
  const nombres = new Map(categorias.map(c => [c.id, c.nombre]))
  // Todas las categorías aparecen, también las que aún no tienen productos (recién creadas)
  const porCategoria = agrupar(productos, claveCategoria)
  for (const c of categorias) if (!porCategoria.has(c.id)) porCategoria.set(c.id, [])
  return [...porCategoria.entries()]
    .map(([id, items]) => ({
      id,
      nombre: id === SIN ? 'Sin categoría' : (nombres.get(id) ?? 'Categoría'),
      familias: new Set(items.map(claveFamilia)).size,
      resumen: resumir(items),
    }))
    .sort((a, b) => (a.id === SIN ? 1 : b.id === SIN ? -1 : comparar(a.nombre, b.nombre)))
}

export function nivelFamilias(
  productos: ProductoInventario[],
  categoriaId: string,
  familias: { id: string; nombre_base: string }[],
): NivelFamilia[] {
  const nombres = new Map(familias.map(f => [f.id, f.nombre_base]))
  const enCategoria = productos.filter(p => claveCategoria(p) === categoriaId)
  return [...agrupar(enCategoria, claveFamilia).entries()]
    .map(([id, items]) => ({
      id,
      nombre: id === SIN ? 'Sin familia' : (nombres.get(id) ?? items[0].nombre.split(' - ')[0]),
      grupos: new Set(items.map(claveGrupo)).size,
      resumen: resumir(items),
    }))
    .sort((a, b) => (a.id === SIN ? 1 : b.id === SIN ? -1 : comparar(a.nombre, b.nombre)))
}

export function nivelGrupos(productos: ProductoInventario[], categoriaId: string, familiaId: string): NivelGrupo[] {
  const enFamilia = productos.filter(p => claveCategoria(p) === categoriaId && claveFamilia(p) === familiaId)
  return [...agrupar(enFamilia, claveGrupo).entries()]
    .map(([clave, items]) => {
      const ordenados = ordenarPorMedida(items)
      return {
        clave,
        nombre: ordenados[0].nombre,
        caracteristica: ordenados[0].caracteristica,
        marca: ordenados[0].marca,
        resumen: resumir(ordenados),
        items: ordenados,
      }
    })
    .sort((a, b) => comparar(a.nombre, b.nombre) || comparar(a.marca ?? '', b.marca ?? ''))
}

// Búsqueda: todas las palabras deben aparecer en el código, nombre, marca, medida o ubicación (sin tildes ni mayúsculas)
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con', 'para', 'un', 'una'])

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function buscarProductos(productos: ProductoInventario[], query: string): ProductoInventario[] {
  const tokens = normalizar(query).split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t))
  if (tokens.length === 0) return []
  return productos.filter(p => {
    const texto = normalizar([p.codigo, p.nombre, p.marca, p.unidad_medida, p.ubicacion].filter(Boolean).join(' '))
    return tokens.every(t => texto.includes(t))
  })
}

/** Separa "Codo - PVC Presion" en familia y característica (null si el nombre no sigue la convención) */
export function separarNombre(nombre: string): { familia: string; caracteristica: string } | null {
  const i = nombre.indexOf(' - ')
  if (i <= 0) return null
  const familia = nombre.slice(0, i).trim()
  const caracteristica = nombre.slice(i + 3).trim()
  if (!familia || !caracteristica || caracteristica.includes(' - ')) return null
  return { familia, caracteristica }
}

export const pesos = (v: number) => `$${Number(v).toLocaleString('es-CO')}`

export function rangoPrecios(r: Resumen): string {
  if (r.productos === 0) return '—'
  return r.precioMin === r.precioMax ? pesos(r.precioMin) : `${pesos(r.precioMin)} a ${pesos(r.precioMax)}`
}
