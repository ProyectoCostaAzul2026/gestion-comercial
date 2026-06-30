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
          <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Desde</label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => actualizarFecha('desde', e.target.value)}
            className="w-40 border-white/10 bg-[#1a2430] text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Hasta</label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => actualizarFecha('hasta', e.target.value)}
            className="w-40 border-white/10 bg-[#1a2430] text-white"
          />
        </div>
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por servicio, ticket, cliente o empleado…"
            className="h-12 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
                  className="cursor-pointer border-white/8 hover:bg-white/5"
                  onClick={() => router.push(`/dashboard/ventas/${s.ventas?.id}`)}
                >
                  <TableCell className="text-xs font-medium text-white">{s.nombre_servicio}</TableCell>
                  <TableCell className="text-right font-display text-sm font-bold text-white">${Number(s.precio_aplicado).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-xs text-brand-blue">#{s.ventas?.numero_ticket}</TableCell>
                  <TableCell className="text-xs text-steel-300">{s.ventas?.fecha}</TableCell>
                  <TableCell className="text-xs text-steel-300">{s.ventas?.empleado?.nombre_completo ?? '—'}</TableCell>
                  <TableCell className="text-xs text-steel-300">{s.ventas?.clientes?.nombre ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-steel-500">
            {servicios.length === 0
              ? 'No hay servicios registrados en este período.'
              : 'No se encontraron servicios con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}