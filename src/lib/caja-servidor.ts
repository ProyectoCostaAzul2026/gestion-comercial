// Datos que comparten las vistas de Caja en el servidor
import type { SupabaseClient } from '@supabase/supabase-js'

/** Saldo de cada medio (efectivo, nequi, daviplata, tarjeta, caja_mayor, credito) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saldosMedios(supabase: SupabaseClient<any, any, any>): Promise<Record<string, number>> {
  const { data } = await supabase.from('saldos_medios_pago').select('medio, saldo_acumulado')
  return Object.fromEntries((data ?? []).map((s: { medio: string; saldo_acumulado: number }) => [s.medio, Number(s.saldo_acumulado)]))
}
