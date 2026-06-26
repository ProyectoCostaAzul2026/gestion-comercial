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

  // ✅ Change 1: expanded listaPedido interface
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

      // ✅ Change 2: include marca, unidad_medida, stock_bodega, stock_almacen
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

    // ✅ Change 3: updated autoTable columns
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
      headStyles: { fillColor: [15, 23, 42] },
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
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
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
            <label className="text-xs text-slate-500">Días próximo pedido</label>
            <input
              type="number"
              min={1}
              value={diasPedido || ''}
              onFocus={e => e.target.select()}
              onChange={e => setDiasPedido(parseInt(e.target.value) || 0)}
              className="w-20 h-9 rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          {filtroProveedor === 'todos' ? (
            <p className="text-xs text-amber-600 self-center">
              Selecciona un proveedor para imprimir lista
            </p>
          ) : (
            <button
              type="button"
              onClick={handleCalcularPedido}
              disabled={calculando || diasPedido <= 0}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {calculando ? 'Calculando…' : 'Imprimir Lista'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
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
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/inventario/${producto.id}`)}
              >
                <TableCell className="text-slate-500 text-xs">{producto.codigo}</TableCell>
                <TableCell className="font-medium">{producto.nombre}</TableCell>
                <TableCell className="text-slate-500">{producto.unidad_medida ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{producto.marca ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={producto.stock_actual <= 0 ? 'destructive' : 'secondary'}>
                    {producto.stock_actual <= 0 ? 'Agotado' : 'Stock bajo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{producto.stock_actual}</TableCell>
                <TableCell className="text-slate-500">{PRIORIDAD_LABEL[producto.prioridad] ?? producto.prioridad}</TableCell>
                <TableCell className="text-slate-500">{producto.proveedor1 ?? '—'}</TableCell>
                <TableCell className="text-slate-500">{producto.proveedor2 ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtrados.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No hay productos en bajo stock con estos filtros.</p>
        )}
      </div>

      {/* Panel confirmación pedido */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg border shadow-lg p-6 max-w-2xl w-full mx-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-900">
              Vista previa — Lista de Pedido · {proveedores.find(p => p.id === filtroProveedor)?.nombre ?? ''}
            </h3>
            <p className="text-xs text-slate-500">Días proyectados: {diasPedido}</p>
            <table className="w-full text-xs">
              {/* ✅ Change 4: updated preview thead and tbody */}
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="text-left pb-1">Cód. proveedor</th>
                  <th className="text-left pb-1">Nombre</th>
                  <th className="text-left pb-1">Marca</th>
                  <th className="text-left pb-1">Medida</th>
                  <th className="text-right pb-1">
                    <input
                      type="number"
                      className="w-16 border rounded px-1 text-right"
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
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1 text-slate-500">{p.codigo}</td>
                    <td className="py-1 font-medium">{p.nombre}</td>
                    <td className="py-1 text-slate-500">{p.marca ?? '—'}</td>
                    <td className="py-1 text-slate-500">{p.unidad_medida ?? '—'}</td>
                    <td className="py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        value={p.cantidad_pedir}
                        onFocus={e => e.target.select()}
                        onChange={e => setListaPedido(prev => prev.map((it, i) =>
                          i === idx ? { ...it, cantidad_pedir: parseInt(e.target.value) || 0 } : it
                        ))}
                        className="w-16 border rounded px-1 text-right"
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
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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