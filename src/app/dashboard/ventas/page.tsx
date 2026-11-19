import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { VentasFiltros } from '@/components/modulos/ventas-filtros'
import { VentasTable } from '@/components/modulos/ventas-table'

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  credito: 'Crédito',
}

const MEDIOS_ORDEN = ['efectivo', 'nequi', 'daviplata', 'tarjeta', 'credito']

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha_inicio?: string; fecha_fin?: string; empleado_id?: string; tipo_pago?: string; estado?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  const esAdmin = profile?.rol === 'administrador'

  // Fecha Colombia
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const fechaInicio = sp.fecha_inicio || hoy
  const fechaFin = sp.fecha_fin || hoy

  // KPIs — pagos reales del día por fuente
  let pagosQuery = supabase
    .from('venta_pagos')
    .select('metodo, monto, ventas!inner(id, fecha, estado, empleado_id)')
    .eq('ventas.fecha', hoy)
    .neq('ventas.estado', 'anulada')
  if (!esAdmin) pagosQuery = pagosQuery.eq('ventas.empleado_id', user.id)
  const { data: pagosHoy } = await pagosQuery

  // Créditos del día
  const { data: creditosHoy } = await supabase
    .from('ventas_credito')
    .select('monto_original, ventas!inner(id, fecha, estado, empleado_id)')
    .eq('ventas.fecha', hoy)
    .neq('ventas.estado', 'anulada')

  // Un empleado solo ve lo suyo, igual que en los pagos
  const creditosPropios = (creditosHoy ?? []).filter((c: any) => esAdmin || c.ventas?.empleado_id === user.id)

  // KPIs
  const desgloseMedios: Record<string, number> = {}
  for (const p of pagosHoy ?? []) {
    const metodo = (p as any).metodo
    if (metodo === 'mixto') continue
    desgloseMedios[metodo] = (desgloseMedios[metodo] ?? 0) + Number((p as any).monto)
  }
  desgloseMedios['credito'] = creditosPropios.reduce((s, c) => s + Number((c as any).monto_original), 0)

  const totalVentasHoy = Object.values(desgloseMedios).reduce((s, v) => s + v, 0)
  // Un ticket puede tener varios pagos (mixto) o un abono inicial además del crédito: se cuenta una sola vez
  const numTicketsHoy = new Set([...(pagosHoy ?? []), ...creditosPropios].map((p: any) => p.ventas?.id).filter(Boolean)).size
  const ventaPromedioHoy = numTicketsHoy > 0 ? totalVentasHoy / numTicketsHoy : 0

  // Ventas filtradas para la tabla. Se traen por páginas: la API corta en 1000 filas sin avisar.
  const { data: ventas, error } = await traerTodo((filaDesde, filaHasta) => {
    let query = supabase
      .from('ventas')
      .select(`
        id, numero_ticket, hora, total, tipo_pago, estado,
        clientes(nombre),
        empleado:profiles!empleado_id(nombre_completo)
      `)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
    if (!esAdmin) query = query.eq('empleado_id', user.id)
    if (esAdmin && sp.empleado_id) query = query.eq('empleado_id', sp.empleado_id)
    if (sp.tipo_pago) query = query.eq('tipo_pago', sp.tipo_pago)
    if (sp.estado) query = query.eq('estado', sp.estado)
    return query
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .order('id')
      .range(filaDesde, filaHasta)
  })

  const { data: empleados } = esAdmin
    ? await supabase.from('profiles').select('id, nombre_completo').eq('activo', true).order('nombre_completo')
    : { data: [] }

  return (
    <div className="space-y-4">
      <div className="relative py-1">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-tinta">Ventas</h1>
            <p className="text-[15px] text-suave">
              {fechaInicio === hoy && fechaFin === hoy ? 'Hoy' : `${fechaInicio} a ${fechaFin}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/ventas/cotizacion"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-linea bg-superficie px-4 text-[15px] font-semibold text-tinta hover:bg-superficie-2">
              <FileText className="mr-2 h-4 w-4" />Cotización
            </Link>
            <Link href="/dashboard/ventas/nueva"
              className="hidden h-11 items-center justify-center rounded-xl bg-letrero px-4 text-[15px] font-bold text-tinta-fija hover:brightness-105 lg:inline-flex">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={2.5} />Vender
            </Link>
          </div>
        </div>
      </div>

      {/* Lo vendido hoy */}
      <section className="rounded-[18px] bg-superficie p-5">
        <p className="text-[15px] font-semibold text-suave">Vendido hoy</p>
        <p className="cifra text-[48px] font-bold leading-none text-tinta">${Math.round(totalVentasHoy).toLocaleString('es-CO')}</p>
        <p className="mt-1 text-[15px] text-suave">
          {numTicketsHoy} {numTicketsHoy === 1 ? 'venta' : 'ventas'}{numTicketsHoy > 0 ? `, de $${Math.round(ventaPromedioHoy).toLocaleString('es-CO')} en promedio` : ''}
        </p>
        {MEDIOS_ORDEN.some(m => (desgloseMedios[m] ?? 0) > 0) && (
          <ul className="mt-4 grid gap-x-6 border-t border-linea sm:grid-cols-2">
            {MEDIOS_ORDEN.filter(m => (desgloseMedios[m] ?? 0) > 0).map(medio => (
              <li key={medio} className="flex items-center gap-3 border-b border-linea py-2.5">
                <MedioPagoIcono medio={medio} className="h-7 w-[42px] shrink-0" />
                <span className="flex-1 text-[15px] text-tinta">{MEDIO_LABEL[medio]}</span>
                <span className="cifra text-xl font-bold text-tinta">${(desgloseMedios[medio] ?? 0).toLocaleString('es-CO')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <VentasFiltros
        fechaInicio={fechaInicio} fechaFin={fechaFin} tipoPago={sp.tipo_pago ?? ''} estado={sp.estado ?? ''}
        empleadoId={sp.empleado_id ?? ''} empleados={empleados ?? []} esAdmin={esAdmin}
      />

      {error && <p className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-sale">Error: {error.message}</p>}

      <VentasTable ventas={(ventas as any) ?? []} />
    </div>
  )
}