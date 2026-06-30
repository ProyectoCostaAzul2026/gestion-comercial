'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface ProductoAgotado {
  id: string
  nombre: string
  codigo: string
  marca: string | null
  unidad_medida: string | null
  prioridad: number
  stock_actual: number
  stock_bodega: number
  stock_almacen: number
  proveedor1: string | null
  proveedor2: string | null
}

const PRIORIDAD_LABEL: Record<number, string> = {
  1: '1 - Crítico',
  2: '2 - Alta',
  3: '3 - Media',
  4: '4 - Baja',
  5: '5 - Mínima',
}

interface Props {
  productos: ProductoAgotado[]
  proveedores: { id: string; nombre: string }[]
}

export function AgotadosTable({ productos, proveedores }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [filtroProveedor, setFiltroProveedor] = useState('todos')
  const [diasPedido, setDiasPedido] = useState(30)
  const [calculando, setCalculando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const [listaPedido, setListaPedido] = useState<{
    id: string
    codigo: string
    nombre: string
    marca: string | null
    unidad_medida: string | null
    proveedor1: string | null
    proveedor2: string | null
    stock_actual: number
    stock_bodega: number
    stock_almacen: number
    rotacion_diaria: number
    cantidad_pedir: number
  }[]>([])

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const estado = p.stock_actual <= 0 ? 'agotado' : 'bajo'
      if (filtroEstado !== 'todos' && estado !== filtroEstado) return false
      if (filtroPrioridad !== 'todas' && String(p.prioridad) !== filtroPrioridad) return false
      if (filtroProveedor !== 'todos') {
        const provNombre = proveedores.find(pr => pr.id === filtroProveedor)?.nombre
        if (p.proveedor1 !== provNombre && p.proveedor2 !== provNombre) return false
      }
      return true
    })
  }, [productos, filtroEstado, filtroPrioridad, filtroProveedor, proveedores])

  const handleCalcularPedido = async () => {
    setCalculando(true)
    try {
      const ids = filtrados.map(p => p.id)
      const { data: rotaciones, error } = await supabase.rpc('calcular_rotacion_productos', {
        p_producto_ids: ids,
        p_dias: 90,
      })
      if (error) throw error

      const rotacionMap: Record<string, number> = {}
      for (const r of (rotaciones as any[]) ?? []) {
        rotacionMap[r.producto_id] = Number(r.rotacion_diaria)
      }

      const lista = filtrados.map(p => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        marca: p.marca,
        unidad_medida: p.unidad_medida,
        proveedor1: p.proveedor1,
        proveedor2: p.proveedor2,
        stock_actual: p.stock_actual,
        stock_bodega: p.stock_bodega,
        stock_almacen: p.stock_almacen,
        rotacion_diaria: rotacionMap[p.id] ?? 0,
        cantidad_pedir: Math.max(0, Math.ceil((rotacionMap[p.id] ?? 0) * diasPedido) - (p.stock_almacen + p.stock_bodega)),
      }))

      setListaPedido(lista)
      setConfirmando(true)
    } catch (err: any) {
      toast.error('Error al calcular: ' + err.message)
    } finally {
      setCalculando(false)
    }
  }

  const handleImprimir = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    const nombreProveedor = proveedores.find(p => p.id === filtroProveedor)?.nombre ?? 'Proveedor'
    doc.text(`Lista de Pedido — ${nombreProveedor}`, 14, 15)
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 21)

    autoTable(doc, {
      startY: 28,
      head: [['Cód. proveedor', 'Nombre', 'Marca', 'Medida', 'Cant. a pedir']],
      body: listaPedido.map(p => [
        p.codigo,
        p.nombre,
        p.marca ?? '—',
        p.unidad_medida ?? '—',
        String(p.cantidad_pedir),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 34, 43] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 70 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
      },
    })

    doc.save(`lista-pedido-${new Date().toISOString().slice(0, 10)}.pdf`)
    setConfirmando(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select
            items={[
              { value: 'todos', label: 'Todos los estados' },
              { value: 'agotado', label: 'Agotado' },
              { value: 'bajo', label: 'Stock bajo' },
            ]}
            onValueChange={(v) => v && setFiltroEstado(v)}
            value={filtroEstado}
          >
            <SelectTrigger className="w-44 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="agotado">Agotado</SelectItem>
              <SelectItem value="bajo">Stock bajo</SelectItem>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: 'todas', label: 'Todas las prioridades' },
              ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: PRIORIDAD_LABEL[n] })),
            ]}
            onValueChange={(v) => v && setFiltroPrioridad(v)}
            value={filtroPrioridad}
          >
            <SelectTrigger className="w-48 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las prioridades</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{PRIORIDAD_LABEL[n]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: 'todos', label: 'Todos los proveedores' },
              ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
            ]}
            onValueChange={(v) => v && setFiltroProveedor(v)}
            value={filtroProveedor}
          >
            <SelectTrigger className="w-52 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Días próximo pedido</label>
            <input
              type="number"
              min={1}
              value={diasPedido || ''}
              onFocus={e => e.target.select()}
              onChange={e => setDiasPedido(parseInt(e.target.value) || 0)}
              className="h-9 w-20 rounded-xl border border-white/10 bg-[#1a2430] px-2 text-sm text-white"
            />
          </div>
          {filtroProveedor === 'todos' ? (
            <p className="self-center text-xs text-brand-yellow">
              Selecciona un proveedor para imprimir lista
            </p>
          ) : (
            <button
              type="button"
              onClick={handleCalcularPedido}
              disabled={calculando || diasPedido <= 0}
              className="inline-flex items-center justify-center rounded-xl border border-brand-yellow/60 px-4 py-2 text-sm font-semibold text-brand-yellow hover:bg-brand-yellow/10 disabled:opacity-50"
            >
              {calculando ? 'Calculando…' : 'Imprimir Lista'}
            </button>
          )}
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
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Proveedor 1</TableHead>
                <TableHead>Proveedor 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((producto) => (
                <TableRow
                  key={producto.id}
                  className="cursor-pointer border-white/8 hover:bg-white/5"
                  onClick={() => router.push(`/dashboard/inventario/${producto.id}`)}
                >
                  <TableCell className="font-mono text-xs text-brand-yellow">{producto.codigo}</TableCell>
                  <TableCell className="text-xs font-medium text-white">{producto.nombre}</TableCell>
                  <TableCell className="text-xs text-steel-300">{producto.unidad_medida ?? '—'}</TableCell>
                  <TableCell className="text-xs text-steel-300">{producto.marca ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${producto.stock_actual <= 0 ? 'border-brand-red/30 bg-brand-red/20 text-brand-red' : 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'}`}>
                      {producto.stock_actual <= 0 ? 'Agotado' : 'Stock bajo'}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right font-display text-sm font-bold ${producto.stock_actual <= 0 ? 'text-brand-red' : 'text-brand-yellow'}`}>{producto.stock_actual}</TableCell>
                  <TableCell className="text-xs text-steel-300">{PRIORIDAD_LABEL[producto.prioridad] ?? producto.prioridad}</TableCell>
                  <TableCell className="text-xs text-steel-300">{producto.proveedor1 ?? '—'}</TableCell>
                  <TableCell className="text-xs text-steel-300">{producto.proveedor2 ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-steel-500">No hay productos en bajo stock con estos filtros.</p>
        )}
      </div>

      {/* Panel confirmación pedido */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#111820] p-6 shadow-2xl">
            <h3 className="font-display font-bold text-white">
              Vista previa — Lista de Pedido · {proveedores.find(p => p.id === filtroProveedor)?.nombre ?? ''}
            </h3>
            <p className="text-xs text-steel-300">Días proyectados: {diasPedido}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 text-steel-300">
                  <th className="pb-1 text-left">Cód. proveedor</th>
                  <th className="pb-1 text-left">Nombre</th>
                  <th className="pb-1 text-left">Marca</th>
                  <th className="pb-1 text-left">Medida</th>
                  <th className="pb-1 text-right">
                    <input
                      type="number"
                      className="w-16 rounded border border-white/10 bg-[#1a2430] px-1 text-right text-white"
                      value={diasPedido || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const d = parseInt(e.target.value) || 0
                        setDiasPedido(d)
                        setListaPedido(prev => prev.map(p => ({
                          ...p,
                          cantidad_pedir: Math.max(0, Math.ceil(p.rotacion_diaria * d) - (p.stock_almacen + p.stock_bodega)),
                        })))
                      }}
                    />
                    {' '}días
                  </th>
                </tr>
              </thead>
              <tbody>
                {listaPedido.map((p, idx) => (
                  <tr key={p.id} className="border-b border-white/8 last:border-0">
                    <td className="py-1 font-mono text-brand-yellow">{p.codigo}</td>
                    <td className="py-1 font-medium text-white">{p.nombre}</td>
                    <td className="py-1 text-steel-300">{p.marca ?? '—'}</td>
                    <td className="py-1 text-steel-300">{p.unidad_medida ?? '—'}</td>
                    <td className="py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        value={p.cantidad_pedir}
                        onFocus={e => e.target.select()}
                        onChange={e => setListaPedido(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad_pedir: parseInt(e.target.value) || 0 } : it
                        ))}
                        className="w-16 rounded border border-white/10 bg-[#1a2430] px-1 text-right text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleImprimir}
                className="inline-flex items-center rounded-xl bg-brand-yellow px-4 py-2 text-sm font-bold text-steel-900 hover:brightness-105"
              >
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="inline-flex items-center rounded-xl border border-white/10 bg-[#1a2430] px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
              >
                Volver a editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}