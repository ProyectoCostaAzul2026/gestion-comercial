'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

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
      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ticket o cliente…"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
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
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/ventas/${venta.id}`)}
              >
                <TableCell className="font-medium">#{venta.numero_ticket}</TableCell>
                <TableCell className="text-slate-500">{venta.hora?.slice(0, 5)}</TableCell>
                <TableCell className="text-slate-500">{venta.clientes?.nombre ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{venta.empleado?.nombre_completo ?? '—'}</TableCell>
                <TableCell className="text-right font-medium">${Number(venta.total).toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-slate-500">{TIPO_PAGO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}</TableCell>
                <TableCell>
                  <Badge variant={
                    venta.estado === 'anulada' ? 'destructive' :
                    venta.estado === 'modificada' ? 'secondary' : 'default'
                  }>
                    {venta.estado === 'anulada' ? 'Anulada' :
                     venta.estado === 'modificada' ? 'Modificada' : 'Completada'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/ventas/${venta.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-slate-500 hover:text-slate-900 hover:underline"
                  >
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtradas.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            {ventas.length === 0
              ? 'No hay ventas registradas para este filtro.'
              : 'No se encontraron ventas con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}