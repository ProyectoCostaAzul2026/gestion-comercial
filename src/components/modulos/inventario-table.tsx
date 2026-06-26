'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'

export interface ProductoListItem {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  ubicacion: string | null
  unidad_medida: string | null
  precio_venta: number
  stock_actual: number
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con', 'para', 'un', 'una'])

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function coincideBusqueda(producto: ProductoListItem, query: string): boolean {
  const tokens = normalizar(query).split(/\s+/).filter((t) => t.length > 0 && !STOPWORDS.has(t))
  if (tokens.length === 0) return true
  const textoCompleto = normalizar(
    [producto.codigo, producto.nombre, producto.marca, producto.unidad_medida, producto.ubicacion]
      .filter(Boolean)
      .join(' ')
  )
  return tokens.every((token) => textoCompleto.includes(token))
}

export function InventarioTable({ productos }: { productos: ProductoListItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtrados = useMemo(
    () => productos.filter((p) => coincideBusqueda(p, query)),
    [productos, query]
  )

  return (
    <div>
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, código, marca, medida o ubicación…"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Medida</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((producto) => (
              <TableRow
                key={producto.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/inventario/${producto.id}`)}
              >
                <TableCell className="text-slate-500">{producto.codigo ?? '—'}</TableCell>
                <TableCell className="font-medium">{producto.nombre}</TableCell>
                <TableCell className="text-slate-500">{producto.unidad_medida ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{producto.marca ?? '—'}</TableCell>
                <TableCell className="text-right">{producto.stock_actual}</TableCell>
                <TableCell className="text-right">${Number(producto.precio_venta).toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-slate-500">{producto.ubicacion ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/inventario/${producto.id}/editar`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-slate-500 hover:text-slate-900 hover:underline"
                  >
                    Editar
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            {productos.length === 0 ? 'No hay productos registrados todavía.' : 'No se encontraron productos con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}