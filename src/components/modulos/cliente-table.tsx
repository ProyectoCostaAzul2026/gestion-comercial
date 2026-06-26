'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

interface ClienteListItem {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  nit_cc: string | null
  es_cliente_generico: boolean
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function coincideBusqueda(cliente: ClienteListItem, query: string): boolean {
  if (!query.trim()) return true
  const q = normalizar(query)
  const textoCompleto = normalizar([cliente.nombre, cliente.telefono, cliente.nit_cc].filter(Boolean).join(' '))
  return textoCompleto.includes(q)
}

export function ClienteTable({ clientes }: { clientes: ClienteListItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtrados = useMemo(() => clientes.filter((c) => coincideBusqueda(c, query)), [clientes, query])

  return (
    <div>
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono o documento…"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>NIT/CC</TableHead>
              <TableHead className="text-right">Total compras</TableHead>
              <TableHead className="text-right">N° compras</TableHead>
              <TableHead>Última compra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((cliente) => (
              <TableRow
                key={cliente.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}
              >
                <TableCell className="font-medium">
                  {cliente.nombre}
                  {cliente.es_cliente_generico && <Badge variant="secondary" className="ml-2">General</Badge>}
                </TableCell>
                <TableCell className="text-slate-500">{cliente.telefono ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{cliente.email ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{cliente.nit_cc ?? '—'}</TableCell>
                {/* Estas 3 columnas se calculan desde `ventas`, que todavía no existe */}
                <TableCell className="text-right text-slate-400">$0</TableCell>
                <TableCell className="text-right text-slate-400">0</TableCell>
                <TableCell className="text-slate-400">—</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            {clientes.length === 0 ? 'No hay clientes registrados todavía.' : 'No se encontraron clientes con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}