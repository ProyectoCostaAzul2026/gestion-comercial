'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
  const router = useRouter()
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

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-blue/20 hover:bg-brand-blue/20 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-blue">
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Facturas activas</TableHead>
                <TableHead className="text-right">Deuda total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map(p => {
                const cfg = ESTADO_CONFIG[p.estado]
                const dias = p.diasProximoPago
                const esProximoPago = p.estado === 'pago_programado_proximo' && dias !== null && dias <= 3

                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer border-white/8 hover:bg-white/5"
                    onClick={() => router.push(`/dashboard/proveedores/${p.id}`)}
                  >
                    <TableCell className="text-xs font-medium text-white">
                      <div className="flex items-center gap-2">
                        {['factura_vencida', 'factura_proxima', 'pago_programado_vencido', 'pago_programado_proximo'].includes(p.estado) && (
                          <AlertTriangle className={`h-4 w-4 shrink-0 ${p.estado === 'factura_vencida' || p.estado === 'pago_programado_vencido' ? 'text-brand-red' : 'text-brand-yellow'}`} />
                        )}
                        {p.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-steel-300">{p.contacto ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.telefono ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs text-white">{p.facturasActivas}</TableCell>
                    <TableCell className="text-right font-display text-sm font-bold text-white">
                      {p.deudaTotal > 0 ? `$${p.deudaTotal.toLocaleString('es-CO')}` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
                        {cfg.label}
                        {esProximoPago && dias !== null && ` (${dias} día${dias !== 1 ? 's' : ''})`}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-steel-500">
            {proveedores.length === 0 ? 'No hay proveedores registrados.' : 'Sin resultados para este filtro.'}
          </p>
        )}
      </div>
    </div>
  )
}