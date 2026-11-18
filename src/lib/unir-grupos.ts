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
  /** Si no se puede unir, el motivo */
  error: string | null
}

/** "1/2  Pulgada" y "1/2 pulgada" son la misma medida */
export function claveMedida(medida: string | null): string {
  return (medida ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const igual = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

/** La unión la guarda la RPC unir_grupos_medidas en una sola transacción (característica y marca juntas) */
export function planearUnion(origen: NivelGrupo, destino: NivelGrupo): PlanUnion {
  const vacio = { mover: [], repetidas: [], cambiaMarca: false }
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
  const base = { mover, repetidas, cambiaMarca }
  if (mover.length === 0) {
    return { ...base, error: 'Todas las medidas de este grupo ya existen en el grupo de destino. Para juntar dos productos repetidos, pasa el stock a uno y desactiva el otro.' }
  }
  return { ...base, error: null }
}
