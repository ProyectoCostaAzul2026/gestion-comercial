'use client'

import { MiniaturaProducto, ProductoConFoto, EnlaceA } from '@/components/ui/producto-miniatura'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/avisos'
import { Search, Power, Trash2 } from 'lucide-react'
import { confirmar } from '@/components/ui/confirmar'

export interface ProductoDesactivado {
  id: string
  codigo: string | null
  nombre: string
  unidad_medida: string | null
  marca: string | null
  imagen_url?: string | null
  updated_at: string
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con', 'para', 'un', 'una'])

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function coincideBusqueda(p: ProductoDesactivado, query: string): boolean {
  const tokens = normalizar(query).split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t))
  if (tokens.length === 0) return true
  const texto = normalizar([p.codigo, p.nombre, p.marca, p.unidad_medida].filter(Boolean).join(' '))
  return tokens.every(t => texto.includes(t))
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Lista({
  titulo, productos, mostrarEliminar, onActivar, onEliminar,
}: {
  titulo: string
  productos: ProductoDesactivado[]
  mostrarEliminar: boolean
  onActivar: (p: ProductoDesactivado) => void
  onEliminar?: (p: ProductoDesactivado) => void
}) {
  const [query, setQuery] = useState('')
  const filtrados = useMemo(() => productos.filter(p => coincideBusqueda(p, query)), [productos, query])

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
        {titulo} ({productos.length})
      </h2>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre, código, marca o medida…"
          className="h-11 border-linea bg-superficie-2 pl-9 text-[16px] text-tinta placeholder:text-tenue"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="text-sm text-steel-500">Sin productos en esta lista.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-superficie">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Última actualización</TableHead>
                  <TableHead className="text-right">Activar producto</TableHead>
                  {mostrarEliminar && <TableHead className="text-right">Eliminar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(p => (
                  <TableRow key={p.id} className="border-linea hover:bg-velo/5">
                    <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo ?? '—'}</TableCell>
                    <TableCell>
                      <ProductoConFoto id={p.id} nombre={p.nombre} url={p.imagen_url} tam="xs" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{formatearFecha(p.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="sm"
                        className="text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-400"
                        onClick={() => onActivar(p)}>
                        <Power className="mr-1 h-3.5 w-3.5" />Activar
                      </Button>
                    </TableCell>
                    {mostrarEliminar && (
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="sm"
                          className="text-sale hover:bg-brand-red/15 hover:text-sale"
                          onClick={() => onEliminar?.(p)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export function ProductosDesactivadosPanel({
  conRegistros, sinRegistros,
}: {
  conRegistros: ProductoDesactivado[]
  sinRegistros: ProductoDesactivado[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [listaConRegistros, setListaConRegistros] = useState(conRegistros)
  const [listaSinRegistros, setListaSinRegistros] = useState(sinRegistros)
  const [procesando, setProcesando] = useState<string | null>(null)

  const handleActivar = async (p: ProductoDesactivado) => {
    const confirmado = await confirmar({ titulo: `¿Activar "${p.nombre}"?`, mensaje: 'Se abre la pantalla de edición: revisa al menos el stock y el precio de venta antes de guardar.', textoConfirmar: 'Continuar' })
    if (!confirmado) return
    router.push(`/dashboard/inventario/${p.id}/editar?activar=1`)
  }

  const handleEliminar = async (p: ProductoDesactivado) => {
    const confirmado = await confirmar({ titulo: `¿Eliminar "${p.nombre}" definitivamente?`, mensaje: 'Esta acción no se puede deshacer.', tono: 'peligro', textoConfirmar: 'Eliminar' })
    if (!confirmado) return
    setProcesando(p.id)
    try {
      // La base revisa que esté desactivado, sin stock y sin ventas, devoluciones, garantías ni recepciones
      const { error } = await supabase.rpc('eliminar_producto_desactivado', { p_producto_id: p.id })
      if (error) {
        throw new Error(error.code === 'PGRST202'
          ? 'falta activar el borrado en la base de datos (migración bitacora_y_borrado_productos). El producto sigue desactivado.'
          : error.message)
      }

      toast.success('Producto eliminado')
      setListaSinRegistros(prev => prev.filter(x => x.id !== p.id))
    } catch (err: any) {
      toast.error('No se pudo eliminar: ' + err.message)
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className="space-y-10">
      <Lista
        titulo="Productos desactivados con registros"
        productos={listaConRegistros}
        mostrarEliminar={false}
        onActivar={handleActivar}
      />
      <Lista
        titulo="Productos desactivados sin registros"
        productos={listaSinRegistros}
        mostrarEliminar={true}
        onActivar={handleActivar}
        onEliminar={handleEliminar}
      />
      {procesando && <p className="text-xs text-steel-500">Procesando…</p>}
    </div>
  )
}