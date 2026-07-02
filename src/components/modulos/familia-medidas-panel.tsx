'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, Trash2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { parseUnidadMedida, generarSKU, MEDIDA_REGEX, UNIDADES_BASE, INPUT_CLS, LABEL_CLS } from './producto-form'

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

export interface Miembro {
  id: string
  nombre: string
  codigo: string | null
  unidad_medida: string | null
  marca: string | null
  caracteristica: string | null
  stock_almacen: number
  stock_bodega: number
  sinActualizar: boolean
}

interface MarcaFila {
  key: string
  productoId: string | null
  marca: string
}

interface MedidaFila {
  key: string
  medida: string
  unidad: string
  marcas: MarcaFila[]
}

interface CaracteristicaFila {
  key: string
  texto: string
  medidas: MedidaFila[]
}

interface FamiliaMedidasPanelProps {
  empleadoId: string
  productoActualId: string
  nombreBase: string
  producto: ProductoBase
  miembrosIniciales: Miembro[]
}

const MARCA_GENERICA = 'Generica'

function construirArbolDesdeMiembros(miembros: Miembro[]): CaracteristicaFila[] {
  const porCaracteristica = new Map<string, Miembro[]>()
  for (const m of miembros) {
    const car = m.caracteristica ?? ''
    if (!porCaracteristica.has(car)) porCaracteristica.set(car, [])
    porCaracteristica.get(car)!.push(m)
  }

  const resultado: CaracteristicaFila[] = []
  for (const [car, lista] of porCaracteristica) {
    const porMedida = new Map<string, Miembro[]>()
    for (const m of lista) {
      const clave = m.unidad_medida ?? ''
      if (!porMedida.has(clave)) porMedida.set(clave, [])
      porMedida.get(clave)!.push(m)
    }
    const medidas: MedidaFila[] = []
    for (const listaMedida of porMedida.values()) {
      const { medida, unidad } = parseUnidadMedida(listaMedida[0].unidad_medida)
      medidas.push({
        key: crypto.randomUUID(),
        medida,
        unidad,
        marcas: listaMedida.map(m => ({ key: crypto.randomUUID(), productoId: m.id, marca: m.marca ?? '' })),
      })
    }
    resultado.push({ key: crypto.randomUUID(), texto: car, medidas })
  }
  return resultado
}

export function FamiliaMedidasPanel({ empleadoId, productoActualId, nombreBase, producto, miembrosIniciales }: FamiliaMedidasPanelProps) {
  const supabase = createClient()
  const router = useRouter()

  const [miembros, setMiembros] = useState<Miembro[]>(miembrosIniciales)
  const [modoArbol, setModoArbol] = useState(false)
  const [arbol, setArbol] = useState<CaracteristicaFila[]>([])
  const [guardando, setGuardando] = useState(false)

  const abrirArbol = () => {
    setArbol(producto.familia_id ? construirArbolDesdeMiembros(miembros) : [])
    setModoArbol(true)
  }

  const cerrarArbol = () => {
    setModoArbol(false)
    setArbol([])
  }

  // ── Árbol: agregar/quitar/editar ──
  const agregarCaracteristica = () => {
    setArbol(prev => [...prev, { key: crypto.randomUUID(), texto: '', medidas: [] }])
  }
  const quitarCaracteristica = (carKey: string) => {
    setArbol(prev => prev.filter(c => c.key !== carKey))
  }
  const actualizarCaracteristica = (carKey: string, texto: string) => {
    setArbol(prev => prev.map(c => c.key === carKey ? { ...c, texto } : c))
  }

  const agregarMedida = (carKey: string) => {
    setArbol(prev => prev.map(c => c.key === carKey
      ? { ...c, medidas: [...c.medidas, { key: crypto.randomUUID(), medida: '', unidad: '', marcas: [] }] }
      : c))
  }
  const quitarMedida = (carKey: string, medKey: string) => {
    setArbol(prev => prev.map(c => c.key === carKey
      ? { ...c, medidas: c.medidas.filter(m => m.key !== medKey) }
      : c))
  }
  const actualizarMedida = (carKey: string, medKey: string, campo: 'medida' | 'unidad', valor: string) => {
    setArbol(prev => prev.map(c => c.key === carKey
      ? { ...c, medidas: c.medidas.map(m => m.key === medKey ? { ...m, [campo]: valor } : m) }
      : c))
  }

  const agregarMarca = (carKey: string, medKey: string) => {
    setArbol(prev => prev.map(c => c.key === carKey
      ? { ...c, medidas: c.medidas.map(m => m.key === medKey ? { ...m, marcas: [...m.marcas, { key: crypto.randomUUID(), productoId: null, marca: '' }] } : m) }
      : c))
  }
  const quitarMarca = (carKey: string, medKey: string, marKey: string) => {
    setArbol(prev => prev.map(c => c.key === carKey
      ? { ...c, medidas: c.medidas.map(m => m.key === medKey ? { ...m, marcas: m.marcas.filter(ma => ma.key !== marKey) } : m) }
      : c))
  }
  const actualizarMarca = (carKey: string, medKey: string, marKey: string, valor: string) => {
    setArbol(prev => prev.map(c => c.key === carKey
      ? { ...c, medidas: c.medidas.map(m => m.key === medKey ? { ...m, marcas: m.marcas.map(ma => ma.key === marKey ? { ...ma, marca: valor } : ma) } : m) }
      : c))
  }

  const recargarMiembros = async (familiaId: string) => {
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, codigo, unidad_medida, marca, caracteristica, stock_almacen, stock_bodega, producto_proveedores(precio_costo)')
      .eq('familia_id', familiaId)
      .eq('activo', true)
      .order('created_at', { ascending: true })
    const mapeados: Miembro[] = (data ?? []).map((m: any) => {
      const costos = (m.producto_proveedores ?? []).map((p: any) => p.precio_costo)
      const costoMinimo = costos.length > 0 ? Math.min(...costos) : 0
      const sinActualizar = m.stock_almacen === 0 && m.stock_bodega === 0 && costoMinimo === 0
      return {
        id: m.id, nombre: m.nombre, codigo: m.codigo, unidad_medida: m.unidad_medida,
        marca: m.marca, caracteristica: m.caracteristica,
        stock_almacen: m.stock_almacen, stock_bodega: m.stock_bodega, sinActualizar,
      }
    })
    setMiembros(mapeados)
  }

  const guardarArbol = async () => {
    interface Hoja { caracteristica: string; medida: string; unidad: string; marca: string; productoId: string | null }
    const hojas: Hoja[] = []

    if (arbol.length === 0) {
      toast.error('Agrega al menos una característica')
      return
    }

    for (const car of arbol) {
      if (!car.texto.trim()) {
        toast.error('Toda característica debe tener un nombre')
        return
      }
      if (car.medidas.length === 0) {
        toast.error(`"${car.texto}" necesita al menos una medida`)
        return
      }
      for (const med of car.medidas) {
        if (!med.medida.trim() || !MEDIDA_REGEX.test(med.medida.trim())) {
          toast.error(`Medida inválida en "${car.texto}": "${med.medida}" (ej: 50, 3/4, 1-1/4, 3/8x2)`)
          return
        }
        if (!med.unidad) {
          toast.error(`Falta elegir la unidad en "${car.texto}" — ${med.medida}`)
          return
        }
        const marcas = med.marcas.length > 0 ? med.marcas : [{ key: '', productoId: null, marca: '' }]
        for (const mar of marcas) {
          hojas.push({
            caracteristica: car.texto.trim(),
            medida: med.medida.trim(),
            unidad: med.unidad,
            marca: mar.marca.trim() || MARCA_GENERICA,
            productoId: mar.productoId,
          })
        }
      }
    }

    setGuardando(true)
    try {
      const esPrimeraCreacion = !producto.familia_id
      let familiaId = producto.familia_id

      if (esPrimeraCreacion) {
        const { data: nuevaFamilia, error: famError } = await supabase
          .from('producto_familias')
          .insert({ nombre_base: nombreBase })
          .select('id')
          .single()
        if (famError) throw famError
        familiaId = nuevaFamilia.id
      }

      const idsGuardados = new Set<string>()
      let padreAsignado = !esPrimeraCreacion

      for (const hoja of hojas) {
        const nombreFinal = `${nombreBase} — ${hoja.caracteristica}`
        const unidadMedidaFinal = `${hoja.medida} ${hoja.unidad}`.trim()

        if (hoja.productoId) {
          const { error } = await supabase
            .from('productos')
            .update({ nombre: nombreFinal, unidad_medida: unidadMedidaFinal, marca: hoja.marca, caracteristica: hoja.caracteristica })
            .eq('id', hoja.productoId)
          if (error) throw error
          idsGuardados.add(hoja.productoId)
        } else if (!padreAsignado) {
          // Esta hoja ocupa el lugar del producto padre (primera combinación de la familia)
          const { error } = await supabase
            .from('productos')
            .update({ nombre: nombreFinal, unidad_medida: unidadMedidaFinal, marca: hoja.marca, caracteristica: hoja.caracteristica, familia_id: familiaId })
            .eq('id', producto.id)
          if (error) throw error
          idsGuardados.add(producto.id)
          padreAsignado = true
        } else {
          const codigo = generarSKU(nombreFinal, producto.categoriaNombre ?? '', hoja.marca, hoja.medida, hoja.unidad) || null
          const { data: nuevo, error: prodError } = await supabase
            .from('productos')
            .insert({
              nombre: nombreFinal,
              descripcion: producto.descripcion,
              codigo,
              categoria_id: producto.categoria_id,
              marca: hoja.marca,
              caracteristica: hoja.caracteristica,
              ubicacion: producto.ubicacion,
              precio_venta: producto.precio_venta,
              tiene_iva: producto.tiene_iva,
              iva_incluido: producto.iva_incluido,
              porcentaje_iva: producto.porcentaje_iva,
              stock_bodega: 0,
              stock_almacen: 0,
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
              producto_id: nuevo.id,
              proveedor_id: p.proveedor_id,
              precio_costo: 0,
              referencia_proveedor: null,
              notas: null,
            }))
            const { error: provError } = await supabase.from('producto_proveedores').insert(proveedoresInsert)
            if (provError) throw provError
          }
          idsGuardados.add(nuevo.id)
        }
      }

      // Los miembros que ya no aparecen en el árbol quedan desactivados
      if (!esPrimeraCreacion) {
        for (const m of miembros) {
          if (!idsGuardados.has(m.id)) {
            await supabase.from('productos').update({ activo: false }).eq('id', m.id)
          }
        }
      }

      toast.success(esPrimeraCreacion ? `Familia creada: ${hojas.length} producto(s)` : 'Familia actualizada')
      cerrarArbol()
      if (familiaId) await recargarMiembros(familiaId)
      router.refresh()
    } catch (err: any) {
      if (err.code === '23505' && err.message?.includes('idx_productos_unicos_nombre_marca_medida')) {
        toast.error('Ya existe un producto activo con ese mismo Nombre + Marca + Medida.')
      } else {
        toast.error('Error al guardar la familia: ' + err.message)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado — datos compartidos de la familia, no editables aquí */}
      <div className="space-y-3 text-center">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={nombreBase} className="mx-auto h-40 w-40 rounded-2xl border border-white/10 object-cover" />
        ) : (
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border border-white/10 bg-[#1a2430]">
            <Package className="size-14 text-brand-yellow/50" />
          </div>
        )}
        <div>
          <p className="font-display text-xl font-bold text-white">{nombreBase}</p>
          <p className="mt-0.5 text-sm text-steel-300">
            {[producto.marca, producto.categoriaNombre].filter(Boolean).join(' · ') || '—'}
          </p>
          {producto.descripcion && <p className="mt-1 text-xs text-steel-500">{producto.descripcion}</p>}
        </div>
      </div>

      {/* Lista de miembros de la familia */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-white/10 bg-[#1a2430] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-steel-300">
          <span>Característica</span>
          <span>Medida</span>
          <span>Marca</span>
          <span className="w-16 text-right">—</span>
        </div>
        {miembros.map(m => (
          <div key={m.id} className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 border-b border-white/5 px-4 py-3 last:border-0 ${m.id === productoActualId ? 'bg-brand-yellow/5' : ''}`}>
            <span className="text-sm text-white">
              {m.caracteristica || '—'}
              {m.id === productoActualId && <span className="ml-2 text-[10px] font-bold uppercase text-brand-yellow">Actual</span>}
            </span>
            <span className="text-sm text-steel-300">{m.unidad_medida || '—'}</span>
            <span className="text-sm text-steel-300">
              {m.marca || '—'}
              {m.sinActualizar && (
                <span className="ml-2 inline-block rounded-full bg-brand-red/20 px-2 py-0.5 text-[10px] font-bold text-brand-red">
                  Sin actualizar
                </span>
              )}
            </span>
            <span className="w-16 text-right">
              <Link href={`/dashboard/inventario/${m.id}/editar?volver=familia&origen=${productoActualId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline">
                <Pencil className="h-3 w-3" />Editar
              </Link>
            </span>
          </div>
        ))}
      </div>

      {/* Acción principal */}
      {!modoArbol && (
        <Button type="button" onClick={abrirArbol}
          className="h-11 w-full rounded-xl bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
          <Plus className="mr-2 h-4 w-4" />Añadir Miembro
        </Button>
      )}

      {/* Árbol Característica → Medida → Marca */}
      {modoArbol && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white">Familia de productos</h3>
            <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-white" onClick={cerrarArbol}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {arbol.map(car => (
            <div key={car.key} className="space-y-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/5 p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className={LABEL_CLS}>Característica</Label>
                  <Input className={INPUT_CLS} placeholder="Ej: CPVC" value={car.texto}
                    onChange={e => actualizarCaracteristica(car.key, e.target.value)} />
                </div>
                <Button type="button" variant="outline" size="sm"
                  className="border-brand-blue/60 bg-transparent font-semibold text-brand-blue hover:bg-brand-blue/10"
                  onClick={() => agregarMedida(car.key)}>
                  <Plus className="mr-1 h-4 w-4" />Medida
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-brand-red"
                  onClick={() => quitarCaracteristica(car.key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {car.medidas.map(med => (
                <div key={med.key} className="ml-4 space-y-2 rounded-lg border border-brand-blue/30 bg-brand-blue/5 p-3">
                  <div className="flex items-end gap-2">
                    <div className="w-24 space-y-1">
                      <Label className={LABEL_CLS}>Medida</Label>
                      <Input className={INPUT_CLS} placeholder="1/2" value={med.medida}
                        onChange={e => actualizarMedida(car.key, med.key, 'medida', e.target.value)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className={LABEL_CLS}>Unidad</Label>
                      <Select value={med.unidad} onValueChange={v => v && actualizarMedida(car.key, med.key, 'unidad', v)}>
                        <SelectTrigger className="border-white/10 bg-[#1a2430] text-white">
                          <SelectValue placeholder="Selecciona…" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES_BASE.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" size="sm"
                      className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10"
                      onClick={() => agregarMarca(car.key, med.key)}>
                      <Plus className="mr-1 h-4 w-4" />Marca
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-brand-red"
                      onClick={() => quitarMedida(car.key, med.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {med.marcas.map(mar => (
                    <div key={mar.key} className="ml-4 flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className={LABEL_CLS}>Marca</Label>
                        <Input className={INPUT_CLS} placeholder="Generica" value={mar.marca}
                          onChange={e => actualizarMarca(car.key, med.key, mar.key, e.target.value)} />
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-brand-red"
                        onClick={() => quitarMarca(car.key, med.key, mar.key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <Button type="button" variant="outline" size="sm"
            className="border-white/20 bg-transparent font-semibold text-white hover:bg-white/10"
            onClick={agregarCaracteristica}>
            <Plus className="mr-1 h-4 w-4" />Característica
          </Button>

          <Button type="button" disabled={guardando} onClick={guardarArbol}
            className="h-11 w-full rounded-xl bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
            {guardando ? 'Creando…' : 'Crear Familia De Producto'}
          </Button>
        </div>
      )}
    </div>
  )
}