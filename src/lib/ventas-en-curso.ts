import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ventas sin registrar que se guardan en la base (tabla ventas_en_curso): las ventas paralelas (hasta tres por
 * vendedor), las que pasaron a borrador y las que un vendedor le pasa a otro.
 *
 * Reglas (las aplica también la tarea vencer_ventas_en_curso de la base, cada minuto):
 * - Una venta abierta que lleva 15 minutos sin cambios pasa a borrador; el borrador dura 15 minutos más y se elimina.
 * - Una venta pasada a otro vendedor que no la acepta en 15 minutos vuelve a quien la pasó.
 * - Una venta normal (una sola, sin ventas paralelas) no se guarda: al salir se pregunta si se cancela.
 */

export const MAX_VENTAS_PARALELAS = 3
export const MINUTOS_A_BORRADOR = 15
export const MINUTOS_BORRADOR = 15
export const MINUTOS_TRANSFERENCIA = 15
/** Minuto del borrador en que se recuerda por última vez que se va a eliminar */
export const MINUTO_RECORDATORIO = 12

export type EstadoVentaEnCurso = 'abierta' | 'borrador' | 'transferida'

export interface VentaEnCurso {
  id: string
  vendedor_id: string
  datos: Record<string, unknown>
  cliente_nombre: string | null
  lineas: number
  total: number
  estado: EstadoVentaEnCurso
  transferida_por: string | null
  transferida_en: string | null
  nota: string | null
  actualizado_en: string
  borrador_desde: string | null
  /** Nombre de quien la pasó (consulta con profiles!transferida_por) */
  quien_paso?: { nombre_completo: string } | null
}

export const COLUMNAS_VENTA_EN_CURSO =
  'id, vendedor_id, datos, cliente_nombre, lineas, total, estado, transferida_por, transferida_en, nota, actualizado_en, borrador_desde, quien_paso:profiles!ventas_en_curso_transferida_por_fkey(nombre_completo)'

export const pesosVenta = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

export function describirVenta(v: Pick<VentaEnCurso, 'cliente_nombre' | 'lineas' | 'total'>) {
  return `${v.cliente_nombre || 'Mostrador'} · ${v.lineas} ${v.lineas === 1 ? 'línea' : 'líneas'} · ${pesosVenta(Number(v.total))}`
}

/** Minutos que le quedan a un borrador antes de eliminarse */
export function minutosRestantesBorrador(borradorDesde: string | null, ahora = Date.now()) {
  if (!borradorDesde) return MINUTOS_BORRADOR
  const pasados = (ahora - new Date(borradorDesde).getTime()) / 60000
  return Math.max(0, Math.ceil(MINUTOS_BORRADOR - pasados))
}

export async function misVentasEnCurso(supabase: SupabaseClient, usuarioId: string) {
  const { data, error } = await supabase
    .from('ventas_en_curso')
    .select(COLUMNAS_VENTA_EN_CURSO)
    .eq('vendedor_id', usuarioId)
    .order('creado_en')
  if (error) throw error
  return (data ?? []) as unknown as VentaEnCurso[]
}

/** Guarda (o crea) una venta abierta del vendedor; un cambio la saca de borrador */
export async function guardarVentaEnCurso(
  supabase: SupabaseClient,
  v: { id: string; vendedorId: string; datos: unknown; cliente: string; lineas: number; total: number },
) {
  const { error } = await supabase.from('ventas_en_curso').upsert({
    id: v.id,
    vendedor_id: v.vendedorId,
    datos: v.datos,
    cliente_nombre: v.cliente,
    lineas: v.lineas,
    total: v.total,
    estado: 'abierta',
    borrador_desde: null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarVentaEnCurso(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('ventas_en_curso').delete().eq('id', id)
  if (error) throw error
}

/** Eventos entre el vigilante (en toda la app) y la pantalla de Nueva venta */
export const EVENTO_VENTAS = 'ventas-en-curso'
export type DetalleEventoVentas = { tipo: 'eliminada' | 'abrir' | 'actualizar'; id: string }
export function avisarVentas(detalle: DetalleEventoVentas) {
  window.dispatchEvent(new CustomEvent<DetalleEventoVentas>(EVENTO_VENTAS, { detail: detalle }))
}
