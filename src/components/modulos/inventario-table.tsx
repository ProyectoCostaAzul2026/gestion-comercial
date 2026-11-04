'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { ordenarPorMedida } from '@/lib/escala-precios'

export interface ProductoListItem {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  ubicacion: string | null
  unidad_medida: string | null
  precio_venta: number
  stock_actual: number
  familia_id: string | null
  caracteristica: string | null
  orden_medida: number | null
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con', 'para', 'un', 'una'])

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
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

/** Grupo de medidas: misma familia, característica y marca. Un producto sin familia es su propio grupo. */
function claveGrupo(p: ProductoListItem): string {
  return p.familia_id ? `${p.familia_id}|${p.caracteristica ?? ''}|${p.marca ?? ''}` : `producto|${p.id}`
}

const pesos = (v: number) => `$${Number(v).toLocaleString('es-CO')}`

function FilaProducto({ producto, enGrupo = false }: { producto: ProductoListItem; enGrupo?: boolean }) {
  const router = useRouter()
  return (
    <TableRow
      className={`cursor-pointer border-white/8 hover:bg-white/5 ${enGrupo ? 'bg-white/[0.02]' : ''}`}
      onClick={() => router.push(`/dashboard/inventario/${producto.id}`)}
    >
      <TableCell className="font-mono text-xs text-brand-yellow">{producto.codigo ?? '—'}</TableCell>
      <TableCell className={`text-xs font-medium ${enGrupo ? 'pl-8 text-steel-300' : 'text-white'}`}>{producto.nombre}</TableCell>
      <TableCell className={`text-xs ${enGrupo ? 'font-medium text-white' : 'text-steel-300'}`}>{producto.unidad_medida ?? '—'}</TableCell>
      <TableCell className="text-xs text-steel-300">{producto.marca ?? '—'}</TableCell>
      <TableCell className={`text-right font-display text-sm font-bold ${producto.stock_actual === 0 ? 'text-brand-red' : 'text-brand-yellow'}`}>{producto.stock_actual}</TableCell>
      <TableCell className="text-right text-xs text-white">{pesos(producto.precio_venta)}</TableCell>
      <TableCell className="text-xs text-steel-300">{producto.ubicacion ?? '—'}</TableCell>
      <TableCell className="text-right">
        <Link
          href={`/dashboard/inventario/${producto.id}/editar`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-brand-blue hover:underline"
        >
          Editar
        </Link>
      </TableCell>
    </TableRow>
  )
}

export function InventarioTable({ productos }: { productos: ProductoListItem[] }) {
  const [query, setQuery] = useState('')
  const [agrupar, setAgrupar] = useState(false)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  const filtrados = useMemo(
    () => productos.filter((p) => coincideBusqueda(p, query)),
    [productos, query]
  )

  // Vista por grupos de medidas: una fila por grupo (en el orden alfabético de la lista) que se despliega con sus medidas
  const grupos = useMemo(() => {
    if (!agrupar) return []
    const porClave = new Map<string, ProductoListItem[]>()
    for (const p of filtrados) {
      const clave = claveGrupo(p)
      const lista = porClave.get(clave)
      if (lista) lista.push(p); else porClave.set(clave, [p])
    }
    return [...porClave.entries()].map(([clave, items]) => ({ clave, items: ordenarPorMedida(items) }))
  }, [agrupar, filtrados])

  const buscando = query.trim() !== ''
  const alternar = (clave: string) => {
    setAbiertos(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(clave)) siguiente.delete(clave); else siguiente.add(clave)
      return siguiente
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, código, marca, medida o ubicación…"
            className="h-12 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="agrupar-medidas" checked={agrupar} onCheckedChange={(v) => setAgrupar(v)} />
          <Label htmlFor="agrupar-medidas" className="text-sm text-steel-300">Ver por grupos de medidas</Label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
              {!agrupar && filtrados.map((producto) => <FilaProducto key={producto.id} producto={producto} />)}

              {agrupar && grupos.map(({ clave, items }) => {
                if (items.length === 1) return <FilaProducto key={clave} producto={items[0]} />
                const abierto = buscando || abiertos.has(clave)
                const precios = items.map(i => Number(i.precio_venta))
                const minimo = Math.min(...precios)
                const maximo = Math.max(...precios)
                const ubicaciones = new Set(items.map(i => i.ubicacion ?? ''))
                const Chevron = abierto ? ChevronDown : ChevronRight
                return (
                  <Fragment key={clave}>
                    <TableRow className="cursor-pointer border-white/8 hover:bg-white/5" onClick={() => alternar(clave)}
                      aria-expanded={abierto}>
                      <TableCell className="text-xs text-steel-500">—</TableCell>
                      <TableCell className="text-xs font-semibold text-white">
                        <span className="inline-flex items-center gap-1">
                          <Chevron className="h-3.5 w-3.5 shrink-0 text-steel-300" aria-hidden />
                          {items[0].nombre}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-steel-300">{items.length} medidas</TableCell>
                      <TableCell className="text-xs text-steel-300">{items[0].marca ?? '—'}</TableCell>
                      <TableCell className="text-right font-display text-sm font-bold text-brand-yellow">
                        {items.reduce((suma, i) => suma + i.stock_actual, 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-white">
                        {minimo === maximo ? pesos(minimo) : `${pesos(minimo)} a ${pesos(maximo)}`}
                      </TableCell>
                      <TableCell className="text-xs text-steel-300">
                        {ubicaciones.size === 1 ? (items[0].ubicacion ?? '—') : 'Varias'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/inventario/${items[0].id}/grupo`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-brand-blue hover:underline"
                        >
                          Ver grupo
                        </Link>
                      </TableCell>
                    </TableRow>
                    {abierto && items.map(producto => <FilaProducto key={producto.id} producto={producto} enGrupo />)}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-steel-500">
            {productos.length === 0 ? 'No hay productos registrados todavía.' : 'No se encontraron productos con esa búsqueda.'}
          </p>
        )}
      </div>
    </div>
  )
}
