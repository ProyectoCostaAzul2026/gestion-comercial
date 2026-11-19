import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CajaPanel } from '@/components/modulos/caja-panel'
import { empleadosEnTurno } from '@/lib/turnos'

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'administrador') redirect('/dashboard')

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

  const [
    { data: movimientos },
    { data: fondos },
    { data: config },
    { data: nominasHoy },
    { data: empleadosActivos },
    { data: arqueoHoy },
    { data: saldos },
  ] = await Promise.all([
    supabase.from('movimientos_caja')
      .select('id, fecha, hora, tipo_movimiento, origen_destino, monto, observaciones, referencia_tipo')
      .eq('fecha', hoy)
      .order('hora', { ascending: false }),
    supabase.from('fondos_denominaciones')
      .select('tipo, denominacion, cantidad, billetes_acumulados')
      .order('tipo').order('denominacion'),
    supabase.from('configuracion_negocio')
      .select('monto_base_caja_menor, monto_inicial_monedas, monto_inicial_sencillo')
      .maybeSingle(),
    supabase.from('nominas').select('id, empleado_id').eq('periodo_inicio', hoy).eq('estado', 'pagada'),
    empleadosEnTurno(supabase, hoy).then(ids => ({ data: ids })),
    supabase.from('arqueo_caja').select('id').eq('fecha', hoy).maybeSingle(),
    supabase.from('saldos_medios_pago').select('medio, saldo_acumulado'),
  ])

  const { data: ventasPagos } = await supabase
    .from('venta_pagos')
    .select('metodo, monto, ventas!inner(fecha, estado)')
    .eq('ventas.fecha', hoy)
    .neq('ventas.estado', 'anulada')

  const ventasEfectivo = (ventasPagos ?? []).filter((vp: any) => vp.metodo === 'efectivo').reduce((s: number, vp: any) => s + Number(vp.monto), 0)
  const ventasNequi = (ventasPagos ?? []).filter((vp: any) => vp.metodo === 'nequi').reduce((s: number, vp: any) => s + Number(vp.monto), 0)
  const ventasDaviplata = (ventasPagos ?? []).filter((vp: any) => vp.metodo === 'daviplata').reduce((s: number, vp: any) => s + Number(vp.monto), 0)
  const ventasTarjeta = (ventasPagos ?? []).filter((vp: any) => vp.metodo === 'tarjeta').reduce((s: number, vp: any) => s + Number(vp.monto), 0)

  const { data: creditosHoy } = await supabase
    .from('ventas_credito')
    .select('monto_original, ventas!inner(fecha, estado)')
    .eq('ventas.fecha', hoy)
    .neq('ventas.estado', 'anulada')
  const ventasCredito = (creditosHoy ?? []).reduce((s: number, c: any) => s + Number(c.monto_original), 0)

  const totalIngresos = (movimientos ?? [])
    .filter((m: any) => m.tipo_movimiento === 'ingreso')
    .reduce((s: number, m: any) => s + Number(m.monto), 0)

  const totalEgresos = (movimientos ?? [])
    .filter((m: any) => !['ingreso', 'transferencia_caja_mayor'].includes(m.tipo_movimiento))
    .reduce((s: number, m: any) => s + Number(m.monto), 0)

  const empleadosPagadosHoy = new Set((nominasHoy ?? []).map((n: any) => n.empleado_id))
  // Nómina del día: quienes trabajan hoy (turno y sin permiso) y quien ya recibió pago
  const enNominaHoy = new Set<string>([...(empleadosActivos ?? []), ...empleadosPagadosHoy])

  return (
    <CajaPanel
      ventasEfectivo={ventasEfectivo}
      ventasNequi={ventasNequi}
      ventasDaviplata={ventasDaviplata}
      ventasTarjeta={ventasTarjeta}
      ventasCredito={ventasCredito}
      totalIngresos={totalIngresos}
      totalEgresos={totalEgresos}
      movimientos={(movimientos as any) ?? []}
      fondos={(fondos as any) ?? []}
      saldos={saldos ?? []}
      config={config ?? { monto_base_caja_menor: 300000, monto_inicial_monedas: 400000, monto_inicial_sencillo: 800000 }}
      fechaHoy={hoy}
      nominasPagadasHoy={nominasHoy?.length ?? 0}
      empleadosActivos={enNominaHoy.size}
      arqueoHoy={arqueoHoy}
    />
  )
}