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
  totalCompras?: number
  numCompras?: number
  ultimaCompra?: string | null
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con'])

function coincideBusqueda(cliente: ClienteListItem, query: string): boolean {
  if (!query.trim()) return true
  const tokens = normalizar(query).split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t))
  const textoCompleto = normalizar([cliente.nombre, cliente.telefono, cliente.nit_cc, cliente.email].filter(Boolean).join(' '))
  return tokens.every(token => textoCompleto.includes(token))
}
export function ClienteTable({ clientes }: { clientes: ClienteListItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtrados = useMemo(() => clientes.filter((c) => coincideBusqueda(c, query)), [clientes, query])

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-300" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono o documento…"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
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
                <TableCell className="font-medium text-steel-900">
                  {cliente.nombre}
                  {cliente.es_cliente_generico && <Badge variant="secondary" className="ml-2">General</Badge>}
                </TableCell>
                <TableCell className="text-steel-500">{cliente.telefono ?? '—'}</TableCell>
                <TableCell className="text-steel-500">{cliente.email ?? '—'}</TableCell>
                <TableCell className="text-steel-500">{cliente.nit_cc ?? '—'}</TableCell>
                {/* Estas 3 columnas se calculan desde `ventas`, que todavía no existe */}
                <TableCell className="text-right font-semibold text-steel-900">
                  {cliente.totalCompras ? `$${cliente.totalCompras.toLocaleString('es-CO')}` : '—'}
                </TableCell>
                <TableCell className="text-right text-steel-500">
                  {cliente.numCompras ?? '—'}
                </TableCell>
                <TableCell className="text-steel-500">
                  {cliente.ultimaCompra ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-steel-500">
            {clientes.length === 0 ? 'No hay clientes registrados todavía.' : 'No se encontraron clientes con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}