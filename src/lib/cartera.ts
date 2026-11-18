// Cartera por edades: lo que deben los clientes (créditos) y lo que se debe a los proveedores (facturas), repartido
// por cuántos días lleva vencido cada saldo.
import { diasEntre } from './periodos'

export type Tramo = 'por_vencer' | 'd1_30' | 'd31_60' | 'd61_90' | 'mas_90'

export const TRAMOS: { clave: Tramo; label: string; corto: string; color: string }[] = [
  { clave: 'por_vencer', label: 'Por vencer', corto: 'Al día', color: '#34d399' },
  { clave: 'd1_30', label: '1 a 30 días vencido', corto: '1-30', color: '#fbbf24' },
  { clave: 'd31_60', label: '31 a 60 días vencido', corto: '31-60', color: '#f97316' },
  { clave: 'd61_90', label: '61 a 90 días vencido', corto: '61-90', color: '#e8453f' },
  { clave: 'mas_90', label: 'Más de 90 días vencido', corto: '+90', color: '#991b1b' },
]

/** Días de mora (0 si aún no vence) */
export function diasVencido(vencimiento: string | null, hoy: string): number {
  if (!vencimiento || vencimiento >= hoy) return 0
  return diasEntre(vencimiento, hoy) - 1
}

export function tramoDe(vencimiento: string | null, hoy: string): Tramo {
  const d = diasVencido(vencimiento, hoy)
  if (d <= 0) return 'por_vencer'
  if (d <= 30) return 'd1_30'
  if (d <= 60) return 'd31_60'
  if (d <= 90) return 'd61_90'
  return 'mas_90'
}

export interface Documento {
  id: string
  /** Cliente o proveedor */
  tercero: string
  terceroId: string | null
  referencia: string
  fecha: string | null
  vencimiento: string | null
  saldo: number
  telefono?: string | null
}

export interface FilaCartera {
  tercero: string
  terceroId: string | null
  telefono?: string | null
  tramos: Record<Tramo, number>
  total: number
  /** Días de mora del documento más atrasado */
  maxDias: number
  documentos: (Documento & { dias: number; tramo: Tramo })[]
}

const vacio = (): Record<Tramo, number> => ({ por_vencer: 0, d1_30: 0, d31_60: 0, d61_90: 0, mas_90: 0 })

/** Agrupa por tercero y tramo. Ordena por lo más vencido primero y luego por saldo. */
export function armarCartera(documentos: Documento[], hoy: string): { filas: FilaCartera[]; totales: Record<Tramo, number>; total: number } {
  const porTercero = new Map<string, FilaCartera>()
  const totales = vacio()
  for (const d of documentos) {
    if (!(d.saldo > 0)) continue
    const tramo = tramoDe(d.vencimiento, hoy)
    const dias = diasVencido(d.vencimiento, hoy)
    const clave = d.terceroId ?? d.tercero
    const fila = porTercero.get(clave) ?? { tercero: d.tercero, terceroId: d.terceroId, telefono: d.telefono, tramos: vacio(), total: 0, maxDias: 0, documentos: [] }
    fila.tramos[tramo] += d.saldo
    fila.total += d.saldo
    fila.maxDias = Math.max(fila.maxDias, dias)
    fila.documentos.push({ ...d, dias, tramo })
    porTercero.set(clave, fila)
    totales[tramo] += d.saldo
  }
  const filas = [...porTercero.values()]
    .map(f => ({ ...f, documentos: f.documentos.sort((a, b) => b.dias - a.dias) }))
    .sort((a, b) => b.maxDias - a.maxDias || b.total - a.total)
  return { filas, totales, total: Object.values(totales).reduce((s, v) => s + v, 0) }
}
