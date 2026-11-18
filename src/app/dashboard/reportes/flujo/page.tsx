import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { hoyBogota } from '@/lib/fechas'
import { diasEntre, sumarDiasFecha } from '@/lib/periodos'
import { resumenPeriodo } from '@/lib/reportes-servidor'
import { EncabezadoPagina } from '@/components/ui/encabezado-pagina'
import { FlujoProyectadoPanel } from '@/components/modulos/flujo-proyectado-panel'

// Flujo de caja proyectado: con qué dinero se cuenta hoy, qué se va a cobrar y pagar en las próximas semanas, y el
// promedio reciente de ventas, gastos y nómina.
export default async function FlujoProyectadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')

  const hoy = hoyBogota()
  const [{ data: saldos }, { data: cajaMayor }, { data: creditos }, { data: facturas }, { data: primeraVenta }] = await Promise.all([
    supabase.from('saldos_medios_pago').select('medio, saldo_acumulado'),
    supabase.from('caja_mayor').select('saldo_actual').maybeSingle(),
    traerTodo((a, b) => supabase.from('ventas_credito')
      .select('id, saldo_pendiente, fecha_pago_programada, clientes(nombre), ventas(fecha, numero_ticket)')
      .in('estado', ['pendiente', 'parcial']).order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('facturas_proveedor')
      .select('id, numero_factura, saldo_pendiente, fecha_vencimiento, fecha_emision, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial']).order('id').range(a, b)),
    supabase.from('ventas').select('fecha').neq('estado', 'anulada').order('fecha').limit(1).maybeSingle(),
  ])

  // Promedios de los últimos 90 días (o desde la primera venta, si el sistema lleva menos tiempo)
  const inicioVentana = sumarDiasFecha(hoy, -89)
  const desdeHistoria = primeraVenta?.fecha && primeraVenta.fecha > inicioVentana ? primeraVenta.fecha : inicioVentana
  const diasHistoria = diasEntre(desdeHistoria, hoy)
  const historia = await resumenPeriodo(supabase, desdeHistoria, hoy)
  const contado = Object.values(historia.medios).reduce((s, v) => s + v, 0)

  const saldoMedio = (m: string) => Number((saldos ?? []).find(s => s.medio === m)?.saldo_acumulado ?? 0)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (
    <div className="space-y-4">
      <EncabezadoPagina titulo="Flujo de caja proyectado" atras="/dashboard/reportes"
        subtitulo="Cuánto dinero habrá en las próximas semanas si todo sale como está previsto" />
      <FlujoProyectadoPanel
        hoy={hoy}
        disponible={{
          efectivo: saldoMedio('efectivo'),
          nequi: saldoMedio('nequi'),
          daviplata: saldoMedio('daviplata'),
          tarjeta: saldoMedio('tarjeta'),
          cajaMayor: Number(cajaMayor?.saldo_actual ?? 0),
        }}
        cobros={(creditos as any[]).map(c => ({
          id: c.id,
          nombre: c.clientes?.nombre ?? 'Cliente',
          referencia: `Ticket #${c.ventas?.numero_ticket ?? '—'}`,
          fecha: c.fecha_pago_programada ?? c.ventas?.fecha ?? hoy,
          monto: Number(c.saldo_pendiente),
        }))}
        pagos={(facturas as any[]).map(f => ({
          id: f.id,
          nombre: f.proveedores?.nombre ?? 'Proveedor',
          referencia: f.numero_factura ? `Factura ${f.numero_factura}` : 'Factura',
          fecha: f.fecha_vencimiento ?? f.fecha_emision ?? hoy,
          monto: Number(f.saldo_pendiente),
        }))}
        promedios={{
          dias: diasHistoria,
          desde: desdeHistoria,
          ventasContadoDia: contado / diasHistoria,
          costoVentasDia: historia.ingresos > 0 ? (historia.costoVentas / historia.ingresos) * (contado / diasHistoria) : 0,
          gastosDia: historia.gastos / diasHistoria,
          nominaDia: historia.nominas / diasHistoria,
        }}
      />
    </div>
  )
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
