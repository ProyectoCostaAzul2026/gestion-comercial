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
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
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
      <div className="mb-4 grid grid-cols-2 items-end gap-3 sm:grid-cols-[10rem_10rem_1fr]">
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-suave">Desde</label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => actualizarFecha('desde', e.target.value)}
            className="h-12 w-full border-linea bg-superficie-2 text-tinta"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-suave">Hasta</label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => actualizarFecha('hasta', e.target.value)}
            className="h-12 w-full border-linea bg-superficie-2 text-tinta"
          />
        </div>
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por servicio, ticket, cliente o empleado…"
            className="h-12 border-linea bg-superficie-2 pl-9 text-[16px] text-tinta placeholder:text-tenue"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-superficie">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
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
                  className="cursor-pointer border-linea hover:bg-velo/5"
                  onClick={() => router.push(`/dashboard/ventas/${s.ventas?.id}`)}
                >
                  <TableCell className="text-xs font-medium text-tinta">{s.nombre_servicio}</TableCell>
                  <TableCell className="text-right font-display text-sm font-bold text-tinta">${Number(s.precio_aplicado).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-xs text-enlace">#{s.ventas?.numero_ticket}</TableCell>
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