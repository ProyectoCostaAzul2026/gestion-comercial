'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Search, Power, Trash2 } from 'lucide-react'

export interface ProductoDesactivado {
  id: string
  codigo: string | null
  nombre: string
  unidad_medida: string | null
  marca: string | null
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
      <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
        {titulo} ({productos.length})
      </h2>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre, código, marca o medida…"
          className="h-11 border-white/10 bg-[#1a2430] pl-9 text-[16px] text-white placeholder:text-steel-500"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="text-sm text-steel-500">Sin productos en esta lista.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
                  <TableRow key={p.id} className="border-white/8 hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo ?? '—'}</TableCell>
                    <TableCell className="text-xs font-medium text-white">
                      <Link href={`/dashboard/inventario/${p.id}`} className="hover:underline">{p.nombre}</Link>
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
                          className="text-brand-red hover:bg-brand-red/15 hover:text-brand-red"
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

  const handleActivar = (p: ProductoDesactivado) => {
    const confirmado = window.confirm(
      `Vas a activar "${p.nombre}". A continuación se abrirá la pantalla de edición — revisa al menos el stock y el precio de venta antes de guardar. ¿Continuar?`
    )
    if (!confirmado) return
    router.push(`/dashboard/inventario/${p.id}/editar?activar=1`)
  }

  const handleEliminar = async (p: ProductoDesactivado) => {
    const confirmado = window.confirm(
      `¿Eliminar "${p.nombre}" definitivamente? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return
    setProcesando(p.id)
    try {
      const { error: movError } = await supabase.from('movimientos_inventario').delete().eq('producto_id', p.id)
      if (movError) throw movError

      const { error: delError } = await supabase.from('productos').delete().eq('id', p.id)
      if (delError) throw delError

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
        titulo="Productos Desactivados Con Registros"
        productos={listaConRegistros}
        mostrarEliminar={false}
        onActivar={handleActivar}
      />
      <Lista
        titulo="Productos Desactivados Sin Registros"
        productos={listaSinRegistros}
        mostrarEliminar={true}
        onActivar={handleActivar}
        onEliminar={handleEliminar}
      />
      {procesando && <p className="text-xs text-steel-500">Procesando…</p>}
    </div>
  )
}