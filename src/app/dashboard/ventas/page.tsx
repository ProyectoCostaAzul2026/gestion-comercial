import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, TrendingUp, Receipt, Calculator, CreditCard, FileText } from 'lucide-react'
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
  searchParams: Promise<{ fecha?: string; empleado_id?: string; tipo_pago?: string; estado?: string }>
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
  const fecha = sp.fecha || hoy

  // KPIs — pagos reales del día por fuente
  let pagosQuery = supabase
    .from('venta_pagos')
    .select('metodo, monto, ventas!inner(fecha, estado, empleado_id)')
    .eq('ventas.fecha', hoy)
    .neq('ventas.estado', 'anulada')
  if (!esAdmin) pagosQuery = pagosQuery.eq('ventas.empleado_id', user.id)
  const { data: pagosHoy } = await pagosQuery

  // Créditos del día
  const { data: creditosHoy } = await supabase
    .from('ventas_credito')
    .select('monto_original, ventas!inner(fecha)')
    .eq('ventas.fecha', hoy)

  // KPIs
  const desgloseMedios: Record<string, number> = {}
  for (const p of pagosHoy ?? []) {
    const metodo = (p as any).metodo
    if (metodo === 'mixto') continue
    desgloseMedios[metodo] = (desgloseMedios[metodo] ?? 0) + Number((p as any).monto)
  }
  desgloseMedios['credito'] = (creditosHoy ?? []).reduce((s, c) => s + Number((c as any).monto_original), 0)

  const totalVentasHoy = Object.values(desgloseMedios).reduce((s, v) => s + v, 0)
  const numTicketsHoy = new Set((pagosHoy ?? []).map((p: any) => p.ventas?.id)).size + (creditosHoy?.length ?? 0)
  const ventaPromedioHoy = numTicketsHoy > 0 ? totalVentasHoy / numTicketsHoy : 0

  // Ventas filtradas para la tabla
  let query = supabase
    .from('ventas')
    .select(`
      id, numero_ticket, hora, total, tipo_pago, estado,
      clientes(nombre),
      empleado:profiles!empleado_id(nombre_completo)
    `)
    .eq('fecha', fecha)
    .order('hora', { ascending: false })

  if (!esAdmin) query = query.eq('empleado_id', user.id)
  if (esAdmin && sp.empleado_id) query = query.eq('empleado_id', sp.empleado_id)
  if (sp.tipo_pago) query = query.eq('tipo_pago', sp.tipo_pago)
  if (sp.estado) query = query.eq('estado', sp.estado)

  const { data: ventas, error } = await query

  const { data: empleados } = esAdmin
    ? await supabase.from('profiles').select('id, nombre_completo').eq('activo', true).order('nombre_completo')
    : { data: [] }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">Ventas</h1>
          <p className="mt-1 text-sm text-steel-500">{fecha === hoy ? 'Hoy' : fecha}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/ventas/cotizacion"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-steel-700 transition hover:bg-slate-50">
            <FileText className="mr-2 h-4 w-4" />Cotización
          </Link>
          <Link href="/dashboard/ventas/nueva"
            className="inline-flex items-center justify-center rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-steel-900 shadow-lg shadow-brand-yellow/30 transition hover:brightness-105">
            <Plus className="mr-2 h-4 w-4" />Nueva Venta
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-steel-900 bg-steel-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-300">Total ventas (hoy)</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-yellow">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold">${totalVentasHoy.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">N° tickets (hoy)</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-steel-500">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-steel-900">{numTicketsHoy}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Venta promedio (hoy)</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
              <Calculator className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-steel-900">${Math.round(ventaPromedioHoy).toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Por medio de pago (hoy)</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            {MEDIOS_ORDEN.filter(m => (desgloseMedios[m] ?? 0) > 0).map(medio => (
              <div key={medio} className="flex justify-between text-xs">
                <span className="text-steel-500">{MEDIO_LABEL[medio]}</span>
                <span className="font-medium text-steel-900">${(desgloseMedios[medio] ?? 0).toLocaleString('es-CO')}</span>
              </div>
            ))}
            {MEDIOS_ORDEN.every(m => !desgloseMedios[m]) && (
              <p className="text-xs text-steel-300">Sin ventas hoy</p>
            )}
          </div>
        </div>
      </div>

      <VentasFiltros
        fecha={fecha} tipoPago={sp.tipo_pago ?? ''} estado={sp.estado ?? ''}
        empleadoId={sp.empleado_id ?? ''} empleados={empleados ?? []} esAdmin={esAdmin}
      />

      {error && <p className="mb-4 rounded-lg bg-brand-red-soft p-4 text-sm text-brand-red">Error: {error.message}</p>}

      <VentasTable ventas={(ventas as any) ?? []} />
    </div>
  )
}