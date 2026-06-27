'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
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

const ESTADO_CONFIG = {
  factura_vencida: { label: 'Factura vencida', variant: 'destructive' as const, priority: 1 },
  factura_proxima: { label: 'Próxima a vencer', variant: 'secondary' as const, priority: 2, className: 'bg-amber-100 text-amber-800' },
  con_deuda: { label: 'Con deuda', variant: 'secondary' as const, priority: 3 },
  pago_programado_vencido: { label: 'Pago vencido', variant: 'secondary' as const, priority: 4, className: 'bg-orange-100 text-orange-800' },
  pago_programado_proximo: { label: 'Pago próximo', variant: 'secondary' as const, priority: 5, className: 'bg-blue-100 text-blue-800' },
  al_dia: { label: 'Al día', variant: 'default' as const, priority: 6 },
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
      {/* Panel de pagos próximos */}
      {(eventosHoy.length > 0 || eventos7Dias.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hoy */}
          {eventosHoy.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-red-800">Pagos para hoy</h3>
                <span className="font-bold text-red-900">${totalHoy.toLocaleString('es-CO')}</span>
              </div>
              {eventosHoy.map((e, i) => (
                <div key={i} className="flex justify-between text-xs rounded-md bg-white border px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={e.tipo === 'factura' ? 'destructive' : 'secondary'} className="text-xs">
                      {e.tipo === 'factura' ? 'Factura' : 'Programado'}
                    </Badge>
                    <span className="text-slate-600">{e.descripcion}</span>
                  </div>
                  <span className="font-medium">${e.monto.toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Próximos 7 días */}
          {eventos7Dias.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-amber-800">Próximos 7 días</h3>
                <span className="font-bold text-amber-900">${total7Dias.toLocaleString('es-CO')}</span>
              </div>
              {Object.entries(eventosPorFecha)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, evs]) => (
                  <div key={fecha} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-amber-700">
                        {fecha} ({diasRestantes(fecha)} día{diasRestantes(fecha) !== 1 ? 's' : ''})
                      </span>
                      <span className="text-xs font-medium text-amber-800">
                        ${evs.reduce((s, e) => s + e.monto, 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    {evs.map((e, i) => (
                      <div key={i} className="flex justify-between text-xs rounded-md bg-white border px-2 py-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={e.tipo === 'factura' ? 'secondary' : 'default'} className="text-xs">
                            {e.tipo === 'factura' ? 'Factura' : 'Programado'}
                          </Badge>
                          <span className="text-slate-600">{e.descripcion}</span>
                        </div>
                        <span className="font-medium">${e.monto.toLocaleString('es-CO')}</span>
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
        <div className="relative flex-1 min-w-48">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, contacto o NIT…"
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
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
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
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
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
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/dashboard/proveedores/${p.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {['factura_vencida', 'factura_proxima', 'pago_programado_vencido', 'pago_programado_proximo'].includes(p.estado) && (
                        <AlertTriangle className={`h-4 w-4 shrink-0 ${p.estado === 'factura_vencida' || p.estado === 'pago_programado_vencido' ? 'text-red-500' : 'text-amber-500'}`} />
                      )}
                      {p.nombre}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{p.contacto ?? '—'}</TableCell>
                  <TableCell className="text-slate-500">{p.telefono ?? '—'}</TableCell>
                  <TableCell className="text-right">{p.facturasActivas}</TableCell>
                  <TableCell className="text-right font-medium">
                    {p.deudaTotal > 0 ? `$${p.deudaTotal.toLocaleString('es-CO')}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={cfg.variant}
                      className={'className' in cfg ? cfg.className : ''}
                    >
                      {cfg.label}
                      {esProximoPago && dias !== null && ` (${dias} día${dias !== 1 ? 's' : ''})`}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            {proveedores.length === 0 ? 'No hay proveedores registrados.' : 'Sin resultados para este filtro.'}
          </p>
        )}
      </div>
    </div>
  )
}