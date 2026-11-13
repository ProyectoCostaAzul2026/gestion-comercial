// Unir un grupo de medidas dentro de otro de la misma familia (arrastrar una tarjeta sobre otra en Inventario).
// Las medidas del grupo de origen toman la característica y la marca del grupo de destino.
// La base no admite dos productos activos con el mismo nombre, marca y medida: aquí se detecta antes de guardar.
import type { NivelGrupo, ProductoInventario } from '@/lib/inventario-arbol'

export interface MedidaRepetida {
  medida: string
  origen: ProductoInventario
  destino: ProductoInventario
}

export interface PlanUnion {
  /** Medidas del origen que sí pueden pasar al destino */
  mover: ProductoInventario[]
  /** Medidas que ya existen en el destino: se quedan en el grupo de origen */
  repetidas: MedidaRepetida[]
  /** Las medidas que pasan cambian de marca (los grupos tenían marcas distintas) */
  cambiaMarca: boolean
  /**
   * Con cambio de marca hay dos pasos (nombre y marca) y a mitad de camino las medidas pasan por un grupo intermedio:
   * se elige el orden en el que ese paso intermedio no choca con un tercer grupo de la familia.
   */
  orden: 'nombre-primero' | 'marca-primero'
  /** Si no se puede unir, el motivo */
  error: string | null
}

/** "1/2  Pulgada" y "1/2 pulgada" son la misma medida */
export function claveMedida(medida: string | null): string {
  return (medida ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const igual = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

/** `grupos` son todos los grupos de la familia (para revisar que el paso intermedio no choque con un tercero) */
export function planearUnion(origen: NivelGrupo, destino: NivelGrupo, grupos: NivelGrupo[] = []): PlanUnion {
  const vacio = { mover: [], repetidas: [], cambiaMarca: false, orden: 'nombre-primero' as const }
  if (origen.clave === destino.clave) return { ...vacio, error: 'Suelta el grupo sobre otro distinto.' }
  if (origen.items.length === 0 || destino.items.length === 0) return { ...vacio, error: 'Uno de los grupos ya no tiene productos. Actualiza la página.' }

  const familiaOrigen = origen.items[0].familia_id
  const familiaDestino = destino.items[0].familia_id
  if (!familiaOrigen || !familiaDestino) return { ...vacio, error: 'Los productos sin familia no forman grupos de medidas: ponlos primero en una familia.' }
  if (familiaOrigen !== familiaDestino) return { ...vacio, error: 'Solo se pueden unir grupos de la misma familia.' }
  if (!destino.caracteristica?.trim()) return { ...vacio, error: 'El grupo de destino no tiene característica: edítalo primero.' }

  const enDestino = new Map(destino.items.map(p => [claveMedida(p.unidad_medida), p]))
  const mover: ProductoInventario[] = []
  const repetidas: MedidaRepetida[] = []
  // Dos medidas iguales dentro del mismo origen también chocarían entre sí al quedar con el mismo nombre y marca
  const vistas = new Set<string>()
  for (const p of origen.items) {
    const k = claveMedida(p.unidad_medida)
    const yaEsta = enDestino.get(k)
    if (yaEsta) repetidas.push({ medida: p.unidad_medida ?? 'Sin medida', origen: p, destino: yaEsta })
    else if (vistas.has(k)) repetidas.push({ medida: p.unidad_medida ?? 'Sin medida', origen: p, destino: p })
    else { vistas.add(k); mover.push(p) }
  }

  const cambiaMarca = !igual(origen.marca, destino.marca)
  const base = { mover, repetidas, cambiaMarca, orden: 'nombre-primero' as const }
  if (mover.length === 0) {
    return { ...base, error: 'Todas las medidas de este grupo ya existen en el grupo de destino. Para juntar dos productos repetidos, pasa el stock a uno y desactiva el otro.' }
  }
  if (!cambiaMarca) return { ...base, error: null }

  // ¿Alguna medida que pasa ya existe en el grupo intermedio (misma característica y marca que tendría a mitad de camino)?
  const chocaCon = (caracteristica: string | null, marca: string | null) => {
    const tercero = grupos.find(g => g.clave !== origen.clave && g.clave !== destino.clave && igual(g.caracteristica, caracteristica) && igual(g.marca, marca))
    if (!tercero) return false
    const medidas = new Set(tercero.items.map(p => claveMedida(p.unidad_medida)))
    return mover.some(p => medidas.has(claveMedida(p.unidad_medida)))
  }
  if (!chocaCon(destino.caracteristica, origen.marca)) return { ...base, error: null }
  if (!chocaCon(origen.caracteristica, destino.marca)) return { ...base, orden: 'marca-primero', error: null }
  return { ...base, error: 'Hay otros grupos de esta familia con las mismas medidas, característica o marca que impiden hacer el cambio. Une primero esos grupos o cambia la marca desde "Editar producto".' }
}
