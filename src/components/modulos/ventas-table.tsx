'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, AlertCircle } from 'lucide-react'

export interface VentaListItem {
  id: string
  numero_ticket: number
  hora: string
  total: number
  tipo_pago: string
  estado: string
  clientes: { nombre: string } | null
  empleado: { nombre_completo: string } | null
}

const TIPO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
  credito: 'Crédito',
}

function InsigniaEstado({ estado }: { estado: string }) {
  return (
    <Badge variant="outline" className={
      estado === 'anulada'
        ? 'gap-1 rounded-full border-brand-red/30 bg-brand-red/20 text-brand-red'
        : estado === 'modificada'
          ? 'rounded-full border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'
          : 'rounded-full border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
    }>
      {estado === 'anulada' && <AlertCircle className="size-3" />}
      {estado === 'anulada' ? 'Anulada' : estado === 'modificada' ? 'Modificada' : 'Completada'}
    </Badge>
  )
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function VentasTable({ ventas }: { ventas: VentaListItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtradas = useMemo(() => {
    if (!query.trim()) return ventas
    const q = normalizar(query)
    return ventas.filter((v) =>
      normalizar(`${v.numero_ticket} ${v.clientes?.nombre ?? ''}`).includes(q)
    )
  }, [ventas, query])

  return (
    <div>
      <div className="relative mb-4 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ticket o cliente…"
          className="h-12 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
        />
      </div>

      {/* Celular: una tarjeta por venta, sin desplazarse de lado */}
      <ul className="space-y-2 md:hidden">
        {filtradas.map((venta) => (
          <li key={venta.id}>
            <Link href={`/dashboard/ventas/${venta.id}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111820] px-3 py-3 active:bg-white/5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-bold text-brand-blue">#{venta.numero_ticket}</span>
                  <span className="text-xs text-steel-300">{venta.hora?.slice(0, 5)}</span>
                  <span className="text-xs text-steel-300">· {TIPO_PAGO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}</span>
                </p>
                <p className="truncate text-xs text-steel-300">
                  {venta.clientes?.nombre ?? 'Sin cliente'}{venta.empleado?.nombre_completo ? ` · ${venta.empleado.nombre_completo}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className={`font-display text-base font-bold ${venta.estado === 'anulada' ? 'text-steel-500 line-through' : 'text-white'}`}>
                  ${Number(venta.total).toLocaleString('es-CO')}
                </p>
                {venta.estado !== 'completada' && <InsigniaEstado estado={venta.estado} />}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {filtradas.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500 md:hidden">
          {ventas.length === 0 ? 'No hay ventas registradas para este filtro.' : 'No se encontraron ventas con esa búsqueda.'}
        </p>
      )}

      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#111820] md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                <TableHead>Ticket #</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Tipo Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((venta) => (
                <TableRow
                  key={venta.id}
                  className="cursor-pointer border-white/8 hover:bg-white/5"
                  onClick={() => router.push(`/dashboard/ventas/${venta.id}`)}
                >
                  <TableCell className="font-mono text-xs font-medium text-brand-blue">#{venta.numero_ticket}</TableCell>
                  <TableCell className="text-xs text-steel-300">{venta.hora?.slice(0, 5)}</TableCell>
                  <TableCell className="text-xs text-steel-300">{venta.clientes?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-xs text-steel-300">{venta.empleado?.nombre_completo ?? '—'}</TableCell>
                  <TableCell className="text-right font-display text-sm font-bold text-white">${Number(venta.total).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-xs text-steel-300">{TIPO_PAGO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}</TableCell>
                  <TableCell>
                    <InsigniaEstado estado={venta.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/ventas/${venta.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-brand-blue hover:underline"
                    >
                      Ver
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtradas.length === 0 && (
          <p className="p-8 text-center text-sm text-steel-500">
            {ventas.length === 0
              ? 'No hay ventas registradas para este filtro.'
              : 'No se encontraron ventas con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}