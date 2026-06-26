import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
          <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">{fecha === hoy ? 'Hoy' : fecha}</p>
        </div>
        <Link href="/dashboard/ventas/nueva"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" />Nueva Venta
        </Link>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Total ventas (hoy)</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${totalVentasHoy.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">N° tickets (hoy)</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{numTicketsHoy}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Venta promedio (hoy)</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${Math.round(ventaPromedioHoy).toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Por medio de pago (hoy)</p>
          <div className="mt-1 space-y-0.5">
            {MEDIOS_ORDEN.filter(m => (desgloseMedios[m] ?? 0) > 0).map(medio => (
              <div key={medio} className="flex justify-between text-xs">
                <span className="text-slate-500">{MEDIO_LABEL[medio]}</span>
                <span className="font-medium text-slate-900">${(desgloseMedios[medio] ?? 0).toLocaleString('es-CO')}</span>
              </div>
            ))}
            {MEDIOS_ORDEN.every(m => !desgloseMedios[m]) && (
              <p className="text-xs text-slate-400">Sin ventas hoy</p>
            )}
          </div>
        </div>
      </div>

      <VentasFiltros
        fecha={fecha} tipoPago={sp.tipo_pago ?? ''} estado={sp.estado ?? ''}
        empleadoId={sp.empleado_id ?? ''} empleados={empleados ?? []} esAdmin={esAdmin}
      />

      {error && <p className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600">Error: {error.message}</p>}

      <VentasTable ventas={(ventas as any) ?? []} />
    </div>
  )
}