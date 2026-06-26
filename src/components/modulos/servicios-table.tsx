'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'

interface ServicioItem {
  id: string
  nombre_servicio: string
  precio_aplicado: number
  ventas: {
    id: string
    numero_ticket: number
    fecha: string
    clientes: { nombre: string } | null
    empleado: { nombre_completo: string } | null
  }
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function ServiciosTable({
  servicios,
  desde,
  hasta,
}: {
  servicios: ServicioItem[]
  desde: string
  hasta: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  const actualizarFecha = (clave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(clave, valor)
    router.push(`${pathname}?${params.toString()}`)
  }

  const filtrados = useMemo(() => {
    if (!query.trim()) return servicios
    const q = normalizar(query)
    return servicios.filter((s) =>
      normalizar(
        `${s.nombre_servicio} ${s.ventas?.clientes?.nombre ?? ''} ${s.ventas?.empleado?.nombre_completo ?? ''} ${s.ventas?.numero_ticket ?? ''}`
      ).includes(q)
    )
  }, [servicios, query])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Desde</label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => actualizarFecha('desde', e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Hasta</label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => actualizarFecha('hasta', e.target.value)}
            className="w-40"
          />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por servicio, ticket, cliente o empleado…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servicio</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Cliente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/ventas/${s.ventas?.id}`)}
              >
                <TableCell className="font-medium">{s.nombre_servicio}</TableCell>
                <TableCell className="text-right">${Number(s.precio_aplicado).toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-slate-500">#{s.ventas?.numero_ticket}</TableCell>
                <TableCell className="text-slate-500">{s.ventas?.fecha}</TableCell>
                <TableCell className="text-slate-500">{s.ventas?.empleado?.nombre_completo ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{s.ventas?.clientes?.nombre ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            {servicios.length === 0
              ? 'No hay servicios registrados en este período.'
              : 'No se encontraron servicios con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}