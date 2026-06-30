'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, ShoppingCart, FileDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { toast } from 'sonner'

interface ProductoProveedor {
  id: string
  referencia_proveedor: string | null
  precio_costo: number
  es_proveedor_principal: boolean
  producto: {
    id: string
    nombre: string
    codigo: string | null
    activo: boolean
    stock_actual: number
    stock_minimo: number
    marca: string | null
    unidad_medida: string | null
    posicion?: number
  }
}

interface ItemPedido {
  id: string
  referencia_proveedor: string | null
  nombre: string
  marca: string | null
  unidad_medida: string | null
  stock_actual: number
  stock_minimo: number
  cantidad_pedir: number
  rotacion_diaria: number
  posicion: number
}

export function ProductosProveedorTable({
  productos,
  proveedorNombre,
}: {
  productos: ProductoProveedor[]
  proveedorNombre: string
}) {
  const supabase = createClient()
  const [modoPedido, setModoPedido] = useState(false)
  const [pedido, setPedido] = useState<ItemPedido[]>([])
  const [diasPedido, setDiasPedido] = useState(30)
  const [calculando, setCalculando] = useState(false)
  const [calculado, setCalculado] = useState(false)

  const calcularYMostrarPedido = async () => {
    setCalculando(true)
    try {
      const productoIds = productos
        .filter(pp => pp.producto.activo)
        .map(pp => pp.producto.id)

      const { data: rotaciones, error } = await supabase.rpc('calcular_rotacion_productos', {
        p_producto_ids: productoIds,
        p_dias: 90,
      })

      if (error) throw error

      const rotacionMap: Record<string, number> = {}
      for (const r of (rotaciones as any[]) ?? []) {
        rotacionMap[r.producto_id] = Number(r.rotacion_diaria)
      }

      const items: ItemPedido[] = productos
        .filter(pp => pp.producto.activo)
        .map((pp, idx) => {
          const rotacion = rotacionMap[pp.producto.id] ?? 0
          const stockTotal = pp.producto.stock_actual ?? 0
          const sugerida = Math.max(0, Math.ceil(rotacion * diasPedido) - stockTotal)
          return {
            id: pp.id,
            referencia_proveedor: pp.referencia_proveedor,
            nombre: pp.producto.nombre,
            marca: pp.producto.marca,
            unidad_medida: pp.producto.unidad_medida,
            stock_actual: pp.producto.stock_actual,
            stock_minimo: pp.producto.stock_minimo,
            cantidad_pedir: Math.max(sugerida, 0),
            rotacion_diaria: rotacion,
            posicion: pp.producto.posicion ?? 1,
          }
        })
        .sort((a, b) => a.posicion - b.posicion)

      setPedido(items)
      setCalculado(true)
    } catch (err: any) {
      toast.error('Error al calcular rotación: ' + err.message)
    } finally {
      setCalculando(false)
    }
  }

  const generarPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`Lista de Pedido — ${proveedorNombre}`, 14, 15)
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 21)
    autoTable(doc, {
      startY: 28,
      head: [['Cód. proveedor', 'Nombre', 'Marca', 'Medida', 'Cant. a pedir']],
      body: pedido
        .filter(p => p.cantidad_pedir > 0)
        .map(p => [
          p.referencia_proveedor ?? '—',
          p.nombre,
          p.marca ?? '—',
          p.unidad_medida ?? '—',
          String(p.cantidad_pedir),
        ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 34, 43] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 18 },
        5: { cellWidth: 22 },
      },
    })

    doc.save(`pedido-${proveedorNombre.toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Productos asociados ({productos.length})
        </h2>
        {!modoPedido && (
          <Button type="button" variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setModoPedido(true)}>
            <ShoppingCart className="mr-1 h-4 w-4" />
            Hacer pedido
          </Button>
        )}
      </div>

      {/* Tabla de productos */}
      {!modoPedido && (
        <>
          {productos.length === 0 ? (
            <p className="text-sm text-steel-500">Sin productos asociados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs text-steel-300">
                    <th className="pb-2 pr-3 text-left">Cód. proveedor</th>
                    <th className="pb-2 pr-3 text-left">Nombre</th>
                    <th className="pb-2 pr-3 text-right">Stock</th>
                    <th className="pb-2 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(pp => {
                    const stockBajo = pp.producto.stock_actual <= pp.producto.stock_minimo
                    return (
                      <tr key={pp.id} className="border-b border-white/8 last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs text-brand-yellow">
                          {pp.referencia_proveedor ?? '—'}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <span className={!pp.producto.activo ? 'text-steel-500' : 'text-white'}>
                              {pp.producto.nombre}
                            </span>
                            {pp.es_proveedor_principal && (
                              <span className="inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2 py-0.5 text-xs font-semibold text-brand-yellow">Principal</span>
                            )}
                            {!pp.producto.activo && (
                              <span className="text-xs text-steel-500">(inactivo)</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <span className={stockBajo ? 'font-medium text-brand-red' : 'text-white'}>
                            {pp.producto.stock_actual}
                          </span>
                          {stockBajo && (
                            <span className="ml-2 inline-flex items-center rounded-full border border-brand-red/30 bg-brand-red/20 px-2 py-0.5 text-xs font-semibold text-brand-red">Stock bajo</span>
                          )}
                        </td>
                        <td className="py-2 text-right text-steel-300">
                          ${pp.precio_costo.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modo pedido */}
      {modoPedido && (
        <div className="space-y-4">
          {/* Configuración días */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a2430] p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">
                  Días hasta el próximo pedido
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={diasPedido || ''}
                  onChange={e => {
                    setDiasPedido(parseInt(e.target.value) || 0)
                    setCalculado(false)
                  }}
                  className="h-8 w-24 border-white/10 bg-[#111820] text-sm text-white"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105"
                onClick={calcularYMostrarPedido}
                disabled={calculando || diasPedido <= 0}
              >
                {calculando ? 'Calculando…' : calculado ? 'Recalcular' : 'Calcular cantidades'}
              </Button>
            </div>
            <p className="text-xs text-steel-500">
              Las cantidades sugeridas se calculan con base en la rotación promedio de los últimos 3 meses.
            </p>
          </div>

          {/* Lista de productos */}
          {calculado && (
            <div className="space-y-2">
              {pedido.length === 0 ? (
                <p className="py-4 text-center text-sm text-steel-500">
                  Sin productos activos para este proveedor.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-2 border-b border-white/8 px-2 pb-1 text-xs text-steel-300">
                    <span className="col-span-1">Pos.</span>
                    <span className="col-span-3">Cód. proveedor</span>
                    <span className="col-span-4">Nombre</span>
                    <span className="col-span-2 text-right">Rotación/día</span>
                    <span className="col-span-1 text-right">Pedir</span>
                    <span className="col-span-1"></span>
                  </div>
                  {pedido.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-white/10 bg-[#1a2430] p-2">
                      <span className="col-span-1 text-center text-xs text-steel-500">{item.posicion}</span>
                      <span className="col-span-3 truncate font-mono text-xs text-brand-yellow">
                        {item.referencia_proveedor ?? '—'}
                      </span>
                      <div className="col-span-4 min-w-0">
                        <p className="truncate text-sm font-medium text-white">{item.nombre}</p>
                        <p className="text-xs text-steel-500">
                          {item.marca ?? ''}{item.unidad_medida ? ` · ${item.unidad_medida}` : ''}
                          {' · '}Stock: <span className={item.stock_actual <= item.stock_minimo ? 'text-brand-red' : 'text-steel-300'}>{item.stock_actual}</span>
                        </p>
                      </div>
                      <span className="col-span-2 text-right text-xs text-steel-300">
                        {item.rotacion_diaria > 0 ? item.rotacion_diaria.toFixed(2) : '—'}
                      </span>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          min={0}
                          value={item.cantidad_pedir === 0 ? 0 : item.cantidad_pedir}
                          onFocus={e => e.target.select()}
                          onChange={e => setPedido(prev => prev.map((it, i) =>
                            i === idx ? { ...it, cantidad_pedir: parseInt(e.target.value) || 0 } : it
                          ))}
                          className="h-7 w-full border-white/10 bg-[#111820] text-right text-xs text-white"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setPedido(prev => prev.filter((_, i) => i !== idx))}
                          className="text-steel-300 hover:text-brand-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {calculado && pedido.some(p => p.cantidad_pedir > 0) && (
              <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={generarPDF}>
                <FileDown className="mr-1 h-4 w-4" />
                Descargar PDF
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white"
              onClick={() => { setModoPedido(false); setPedido([]); setCalculado(false) }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}