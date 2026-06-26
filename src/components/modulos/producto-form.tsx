'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularPrecioVentaSugerido, calcularMargenCalculado } from '@/lib/precio-utils'
import { esAdmin, type Rol } from '@/lib/permissions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const UNIDADES_BASE = ['Pulgada', 'mm', 'cm', 'Kg', 'g', 'mL', 'L', 'Caja', 'Unidad', 'Galón', 'Metro']
const MEDIDA_REGEX = /^\d+(\/\d+)?$/

interface ProveedorForm {
  id?: string
  proveedor_id: string
  precio_costo: number
  referencia_proveedor: string
  notas: string
}

interface ProductoFormState {
  nombre: string
  descripcion: string
  codigo: string
  categoria_id: string
  marca: string
  ubicacion: string
  medida: string
  unidad_medida_select: string
  precio_venta: number
  margen_deseado: number
  tiene_iva: boolean
  iva_incluido: boolean
  porcentaje_iva: number
  stock_bodega: number
  stock_almacen: number
  stock_minimo: number
  prioridad: number
  imagen_url: string
  vender_por_fraccion: boolean
  medida_venta: string
  cantidad_total_unidad: number
  cantidad_minima_venta: number
  precio_por_unidad_medida: number
  proveedores: ProveedorForm[]
}

interface Categoria {
  id: string
  nombre: string
}

interface Proveedor {
  id: string
  nombre: string
}

export interface ProductoExistente {
  id: string
  precio_costo_base: number  // change 1: added field
  nombre: string
  descripcion: string | null
  codigo: string | null
  categoria_id: string | null
  marca: string | null
  ubicacion: string | null
  precio_venta: number
  tiene_iva: boolean
  iva_incluido: boolean
  porcentaje_iva: number
  stock_bodega: number
  stock_almacen: number
  stock_minimo: number
  prioridad: number
  unidad_medida: string | null
  imagen_url: string | null
  vender_por_fraccion: boolean
  medida_venta: string | null
  cantidad_total_unidad: number | null
  cantidad_minima_venta: number | null
  precio_por_unidad_medida: number | null
  proveedores: {
    id: string
    proveedor_id: string
    precio_costo: number
    referencia_proveedor: string | null
    notas: string | null
  }[]
}

interface ProductoFormProps {
  categorias: Categoria[]
  proveedores: Proveedor[]
  empleadoId: string
  rol: Rol
  producto?: ProductoExistente
  onSuccess?: () => void
  isSheet?: boolean
}

function parseUnidadMedida(value: string | null): { medida: string; unidad: string } {
  if (!value) return { medida: '', unidad: '' }
  const match = value.trim().match(/^(\d+\/\d+|\d+)\s+(.+)$/)
  if (match) return { medida: match[1], unidad: match[2] }
  return { medida: '', unidad: value.trim() }
}

function estadoInicial(producto?: ProductoExistente): ProductoFormState {
  if (!producto) {
    return {
      nombre: '',
      descripcion: '',
      codigo: '',
      categoria_id: 'none',
      marca: '',
      ubicacion: '',
      medida: '',
      unidad_medida_select: '',
      precio_venta: 0,
      margen_deseado: 0,
      tiene_iva: true,
      iva_incluido: false,
      porcentaje_iva: 19,
      stock_bodega: 0,
      stock_almacen: 0,
      stock_minimo: 0,
      prioridad: 3,
      imagen_url: '',
      vender_por_fraccion: false,
      medida_venta: '',
      cantidad_total_unidad: 0,
      cantidad_minima_venta: 0,
      precio_por_unidad_medida: 0,
      proveedores: [{ proveedor_id: '', precio_costo: 0, referencia_proveedor: '', notas: '' }],
    }
  }
  const { medida, unidad } = parseUnidadMedida(producto.unidad_medida)
  return {
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? '',
    codigo: producto.codigo ?? '',
    categoria_id: producto.categoria_id ?? 'none',
    marca: producto.marca ?? '',
    ubicacion: producto.ubicacion ?? '',
    medida,
    unidad_medida_select: unidad,
    precio_venta: producto.precio_venta,
    // change 3: calculate margen automatically
    margen_deseado: (() => {
      const costo = producto.proveedores.length > 0
        ? Math.min(...producto.proveedores.map(p => p.precio_costo))
        : (producto.precio_costo_base ?? 0)
      if (!costo || !producto.precio_venta) return 0
      return calcularMargenCalculado(costo, producto.precio_venta, producto.tiene_iva, producto.iva_incluido, producto.porcentaje_iva) ?? 0
    })(),
    tiene_iva: producto.tiene_iva,
    iva_incluido: producto.iva_incluido,
    porcentaje_iva: producto.porcentaje_iva,
    stock_bodega: producto.stock_bodega,
    stock_almacen: producto.stock_almacen,
    stock_minimo: producto.stock_minimo,
    prioridad: producto.prioridad,
    imagen_url: producto.imagen_url ?? '',
    vender_por_fraccion: producto.vender_por_fraccion,
    medida_venta: producto.medida_venta ?? '',
    cantidad_total_unidad: producto.cantidad_total_unidad ?? 0,
    cantidad_minima_venta: producto.cantidad_minima_venta ?? 0,
    precio_por_unidad_medida: producto.precio_por_unidad_medida ?? 0,
    // change 2: initialize empty provider with precio_costo_base
    proveedores: producto.proveedores.length > 0
      ? producto.proveedores.map((p) => ({
          id: p.id,
          proveedor_id: p.proveedor_id,
          precio_costo: p.precio_costo,
          referencia_proveedor: p.referencia_proveedor ?? '',
          notas: p.notas ?? '',
        }))
      : [{ proveedor_id: '', precio_costo: producto.precio_costo_base ?? 0, referencia_proveedor: '', notas: '' }],
  }
}

export function ProductoForm({ categorias, proveedores, empleadoId, rol, producto, onSuccess, isSheet }: ProductoFormProps) {
  const esEdicion = !!producto
  const supabase = createClient()
  const router = useRouter()
  const [precioSugerido, setPrecioSugerido] = useState<number | null>(null)
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('')
  const [categoriasList, setCategoriasList] = useState<Categoria[]>(categorias)
  const [unidadesList, setUnidadesList] = useState<string[]>(() => {
    const inicial = producto ? parseUnidadMedida(producto.unidad_medida).unidad : ''
    return inicial && !UNIDADES_BASE.includes(inicial) ? [...UNIDADES_BASE, inicial] : UNIDADES_BASE
  })
  const [mostrarNuevaUnidad, setMostrarNuevaUnidad] = useState(false)
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDesactivando, setIsDesactivando] = useState(false)
  const [form, setForm] = useState<ProductoFormState>(estadoInicial(producto))
  const [proveedoresEliminados, setProveedoresEliminados] = useState<string[]>([])
  const [moverCantidad, setMoverCantidad] = useState(0)
  const [moverDireccion, setMoverDireccion] = useState<'bodega_a_almacen' | 'almacen_a_bodega'>('bodega_a_almacen')

  const handleChange = (field: keyof ProductoFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleProveedorChange = (index: number, field: keyof ProveedorForm, value: any) => {
    setForm((prev) => {
      const newProveedores = [...prev.proveedores]
      newProveedores[index] = { ...newProveedores[index], [field]: value }
      return { ...prev, proveedores: newProveedores }
    })
  }

  const addProveedor = () => {
    setForm((prev) => ({
      ...prev,
      proveedores: [...prev.proveedores, { proveedor_id: '', precio_costo: 0, referencia_proveedor: '', notas: '' }],
    }))
  }

  const removeProveedor = (index: number) => {
    const removido = form.proveedores[index]
    if (removido.id) {
      setProveedoresEliminados((prev) => [...prev, removido.id!])
    }
    setForm((prev) => ({
      ...prev,
      proveedores: prev.proveedores.filter((_, i) => i !== index),
    }))
  }

  const handleCalcularPrecio = useCallback(() => {
    if (form.proveedores.length === 0 || !form.margen_deseado) return
    const menorPrecio = Math.min(...form.proveedores.map((p) => p.precio_costo || Infinity))
    if (menorPrecio === Infinity || menorPrecio <= 0) return
    const sugerido = calcularPrecioVentaSugerido(
      menorPrecio,
      form.margen_deseado,
      form.tiene_iva,
      form.iva_incluido,
      form.porcentaje_iva
    )
    setPrecioSugerido(sugerido)
    handleChange('precio_venta', sugerido)
  }, [form])

  const handleCrearCategoria = async () => {
    if (!nuevaCategoriaNombre.trim()) return
    const { data, error } = await supabase
      .from('categorias_producto')
      .insert({ nombre: nuevaCategoriaNombre.trim() })
      .select('id, nombre')
      .single()
    if (error) {
      toast.error('Error al crear categoría: ' + error.message)
      return
    }
    setCategoriasList((prev) => [...prev, data])
    handleChange('categoria_id', data.id)
    setMostrarNuevaCategoria(false)
    setNuevaCategoriaNombre('')
    toast.success('Categoría creada')
  }

  const handleCrearUnidad = () => {
    const nombre = nuevaUnidadNombre.trim()
    if (!nombre) return
    if (!unidadesList.includes(nombre)) {
      setUnidadesList((prev) => [...prev, nombre])
    }
    handleChange('unidad_medida_select', nombre)
    setMostrarNuevaUnidad(false)
    setNuevaUnidadNombre('')
  }

  const handleMoverStock = () => {
    if (moverCantidad <= 0) return
    if (moverDireccion === 'bodega_a_almacen') {
      if (moverCantidad > form.stock_bodega) {
        toast.error('No hay suficiente stock en Bodega para mover esa cantidad')
        return
      }
      setForm((prev) => ({
        ...prev,
        stock_bodega: prev.stock_bodega - moverCantidad,
        stock_almacen: prev.stock_almacen + moverCantidad,
      }))
    } else {
      if (moverCantidad > form.stock_almacen) {
        toast.error('No hay suficiente stock en Almacén para mover esa cantidad')
        return
      }
      setForm((prev) => ({
        ...prev,
        stock_almacen: prev.stock_almacen - moverCantidad,
        stock_bodega: prev.stock_bodega + moverCantidad,
      }))
    }
    setMoverCantidad(0)
    toast.success('Stock movido (recuerda guardar los cambios)')
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio'
    if (form.precio_venta <= 0) newErrors.precio_venta = 'El precio debe ser mayor a 0'
    if (form.medida.trim() && !MEDIDA_REGEX.test(form.medida.trim())) {
      newErrors.medida = 'Solo número entero o fracción (ej: 50 o 1/2)'
    }
    if (form.proveedores.length === 0) newErrors.proveedores = 'Debes agregar al menos un proveedor'
    // change 4: only require proveedor_id if there's more than one provider
    form.proveedores.forEach((p, i) => {
      if (form.proveedores.length > 1 && !p.proveedor_id) newErrors[`proveedor_${i}`] = 'Selecciona un proveedor'
      if (p.precio_costo <= 0) newErrors[`precio_${i}`] = 'El precio debe ser mayor a 0'
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const precioCostoBase = Math.min(...form.proveedores.map((p) => p.precio_costo))
      const margenCalculado = calcularMargenCalculado(
        precioCostoBase,
        form.precio_venta,
        form.tiene_iva,
        form.iva_incluido,
        form.porcentaje_iva
      )
      const unidadMedidaFinal = form.medida.trim()
        ? `${form.medida.trim()} ${form.unidad_medida_select}`.trim()
        : form.unidad_medida_select || null

      const datosProducto = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        codigo: form.codigo || null,
        categoria_id: form.categoria_id === 'none' ? null : form.categoria_id,
        marca: form.marca || null,
        ubicacion: form.ubicacion || null,
        precio_venta: form.precio_venta,
        margen_calculado: margenCalculado,
        tiene_iva: form.tiene_iva,
        iva_incluido: form.iva_incluido,
        porcentaje_iva: form.porcentaje_iva,
        stock_bodega: form.stock_bodega,
        stock_almacen: form.stock_almacen,
        stock_minimo: form.stock_minimo,
        prioridad: form.prioridad,
        unidad_medida: unidadMedidaFinal,
        imagen_url: form.imagen_url || null,
        vender_por_fraccion: form.vender_por_fraccion,
        medida_venta: form.vender_por_fraccion ? form.medida_venta || null : null,
        cantidad_total_unidad: form.vender_por_fraccion ? form.cantidad_total_unidad : null,
        cantidad_minima_venta: form.vender_por_fraccion ? form.cantidad_minima_venta : null,
        precio_por_unidad_medida: form.vender_por_fraccion ? form.precio_por_unidad_medida : null,
      }

      if (esEdicion) {
        const { error: updateError } = await supabase
          .from('productos')
          .update(datosProducto)
          .eq('id', producto.id)
        if (updateError) throw updateError

        if (proveedoresEliminados.length > 0) {
          const { error: delError } = await supabase
            .from('producto_proveedores')
            .delete()
            .in('id', proveedoresEliminados)
          if (delError) throw delError
        }

        const aActualizar = form.proveedores.filter((p): p is ProveedorForm & { id: string } => !!p.id)
        const aInsertar = form.proveedores.filter((p) => !p.id)

        for (const p of aActualizar) {
          const { error: upError } = await supabase
            .from('producto_proveedores')
            .update({
              proveedor_id: p.proveedor_id,
              precio_costo: p.precio_costo,
              referencia_proveedor: p.referencia_proveedor || null,
              notas: p.notas || null,
            })
            .eq('id', p.id)
          if (upError) throw upError
        }

        if (aInsertar.length > 0) {
          const { error: insError } = await supabase.from('producto_proveedores').insert(
            aInsertar.map((p) => ({
              producto_id: producto.id,
              proveedor_id: p.proveedor_id,
              precio_costo: p.precio_costo,
              referencia_proveedor: p.referencia_proveedor || null,
              notas: p.notas || null,
            }))
          )
          if (insError) throw insError
        }

        toast.success('Producto actualizado')
        router.refresh()
        router.push('/dashboard/inventario')
        onSuccess?.()
      } else {
        const { data: nuevoProducto, error: productoError } = await supabase
          .from('productos')
          .insert({ ...datosProducto, activo: true })
          .select('id')
          .single()
        if (productoError) throw productoError

        const proveedoresInsert = form.proveedores.map((p) => ({
          producto_id: nuevoProducto.id,
          proveedor_id: p.proveedor_id,
          precio_costo: p.precio_costo,
          referencia_proveedor: p.referencia_proveedor || null,
          notas: p.notas || null,
        }))
        const { error: proveedoresError } = await supabase
          .from('producto_proveedores')
          .insert(proveedoresInsert)
        if (proveedoresError) throw proveedoresError

        const stockTotal = form.stock_bodega + form.stock_almacen
        if (stockTotal > 0) {
          const { error: movError } = await supabase.from('movimientos_inventario').insert({
            producto_id: nuevoProducto.id,
            tipo: 'entrada',
            cantidad: stockTotal,
            stock_anterior: 0,
            stock_nuevo: stockTotal,
            notas: 'Stock inicial al crear producto',
            empleado_id: empleadoId,
            referencia_tipo: 'producto_inicial',
          })
          if (movError) throw movError
        }

        toast.success('Producto creado')
        router.refresh()
        if (!isSheet) router.push('/dashboard/inventario')
        onSuccess?.()
      }
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDesactivar = async () => {
    if (!producto) return
    const confirmado = window.confirm(`¿Seguro que deseas desactivar "${producto.nombre}"? Ya no aparecerá en el inventario activo.`)
    if (!confirmado) return
    setIsDesactivando(true)
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', producto.id)
    setIsDesactivando(false)
    if (error) {
      toast.error('Error al desactivar: ' + error.message)
      return
    }
    toast.success('Producto desactivado')
    router.push('/dashboard/inventario')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del producto *</Label>
          <Input id="nombre" value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)} />
          {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigo">Código / SKU</Label>
          <Input
            id="codigo"
            value={form.codigo}
            onChange={(e) => handleChange('codigo', e.target.value)}
            placeholder="Ej: PRD-001"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca</Label>
          <Input id="marca" value={form.marca} onChange={(e) => handleChange('marca', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ubicacion">Ubicación</Label>
          <Input
            id="ubicacion"
            value={form.ubicacion}
            onChange={(e) => handleChange('ubicacion', e.target.value)}
            placeholder="Ej: Pasillo 3, Estante B"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="categoria_id">Categoría</Label>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarNuevaCategoria(!mostrarNuevaCategoria)}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva categoría
          </Button>
        </div>
        {mostrarNuevaCategoria ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nombre de la nueva categoría"
              value={nuevaCategoriaNombre}
              onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
            />
            <Button type="button" onClick={handleCrearCategoria} size="sm">Guardar</Button>
            <Button type="button" variant="outline" onClick={() => setMostrarNuevaCategoria(false)} size="sm">Cancelar</Button>
          </div>
        ) : (
          <Select
            items={[
              { value: 'none', label: 'Sin categoría' },
              ...categoriasList.map((cat) => ({ value: cat.id, label: cat.nombre })),
            ]}
            onValueChange={(v) => handleChange('categoria_id', v)}
            value={form.categoria_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categoriasList.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>Medida</Label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input
              value={form.medida}
              onChange={(e) => handleChange('medida', e.target.value)}
              placeholder="Ej: 50 o 1/2"
            />
            {errors.medida && <p className="text-xs text-red-500">{errors.medida}</p>}
          </div>
          <div>
            {mostrarNuevaUnidad ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva unidad"
                  value={nuevaUnidadNombre}
                  onChange={(e) => setNuevaUnidadNombre(e.target.value)}
                />
                <Button type="button" onClick={handleCrearUnidad} size="sm">Guardar</Button>
                <Button type="button" variant="outline" onClick={() => setMostrarNuevaUnidad(false)} size="sm">Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  items={unidadesList.map((u) => ({ value: u, label: u }))}
                  onValueChange={(v) => v && handleChange('unidad_medida_select', v)}
                  value={form.unidad_medida_select}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unidad de medida" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesList.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={() => setMostrarNuevaUnidad(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" value={form.descripcion} onChange={(e) => handleChange('descripcion', e.target.value)} rows={2} />
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="font-medium">Configuración de IVA</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="tiene_iva" checked={form.tiene_iva} onCheckedChange={(v) => handleChange('tiene_iva', v)} />
            <Label htmlFor="tiene_iva">¿Aplica IVA?</Label>
          </div>
          {form.tiene_iva && (
            <div className="flex items-center gap-2">
              <Switch id="iva_incluido" checked={form.iva_incluido} onCheckedChange={(v) => handleChange('iva_incluido', v)} />
              <Label htmlFor="iva_incluido">IVA incluido en el costo</Label>
            </div>
          )}
        </div>
        {form.tiene_iva && (
          <div className="w-32">
            <Label htmlFor="porcentaje_iva">% IVA</Label>
            <Input
              id="porcentaje_iva"
              type="number"
              step="0.01"
value={form.porcentaje_iva || ''}
              onFocus={e => e.target.select()}              onChange={(e) => handleChange('porcentaje_iva', parseFloat(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Proveedores y Precios de Costo *</h3>
          <Button type="button" variant="outline" size="sm" onClick={addProveedor}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar proveedor
          </Button>
        </div>
        {errors.proveedores && <p className="text-xs text-red-500">{errors.proveedores}</p>}
        {form.proveedores.map((proveedor, index) => (
          <div key={proveedor.id ?? index} className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end border-b pb-3 last:border-0">
            <div className="md:col-span-4 space-y-1">
              <Label>Proveedor</Label>
              <Select
                items={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
                onValueChange={(v) => v && handleProveedorChange(index, 'proveedor_id', v)}
                value={proveedor.proveedor_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[`proveedor_${index}`] && <p className="text-xs text-red-500">{errors[`proveedor_${index}`]}</p>}
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Precio de costo</Label>
              <Input
                type="number"
                step="0.01"
value={proveedor.precio_costo || ''}
                onFocus={e => e.target.select()}                onChange={(e) => handleProveedorChange(index, 'precio_costo', parseFloat(e.target.value) || 0)}
              />
              {errors[`precio_${index}`] && <p className="text-xs text-red-500">{errors[`precio_${index}`]}</p>}
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Referencia del proveedor</Label>
              <Input
                value={proveedor.referencia_proveedor}
                onChange={(e) => handleProveedorChange(index, 'referencia_proveedor', e.target.value)}
                placeholder="Código interno del proveedor"
              />
            </div>
            <div className="md:col-span-1 flex justify-end">
              {form.proveedores.length > 1 && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeProveedor(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Margen deseado %</Label>
            <Input
              type="number"
              step="0.1"
              value={form.margen_deseado || ''}
              onChange={(e) => handleChange('margen_deseado', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="precio_venta">Precio de venta *</Label>
            <Input
              id="precio_venta"
              type="number"
              step="0.01"
              value={form.precio_venta || ''}
              onChange={(e) => handleChange('precio_venta', parseFloat(e.target.value) || 0)}
            />
            {errors.precio_venta && <p className="text-xs text-red-500">{errors.precio_venta}</p>}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={handleCalcularPrecio} className="w-full md:w-auto">
          Calcular precio sugerido
        </Button>
        {precioSugerido !== null && (
          <p className="text-xs text-slate-500">Precio sugerido: ${precioSugerido.toLocaleString('es-CO')}</p>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="font-medium">Stock</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="stock_bodega">Stock Bodega</Label>
            <Input
              id="stock_bodega"
              type="number"
value={form.stock_bodega || ''}
              onFocus={e => e.target.select()}              onChange={(e) => handleChange('stock_bodega', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock_almacen">Stock Almacén</Label>
            <Input
              id="stock_almacen"
              type="number"
value={form.stock_almacen || ''}
              onFocus={e => e.target.select()}              onChange={(e) => handleChange('stock_almacen', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock_minimo">Stock mínimo *</Label>
            <Input
              id="stock_minimo"
              type="number"
value={form.stock_minimo || ''}
              onFocus={e => e.target.select()}              onChange={(e) => handleChange('stock_minimo', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {esEdicion && (
          <div className="rounded-md bg-slate-50 p-3 space-y-2">
            <Label className="text-xs text-slate-600">Mover stock entre Bodega y Almacén</Label>
            <div className="flex flex-wrap items-end gap-2">
              <Select
                items={[
                  { value: 'bodega_a_almacen', label: 'Bodega → Almacén' },
                  { value: 'almacen_a_bodega', label: 'Almacén → Bodega' },
                ]}
                onValueChange={(v) => v && setMoverDireccion(v as typeof moverDireccion)}
                value={moverDireccion}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bodega_a_almacen">Bodega → Almacén</SelectItem>
                  <SelectItem value="almacen_a_bodega">Almacén → Bodega</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-28"
value={moverCantidad || ''}
              onFocus={e => e.target.select()}                onChange={(e) => setMoverCantidad(parseInt(e.target.value) || 0)}
                placeholder="Cantidad"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleMoverStock}>
                <ArrowLeftRight className="mr-1 h-4 w-4" />
                Mover
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prioridad">Prioridad (1-5)</Label>
          <Select
            items={[
              { value: '1', label: '1 - Crítico' },
              { value: '2', label: '2 - Alta' },
              { value: '3', label: '3 - Media' },
              { value: '4', label: '4 - Baja' },
              { value: '5', label: '5 - Mínima' },
            ]}
            onValueChange={(v) => v && handleChange('prioridad', parseInt(v))}
            value={String(form.prioridad)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Crítico</SelectItem>
              <SelectItem value="2">2 - Alta</SelectItem>
              <SelectItem value="3">3 - Media</SelectItem>
              <SelectItem value="4">4 - Baja</SelectItem>
              <SelectItem value="5">5 - Mínima</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Venta por fracción</h3>
          <div className="flex items-center gap-2">
            <Switch
              id="vender_por_fraccion"
              checked={form.vender_por_fraccion}
              onCheckedChange={(v) => handleChange('vender_por_fraccion', v)}
            />
            <Label htmlFor="vender_por_fraccion">
              {form.vender_por_fraccion ? 'Habilitado' : 'Deshabilitado'}
            </Label>
          </div>
        </div>

        {form.vender_por_fraccion && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="medida_venta">Unidad de venta</Label>
              <Input
                id="medida_venta"
                value={form.medida_venta}
                onChange={(e) => handleChange('medida_venta', e.target.value)}
                placeholder="Ej: metro, kg, litro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad_total_unidad">Cantidad total por unidad completa</Label>
              <Input
                id="cantidad_total_unidad"
                type="number"
                step="0.01"
value={form.cantidad_total_unidad || ''}
              onFocus={e => e.target.select()}                onChange={(e) => handleChange('cantidad_total_unidad', parseFloat(e.target.value) || 0)}
                placeholder="Ej: 6 (para un tubo de 6 metros)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad_minima_venta">Cantidad mínima de venta</Label>
              <Input
                id="cantidad_minima_venta"
                type="number"
                step="0.01"
value={form.cantidad_minima_venta || ''}
              onFocus={e => e.target.select()}                onChange={(e) => handleChange('cantidad_minima_venta', parseFloat(e.target.value) || 0)}
                placeholder="Ej: 0.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_por_unidad_medida">Precio por unidad de medida</Label>
              <Input
                id="precio_por_unidad_medida"
                type="number"
                step="0.01"
value={form.precio_por_unidad_medida || ''}
              onFocus={e => e.target.select()}                onChange={(e) => handleChange('precio_por_unidad_medida', parseFloat(e.target.value) || 0)}
                placeholder="Ej: 4500 (por metro)"
              />
            </div>
          </div>
        )}

        {form.vender_por_fraccion && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            Al habilitar venta por fracción, este producto solo se podrá vender en fracciones. El precio de venta principal se ignora en las ventas; se usa el precio por unidad de medida.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imagen_url">Imagen (URL)</Label>
        <Input id="imagen_url" value={form.imagen_url} onChange={(e) => handleChange('imagen_url', e.target.value)} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
      </Button>

      {esEdicion && esAdmin(rol) && (
        <button
          type="button"
          disabled={isDesactivando}
          onClick={handleDesactivar}
          className={buttonVariants({ variant: 'outline', className: 'w-full border-red-200 text-red-600 hover:bg-red-50' })}
        >
          {isDesactivando ? 'Desactivando...' : 'Desactivar producto'}
        </button>
      )}
    </form>
  )
}