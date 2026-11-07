'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Phone, Search, User } from 'lucide-react'
import { AvatarIniciales, telefonoMarcable } from './avatar-iniciales'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const hoy = new Date().toISOString().slice(0, 10)

function diasRestantes(fecha: string): number {
  const ms = new Date(fecha).getTime() - new Date(hoy).getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export interface EventoPago {
  fecha: string
  monto: number
  tipo: 'factura' | 'programado'
  descripcion: string
}

export interface ProveedorListItem {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  nit_ruc: string | null
  logo_url: string | null
  facturasActivas: number
  deudaTotal: number
  estado: 'al_dia' | 'con_deuda' | 'factura_vencida' | 'factura_proxima' | 'pago_programado_vencido' | 'pago_programado_proximo'
  diasProximoPago: number | null
}

const ESTADO_CONFIG: Record<ProveedorListItem['estado'], { label: string; className: string; priority: number }> = {
  factura_vencida: { label: 'Factura vencida', className: 'border-brand-red/30 bg-brand-red/20 text-brand-red', priority: 1 },
  factura_proxima: { label: 'Próxima a vencer', className: 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow', priority: 2 },
  con_deuda: { label: 'Con deuda', className: 'border-brand-red/30 bg-brand-red/20 text-brand-red', priority: 3 },
  pago_programado_vencido: { label: 'Pago vencido', className: 'border-amber-500/30 bg-amber-500/20 text-amber-400', priority: 4 },
  pago_programado_proximo: { label: 'Pago próximo', className: 'border-brand-blue/30 bg-brand-blue/20 text-brand-blue', priority: 5 },
  al_dia: { label: 'Al día', className: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400', priority: 6 },
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con'])

function normalizar(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function coincideProveedor(p: ProveedorListItem, query: string): boolean {
  if (!query.trim()) return true
  const tokens = normalizar(query).split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t))
  const texto = normalizar([p.nombre, p.contacto, p.nit_ruc].filter(Boolean).join(' '))
  return tokens.every(token => texto.includes(token))
}

export function ProveedoresTable({
  proveedores,
  eventosPago,
}: {
  proveedores: ProveedorListItem[]
  eventosPago: EventoPago[]
}) {
  const [query, setQuery] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Panel de pagos próximos
  const hoy7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const eventosHoy = eventosPago.filter(e => e.fecha === hoy)
  const eventos7Dias = eventosPago.filter(e => e.fecha > hoy && e.fecha <= hoy7)

  const totalHoy = eventosHoy.reduce((s, e) => s + e.monto, 0)
  const total7Dias = eventos7Dias.reduce((s, e) => s + e.monto, 0)

  // Agrupar eventos de los 7 días por fecha
  const eventosPorFecha = eventos7Dias.reduce((acc, e) => {
    if (!acc[e.fecha]) acc[e.fecha] = []
    acc[e.fecha].push(e)
    return acc
  }, {} as Record<string, EventoPago[]>)

  const filtrados = useMemo(() => {
    return proveedores.filter(p => {
      if (!coincideProveedor(p, query)) return false
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
      return true
    })
  }, [proveedores, query, filtroEstado])

  return (
    <div className="space-y-4">
      {/* Banner de pagos próximos */}
      {(eventosHoy.length > 0 || eventos7Dias.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Hoy */}
          {eventosHoy.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-brand-yellow p-4 text-steel-900">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">Pagos para hoy</h3>
                <span className="font-display text-2xl font-black">${totalHoy.toLocaleString('es-CO')}</span>
              </div>
              {eventosHoy.map((e, i) => (
                <div key={i} className="flex justify-between rounded-xl bg-black/10 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold">
                      {e.tipo === 'factura' ? 'Factura' : 'Programado'}
                    </span>
                    <span>{e.descripcion}</span>
                  </div>
                  <span className="font-bold">${e.monto.toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Próximos 7 días */}
          {eventos7Dias.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-brand-yellow">Próximos 7 días</h3>
                <span className="font-display text-xl font-black text-brand-yellow">${total7Dias.toLocaleString('es-CO')}</span>
              </div>
              {Object.entries(eventosPorFecha)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, evs]) => (
                  <div key={fecha} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brand-yellow/80">
                        {fecha} ({diasRestantes(fecha)} día{diasRestantes(fecha) !== 1 ? 's' : ''})
                      </span>
                      <span className="text-xs font-medium text-brand-yellow">
                        ${evs.reduce((s, e) => s + e.monto, 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    {evs.map((e, i) => (
                      <div key={i} className="flex justify-between rounded-xl border border-white/10 bg-[#1a2430] px-3 py-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.tipo === 'factura' ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-yellow/20 text-brand-yellow'}`}>
                            {e.tipo === 'factura' ? 'Factura' : 'Programado'}
                          </span>
                          <span className="text-steel-300">{e.descripcion}</span>
                        </div>
                        <span className="font-medium text-white">${e.monto.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Buscador y filtro */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, contacto o NIT…"
            className="h-12 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
          />
        </div>
        <Select
          items={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'factura_vencida', label: 'Factura vencida' },
            { value: 'factura_proxima', label: 'Próxima a vencer' },
            { value: 'con_deuda', label: 'Con deuda' },
            { value: 'pago_programado_vencido', label: 'Pago programado vencido' },
            { value: 'pago_programado_proximo', label: 'Pago programado próximo' },
            { value: 'al_dia', label: 'Al día' },
          ]}
          onValueChange={v => v && setFiltroEstado(v)}
          value={filtroEstado}
        >
          <SelectTrigger className="h-12 w-56 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="factura_vencida">Factura vencida</SelectItem>
            <SelectItem value="factura_proxima">Próxima a vencer</SelectItem>
            <SelectItem value="con_deuda">Con deuda</SelectItem>
            <SelectItem value="pago_programado_vencido">Pago programado vencido</SelectItem>
            <SelectItem value="pago_programado_proximo">Pago programado próximo</SelectItem>
            <SelectItem value="al_dia">Al día</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map(p => {
          const cfg = ESTADO_CONFIG[p.estado]
          const dias = p.diasProximoPago
          const esProximoPago = p.estado === 'pago_programado_proximo' && dias !== null && dias <= 3
          const alerta = ['factura_vencida', 'factura_proxima', 'pago_programado_vencido', 'pago_programado_proximo'].includes(p.estado)

          return (
            <div key={p.id}
              className={`relative flex flex-col gap-3 rounded-2xl border bg-[#111820] p-4 transition hover:border-brand-yellow/50 ${p.estado === 'factura_vencida' ? 'border-brand-red/40' : 'border-white/10'}`}>
              <div className="flex items-start gap-3">
                <AvatarIniciales nombre={p.nombre} foto={p.logo_url} logo />
                <div className="min-w-0 flex-1">
                  {/* El enlace cubre toda la tarjeta; el teléfono queda encima para poder llamar */}
                  <Link href={`/dashboard/proveedores/${p.id}`}
                    className="line-clamp-2 text-sm font-bold text-white after:absolute after:inset-0 after:rounded-2xl">
                    {p.nombre}
                  </Link>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}>
                    {alerta && <AlertTriangle className="h-3 w-3" aria-hidden />}
                    {cfg.label}
                    {esProximoPago && dias !== null && ` (${dias} día${dias !== 1 ? 's' : ''})`}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-steel-300">
                {p.contacto && <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 shrink-0" aria-hidden />{p.contacto}</p>}
                {p.telefono && (
                  <a href={`tel:${telefonoMarcable(p.telefono)}`}
                    className="relative z-10 inline-flex items-center gap-1.5 text-brand-blue hover:underline">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />{p.telefono}
                  </a>
                )}
                {p.nit_ruc && <p>NIT {p.nit_ruc}</p>}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-steel-500">Facturas activas</p>
                  <p className="font-display text-lg font-bold text-white">{p.facturasActivas}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-steel-500">Deuda</p>
                  <p className={`font-display text-lg font-bold ${p.deudaTotal > 0 ? 'text-brand-yellow' : 'text-steel-300'}`}>
                    {p.deudaTotal > 0 ? `$${p.deudaTotal.toLocaleString('es-CO')}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {filtrados.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500">
          {proveedores.length === 0 ? 'No hay proveedores registrados.' : 'Sin resultados para este filtro.'}
        </p>
      )}
    </div>
  )
}