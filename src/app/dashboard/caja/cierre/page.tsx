import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hoyBogota } from '@/lib/fechas'
import { EncabezadoPagina } from '@/components/ui/encabezado-pagina'
import { ArqueoPanel } from '@/components/modulos/arqueo-panel'

// Arqueo y cierre de caja en su propia vista: contar la base y el sobrante con calma, sin el resto de Caja alrededor
export default async function CierreCajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')

  const hoy = hoyBogota()
  const [{ data: movimientos }, { data: saldo }, { data: config }, { data: arqueoHoy }] = await Promise.all([
    supabase.from('movimientos_caja').select('tipo_movimiento, origen_destino, monto').eq('fecha', hoy),
    supabase.from('saldos_medios_pago').select('saldo_acumulado').eq('medio', 'efectivo').maybeSingle(),
    supabase.from('configuracion_negocio').select('monto_base_caja_menor').maybeSingle(),
    supabase.from('arqueo_caja').select('id, saldo_sistema, total_contado_sobrante, diferencia').eq('fecha', hoy).maybeSingle(),
  ])

  // Mismas reglas que cerrar_caja_arqueo: entradas y salidas de hoy en efectivo, y el saldo del efectivo desde el último cierre
  const enEfectivo = (movimientos ?? []).filter(m => m.origen_destino === 'efectivo' || m.origen_destino === 'caja_menor')
  const ingresos = enEfectivo.filter(m => m.tipo_movimiento === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
  const egresos = enEfectivo
    .filter(m => !['ingreso', 'transferencia_caja_mayor'].includes(m.tipo_movimiento))
    .reduce((s, m) => s + Number(m.monto), 0)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <EncabezadoPagina titulo="Cierre de caja" atras="/dashboard/caja" subtitulo={`Arqueo del ${hoy}`} />
      {arqueoHoy ? (
        <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <p className="font-semibold text-emerald-400">La caja de hoy ya se cerró.</p>
          <p className="text-steel-300">
            Se esperaban ${Number(arqueoHoy.saldo_sistema).toLocaleString('es-CO')} sobre la base y se contaron
            ${Number(arqueoHoy.total_contado_sobrante).toLocaleString('es-CO')}
            {Number(arqueoHoy.diferencia) !== 0 ? ` (diferencia de $${Number(arqueoHoy.diferencia).toLocaleString('es-CO')})` : ', sin diferencia'}.
          </p>
          <Link href="/dashboard/caja" className="inline-flex h-11 items-center rounded-xl border border-white/10 px-4 font-semibold text-white hover:bg-white/5">
            Volver a Caja
          </Link>
        </div>
      ) : (
        <ArqueoPanel
          ingresosEfectivo={ingresos}
          egresosEfectivo={egresos}
          saldoEfectivo={Number(saldo?.saldo_acumulado ?? 0)}
          montoBase={Number(config?.monto_base_caja_menor ?? 300000)}
          fechaHoy={hoy}
        />
      )}
    </div>
  )
}
