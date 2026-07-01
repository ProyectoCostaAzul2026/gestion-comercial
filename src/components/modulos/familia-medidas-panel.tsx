'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, Trash2, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { calcularMargenCalculado } from '@/lib/precio-utils'
import { parseUnidadMedida, generarSKU, MEDIDA_REGEX, INPUT_CLS, LABEL_CLS } from './producto-form'

interface Proveedor {
  id: string
  proveedor_id: string
  precio_costo: number
  referencia_proveedor: string | null
  notas: string | null
}

interface ProductoBase {
  id: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  categoriaNombre: string | null
  marca: string | null
  ubicacion: string | null
  precio_venta: number
  tiene_iva: boolean
  iva_incluido: boolean
  porcentaje_iva: number
  stock_minimo: number
  prioridad: number
  unidad_medida: string | null
  imagen_url: string | null
  familia_id: string | null
  vender_por_fraccion: boolean
  medida_venta: string | null
  cantidad_total_unidad: number | null
  cantidad_minima_venta: number | null
  precio_por_unidad_medida: number | null
  proveedores: Proveedor[]
}

interface Miembro {
  id: string
  nombre: string
  codigo: string | null
  unidad_medida: string | null
  stock_almacen: number
  stock_bodega: number
}

interface FamiliaMedidasPanelProps {
  empleadoId: string
  productoActualId: string
  producto: ProductoBase
  miembrosIniciales: Miembro[]
}

export function FamiliaMedidasPanel({ empleadoId, productoActualId, producto, miembrosIniciales }: FamiliaMedidasPanelProps) {
  const supabase = createClient()
  const router = useRouter()
  const { unidad } = parseUnidadMedida(producto.unidad_medida)

  const [miembros, setMiembros] = useState<Miembro[]>(miembrosIniciales)
  const [modo, setModo] = useState<'ninguno' | 'agregar' | 'editar'>('ninguno')
  const [nuevasFilas, setNuevasFilas] = useState<{ key: string; medida: string; stock_almacen: string; stock_bodega: string; costo: string }[]>([])
  const [filasEdicion, setFilasEdicion] = useState<{ id: string; medida: string; stock_almacen: string; stock_bodega: string }[]>([])
  const [guardando, setGuardando] = useState(false)

  const abrirAgregar = () => {
    setModo('agregar')
    setNuevasFilas([{ key: crypto.randomUUID(), medida: '', stock_almacen: '', stock_bodega: '', costo: '' }])
  }

  const abrirEditar = () => {
    setModo('editar')
    setFilasEdicion(miembros.map(m => ({
      id: m.id,
      medida: parseUnidadMedida(m.unidad_medida).medida,
      stock_almacen: String(m.stock_almacen),
      stock_bodega: String(m.stock_bodega),
    })))
  }

  const cerrarPanel = () => {
    setModo('ninguno')
    setNuevasFilas([])
    setFilasEdicion([])
  }

  const agregarFila = () => {
    setNuevasFilas(prev => [...prev, { key: crypto.randomUUID(), medida: '', stock_almacen: '', stock_bodega: '', costo: '' }])
  }

  const quitarFila = (key: string) => {
    setNuevasFilas(prev => prev.filter(f => f.key !== key))
  }

  const actualizarFila = (key: string, campo: 'medida' | 'stock_almacen' | 'stock_bodega' | 'costo', valor: string) => {
    setNuevasFilas(prev => prev.map(f => f.key === key ? { ...f, [campo]: valor } : f))
  }

  const actualizarEdicion = (id: string, campo: 'medida' | 'stock_almacen' | 'stock_bodega', valor: string) => {
    setFilasEdicion(prev => prev.map(f => f.id === id ? { ...f, [campo]: valor } : f))
  }

  const recargarMiembros = async (familiaId: string) => {
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, codigo, unidad_medida, stock_almacen, stock_bodega')
      .eq('familia_id', familiaId)
      .eq('activo', true)
      .order('created_at', { ascending: true })
    setMiembros(data ?? [])
  }

  const crearMiembros = async () => {
    const filasValidas = nuevasFilas.filter(f => f.medida.trim())
    if (filasValidas.length === 0) {
      toast.error('Agrega al menos una medida')
      return
    }
    for (const f of filasValidas) {
      if (!MEDIDA_REGEX.test(f.medida.trim())) {
        toast.error(`Medida inválida: "${f.medida}". Formato: 50, 3/4, 1-1/4, 3/8x2, 30x40x50`)
        return
      }
    }

    setGuardando(true)
    try {
      let familiaId = producto.familia_id
      if (!familiaId) {
        familiaId = crypto.randomUUID()
        const { error: famError } = await supabase.from('productos').update({ familia_id: familiaId }).eq('id', producto.id)
        if (famError) throw famError
      }

      const costoBaseSource = producto.proveedores.length > 0
        ? Math.min(...producto.proveedores.map(p => p.precio_costo))
        : 0

      for (const fila of filasValidas) {
        const medida = fila.medida.trim().replace(/X/g, 'x')
        const stockAlmacen = parseInt(fila.stock_almacen) || 0
        const stockBodega = parseInt(fila.stock_bodega) || 0
        const costoFila = parseFloat(fila.costo) || 0
        const unidadMedidaFinal = `${medida} ${unidad}`.trim()
        const costoUsado = costoFila > 0 ? costoFila : costoBaseSource
        const margenCalculado = costoUsado > 0
          ? calcularMargenCalculado(costoUsado, producto.precio_venta, producto.tiene_iva, producto.iva_incluido, producto.porcentaje_iva)
          : null

        const codigo = generarSKU(producto.nombre, producto.categoriaNombre ?? '', producto.marca ?? '', medida, unidad) || null

        const { data: nuevoProducto, error: prodError } = await supabase
          .from('productos')
          .insert({
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            codigo,
            categoria_id: producto.categoria_id,
            marca: producto.marca,
            ubicacion: producto.ubicacion,
            precio_venta: producto.precio_venta,
            margen_calculado: margenCalculado,
            tiene_iva: producto.tiene_iva,
            iva_incluido: producto.iva_incluido,
            porcentaje_iva: producto.porcentaje_iva,
            stock_bodega: stockBodega,
            stock_almacen: stockAlmacen,
            stock_minimo: producto.stock_minimo,
            prioridad: producto.prioridad,
            unidad_medida: unidadMedidaFinal,
            imagen_url: producto.imagen_url,
            vender_por_fraccion: producto.vender_por_fraccion,
            medida_venta: producto.vender_por_fraccion ? producto.medida_venta : null,
            cantidad_total_unidad: producto.vender_por_fraccion ? producto.cantidad_total_unidad : null,
            cantidad_minima_venta: producto.vender_por_fraccion ? producto.cantidad_minima_venta : null,
            precio_por_unidad_medida: producto.vender_por_fraccion ? producto.precio_por_unidad_medida : null,
            familia_id: familiaId,
            activo: true,
          })
          .select('id')
          .single()
        if (prodError) throw prodError

        if (producto.proveedores.length > 0) {
          const proveedoresInsert = producto.proveedores.map(p => ({
            producto_id: nuevoProducto.id,
            proveedor_id: p.proveedor_id,
            precio_costo: costoFila > 0 ? costoFila : p.precio_costo,
            referencia_proveedor: p.referencia_proveedor,
            notas: p.notas,
          }))
          const { error: provError } = await supabase.from('producto_proveedores').insert(proveedoresInsert)
          if (provError) throw provError
        }

        const stockTotal = stockAlmacen + stockBodega
        if (stockTotal > 0) {
          await supabase.from('movimientos_inventario').insert({
            producto_id: nuevoProducto.id,
            tipo: 'entrada',
            cantidad: stockTotal,
            stock_anterior: 0,
            stock_nuevo: stockTotal,
            notas: 'Stock inicial (familia de medidas)',
            empleado_id: empleadoId,
            referencia_tipo: 'producto_inicial',
          })
        }
      }

      toast.success(`${filasValidas.length} producto(s) creado(s)`)
      cerrarPanel()
      await recargarMiembros(familiaId)
      router.refresh()
    } catch (err: any) {
      if (err.code === '23505' && err.message?.includes('idx_productos_unicos_nombre_marca_medida')) {
        toast.error('Esa medida ya existe para este producto (o coincide con otro producto activo).')
      } else {
        toast.error('Error al crear miembros: ' + err.message)
      }
    } finally {
      setGuardando(false)
    }
  }

  const guardarCambios = async () => {
    for (const f of filasEdicion) {
      if (f.medida.trim() && !MEDIDA_REGEX.test(f.medida.trim())) {
        toast.error(`Medida inválida: "${f.medida}". Formato: 50, 3/4, 1-1/4, 3/8x2, 30x40x50`)
        return
      }
    }
    setGuardando(true)
    try {
      for (const fila of filasEdicion) {
        const unidadMedidaFinal = fila.medida.trim() ? `${fila.medida.trim().replace(/X/g, 'x')} ${unidad}`.trim() : null
        const { error } = await supabase
          .from('productos')
          .update({
            unidad_medida: unidadMedidaFinal,
            stock_almacen: parseInt(fila.stock_almacen) || 0,
            stock_bodega: parseInt(fila.stock_bodega) || 0,
          })
          .eq('id', fila.id)
        if (error) throw error
      }
      toast.success('Cambios guardados')
      setMiembros(prev => prev.map(m => {
        const fila = filasEdicion.find(f => f.id === m.id)
        if (!fila) return m
        return {
          ...m,
          unidad_medida: fila.medida.trim() ? `${fila.medida.trim().replace(/X/g, 'x')} ${unidad}`.trim() : null,
          stock_almacen: parseInt(fila.stock_almacen) || 0,
          stock_bodega: parseInt(fila.stock_bodega) || 0,
        }
      }))
      cerrarPanel()
      router.refresh()
    } catch (err: any) {
      toast.error('Error al guardar cambios: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const desactivarMiembro = async (id: string, nombre: string) => {
    const confirmado = window.confirm(`¿Seguro que deseas desactivar "${nombre}"? Ya no aparecerá en el inventario activo.`)
    if (!confirmado) return
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id)
    if (error) {
      toast.error('Error al desactivar: ' + error.message)
      return
    }
    toast.success('Producto desactivado')
    setMiembros(prev => prev.filter(m => m.id !== id))
    setFilasEdicion(prev => prev.filter(f => f.id !== id))
    if (id === productoActualId) {
      router.push('/dashboard/inventario')
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado — datos compartidos de la familia, no editables aquí */}
      <div className="space-y-3 text-center">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} className="mx-auto h-40 w-40 rounded-2xl border border-white/10 object-cover" />
        ) : (
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border border-white/10 bg-[#1a2430]">
            <Package className="size-14 text-brand-yellow/50" />
          </div>
        )}
        <div>
          <p className="font-display text-xl font-bold text-white">{producto.nombre}</p>
          <p className="mt-0.5 text-sm text-steel-300">
            {[producto.marca, producto.categoriaNombre].filter(Boolean).join(' · ') || '—'}
          </p>
          {producto.descripcion && <p className="mt-1 text-xs text-steel-500">{producto.descripcion}</p>}
        </div>
      </div>

      {/* Lista de miembros de la familia */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-white/10 bg-[#1a2430] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-steel-300">
          <span>Medida</span>
          <span className="w-20 text-right">Almacén</span>
          <span className="w-20 text-right">Bodega</span>
          <span className="w-16 text-right">—</span>
        </div>
        {miembros.map(m => (
          <div key={m.id} className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-white/5 px-4 py-3 last:border-0 ${m.id === productoActualId ? 'bg-brand-yellow/5' : ''}`}>
            <span className="text-sm font-medium text-white">
              {m.unidad_medida ?? '—'}
              {m.id === productoActualId && <span className="ml-2 text-[10px] font-bold uppercase text-brand-yellow">Actual</span>}
            </span>
            <span className="w-20 text-right text-sm text-steel-300">{m.stock_almacen}</span>
            <span className="w-20 text-right text-sm text-steel-300">{m.stock_bodega}</span>
            <span className="w-16 text-right">
              <Link href={`/dashboard/inventario/${m.id}/editar?volver=familia&origen=${productoActualId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline">
                <Pencil className="h-3 w-3" />Editar
              </Link>
            </span>
          </div>
        ))}
      </div>

      {/* Acciones principales */}
      {modo === 'ninguno' && (
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" onClick={abrirAgregar}
            className="h-11 rounded-xl bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
            <Plus className="mr-2 h-4 w-4" />Añadir Miembro
          </Button>
          <Button type="button" variant="outline" onClick={abrirEditar}
            className="h-11 rounded-xl border-brand-blue/60 bg-transparent font-bold text-brand-blue hover:bg-brand-blue/10">
            <Pencil className="mr-2 h-4 w-4" />Editar Miembros
          </Button>
        </div>
      )}

      {/* Modo: Añadir Miembro */}
      {modo === 'agregar' && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white">Nuevos miembros</h3>
            <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-white" onClick={cerrarPanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {nuevasFilas.map(fila => (
            <div key={fila.key} className="grid grid-cols-1 items-end gap-3 border-b border-white/8 pb-3 last:border-0 md:grid-cols-12">
              <div className="space-y-1 md:col-span-4">
                <Label className={LABEL_CLS}>Nueva medida ({unidad || 'unidad'})</Label>
                <Input className={INPUT_CLS} placeholder="Ej: 3/4" value={fila.medida}
                  onChange={e => actualizarFila(fila.key, 'medida', e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className={LABEL_CLS}>Stock Almacén</Label>
                <Input type="number" className={INPUT_CLS} placeholder="0" value={fila.stock_almacen}
                  onFocus={e => e.target.select()} onChange={e => actualizarFila(fila.key, 'stock_almacen', e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className={LABEL_CLS}>Stock Bodega</Label>
                <Input type="number" className={INPUT_CLS} placeholder="0" value={fila.stock_bodega}
                  onFocus={e => e.target.select()} onChange={e => actualizarFila(fila.key, 'stock_bodega', e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label className={LABEL_CLS}>Costo</Label>
                <Input type="number" step="0.01" className={INPUT_CLS} placeholder="Igual al de origen" value={fila.costo}
                  onFocus={e => e.target.select()} onChange={e => actualizarFila(fila.key, 'costo', e.target.value)} />
              </div>
              <div className="flex justify-end md:col-span-1">
                {nuevasFilas.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-brand-red" onClick={() => quitarFila(fila.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={agregarFila}>
            <Plus className="mr-1 h-4 w-4" />Añadir Miembro
          </Button>
          <Button type="button" disabled={guardando} onClick={crearMiembros}
            className="h-11 w-full rounded-xl bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
            {guardando ? 'Creando…' : 'Crear Miembros'}
          </Button>
        </div>
      )}

      {/* Modo: Editar Miembros */}
      {modo === 'editar' && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white">Editar miembros</h3>
            <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-white" onClick={cerrarPanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {filasEdicion.map(fila => {
            const miembro = miembros.find(m => m.id === fila.id)
            return (
              <div key={fila.id} className="grid grid-cols-1 items-end gap-3 border-b border-white/8 pb-3 last:border-0 md:grid-cols-12">
                <div className="space-y-1 md:col-span-4">
                  <Label className={LABEL_CLS}>Medida ({unidad || 'unidad'})</Label>
                  <Input className={INPUT_CLS} value={fila.medida}
                    onChange={e => actualizarEdicion(fila.id, 'medida', e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label className={LABEL_CLS}>Stock Almacén</Label>
                  <Input type="number" className={INPUT_CLS} value={fila.stock_almacen}
                    onFocus={e => e.target.select()} onChange={e => actualizarEdicion(fila.id, 'stock_almacen', e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label className={LABEL_CLS}>Stock Bodega</Label>
                  <Input type="number" className={INPUT_CLS} value={fila.stock_bodega}
                    onFocus={e => e.target.select()} onChange={e => actualizarEdicion(fila.id, 'stock_bodega', e.target.value)} />
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-brand-red"
                    onClick={() => desactivarMiembro(fila.id, miembro?.nombre ?? '')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
          <Button type="button" disabled={guardando} onClick={guardarCambios}
            className="h-11 w-full rounded-xl bg-brand-blue font-bold text-white hover:brightness-110">
            <Save className="mr-2 h-4 w-4" />{guardando ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      )}
    </div>
  )
}