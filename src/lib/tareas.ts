// Hoja de tareas: tipos, orden y textos compartidos por la página y el Inicio.

export type Prioridad = 'alta' | 'media' | 'baja'

export interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  prioridad: Prioridad
  asignado_a: string | null
  fecha_limite: string | null
  estado: 'pendiente' | 'hecha'
  hecha_por: string | null
  hecha_en: string | null
  nota: string | null
  plantilla_id: string | null
  created_at: string
}

export interface PlantillaTarea {
  id: string
  titulo: string
  descripcion: string | null
  prioridad: Prioridad
  asignado_a: string | null
  veces_usada: number
}

export const PRIORIDADES: { valor: Prioridad; etiqueta: string }[] = [
  { valor: 'alta', etiqueta: 'Alta' },
  { valor: 'media', etiqueta: 'Media' },
  { valor: 'baja', etiqueta: 'Baja' },
]

const PESO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 }

/** Pendientes: primero las vencidas, luego por prioridad y por fecha límite (sin fecha al final) */
export function ordenarPendientes(tareas: Tarea[], hoy: string): Tarea[] {
  return [...tareas].sort((a, b) => {
    const va = a.fecha_limite !== null && a.fecha_limite < hoy ? 0 : 1
    const vb = b.fecha_limite !== null && b.fecha_limite < hoy ? 0 : 1
    if (va !== vb) return va - vb
    if (PESO[a.prioridad] !== PESO[b.prioridad]) return PESO[a.prioridad] - PESO[b.prioridad]
    if (a.fecha_limite !== b.fecha_limite) {
      if (a.fecha_limite === null) return 1
      if (b.fecha_limite === null) return -1
      return a.fecha_limite.localeCompare(b.fecha_limite)
    }
    return a.created_at.localeCompare(b.created_at)
  })
}

/** "Vence hoy", "Venció hace 2 días", "Vence en 3 días", o la fecha */
export function textoVencimiento(fecha: string | null, hoy: string): { texto: string; vencida: boolean; hoy: boolean } | null {
  if (!fecha) return null
  const dias = Math.round((Date.parse(fecha + 'T12:00:00Z') - Date.parse(hoy + 'T12:00:00Z')) / 86400000)
  if (dias === 0) return { texto: 'Vence hoy', vencida: false, hoy: true }
  if (dias < 0) return { texto: `Venció hace ${-dias} día${dias === -1 ? '' : 's'}`, vencida: true, hoy: false }
  if (dias === 1) return { texto: 'Vence mañana', vencida: false, hoy: false }
  if (dias <= 7) return { texto: `Vence en ${dias} días`, vencida: false, hoy: false }
  return { texto: `Vence el ${fecha}`, vencida: false, hoy: false }
}
