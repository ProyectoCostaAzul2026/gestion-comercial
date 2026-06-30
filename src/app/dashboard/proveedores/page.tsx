import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ProveedoresTable, type ProveedorListItem, type EventoPago } from '@/components/modulos/proveedores-table'

const hoy = new Date().toISOString().slice(0, 10)
const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

function diasRestantes(fecha: string): number {
  const ms = new Date(fecha).getTime() - new Date(hoy).getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select(`
      id, nombre, contacto, telefono, nit_ruc, activo,
      facturas_proveedor(
        id, numero_factura, estado, saldo_pendiente, fecha_vencimiento,
        pagos_programados_proveedor(id, fecha_programada, monto, pagado)
      )
    `)
    .eq('activo', true)
    .order('nombre')

  const eventosPago: EventoPago[] = []
  const lista: ProveedorListItem[] = (proveedores ?? []).map(p => {
    const facturas = (p.facturas_proveedor as any[]) ?? []
    const facturasActivas = facturas.filter(f => f.estado !== 'pagada')
    const deudaTotal = facturasActivas.reduce((s: number, f: any) => s + Number(f.saldo_pendiente), 0)

    // Recopilar eventos de pago para el panel superior
    for (const f of facturasActivas) {
      // Suma de pagos programados pendientes de esta factura dentro de los próximos 7 días
      const pagosProgramadosPendientes = (f.pagos_programados_proveedor ?? []) as any[]
      const montoProgramadoTotal = pagosProgramadosPendientes
        .filter((pp: any) => !pp.pagado)
        .reduce((s: number, pp: any) => s + Number(pp.monto), 0)
      // Evento de vencimiento de factura: saldo menos lo ya programado (para no duplicar)
      if (f.fecha_vencimiento && f.fecha_vencimiento <= en7Dias) {
        const montoFacturaAMostrar = Math.max(0, Number(f.saldo_pendiente) - montoProgramadoTotal)
        if (montoFacturaAMostrar > 0) {
          eventosPago.push({
            fecha: f.fecha_vencimiento,
            monto: montoFacturaAMostrar,
            tipo: 'factura',
            descripcion: `${p.nombre} · ${f.numero_factura ? `#${f.numero_factura}` : 'S/N'}`,
          })
        }
      }
      // Pagos programados pendientes dentro de los próximos 7 días
      for (const pp of pagosProgramadosPendientes) {
        if (!pp.pagado && pp.fecha_programada <= en7Dias) {
          eventosPago.push({
            fecha: pp.fecha_programada,
            monto: Number(pp.monto),
            tipo: 'programado',
            descripcion: `${p.nombre} · ${f.numero_factura ? `#${f.numero_factura}` : 'S/N'}`,
          })
        }
      }
    }

    // Determinar estado con prioridad
    const tieneFacturaVencida = facturasActivas.some((f: any) =>
      f.fecha_vencimiento && f.fecha_vencimiento < hoy
    )
    const tieneFacturaProxima = facturasActivas.some((f: any) =>
      f.fecha_vencimiento && f.fecha_vencimiento >= hoy && f.fecha_vencimiento <= en7Dias
    )
    const tienePagoVencido = facturas.some((f: any) =>
      (f.pagos_programados_proveedor ?? []).some((pp: any) =>
        !pp.pagado && pp.fecha_programada < hoy
      )
    )

    // Pago programado próximo: calcular días restantes del más próximo
    let diasProximoPago: number | null = null
    const pagosProximos = facturas.flatMap((f: any) =>
      (f.pagos_programados_proveedor ?? []).filter((pp: any) =>
        !pp.pagado && pp.fecha_programada >= hoy && pp.fecha_programada <= en7Dias
      )
    )
    if (pagosProximos.length > 0) {
      const fechaMasCercana = pagosProximos
        .map((pp: any) => pp.fecha_programada)
        .sort()[0]
      diasProximoPago = diasRestantes(fechaMasCercana)
    }

    const tienePagoProximo = diasProximoPago !== null

    let estado: ProveedorListItem['estado'] = 'al_dia'
    if (tieneFacturaVencida) estado = 'factura_vencida'
    else if (tieneFacturaProxima) estado = 'factura_proxima'
    else if (deudaTotal > 0) estado = 'con_deuda'
    else if (tienePagoVencido) estado = 'pago_programado_vencido'
    else if (tienePagoProximo) estado = 'pago_programado_proximo'

    return {
      id: p.id,
      nombre: p.nombre,
      contacto: p.contacto,
      telefono: p.telefono,
      nit_ruc: p.nit_ruc,
      facturasActivas: facturasActivas.length,
      deudaTotal,
      estado,
      diasProximoPago,
    }
  })

  // Ordenar eventos por fecha
  eventosPago.sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-yellow">Proveedores</h1>
            <p className="mt-0.5 text-xs text-steel-300">{lista.length} proveedores activos</p>
          </div>
          <Link
            href="/dashboard/proveedores/nuevo"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Agregar proveedor
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>
      <ProveedoresTable proveedores={lista} eventosPago={eventosPago} />
    </div>
  )
}