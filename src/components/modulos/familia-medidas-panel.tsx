'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, Trash2, Pencil, X, Settings2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { parseUnidadMedida, generarSKU, INPUT_CLS, LABEL_CLS } from './producto-form'
import { TEMAS_AYUDA } from '@/lib/temas-ayuda'

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
  activo: boolean
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
  unidades: string[]
  categorias: { id: string; nombre: string }[]
  proveedoresDisponibles: { id: string; nombre: string }[]
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

export function FamiliaMedidasPanel({ empleadoId, productoActualId, nombreBase, producto, miembrosIniciales, unidades, categorias, proveedoresDisponibles }: FamiliaMedidasPanelProps) {
  const supabase = createClient()
  const router = useRouter()

  const [miembros, setMiembros] = useState<Miembro[]>(miembrosIniciales)
  const [modoArbol, setModoArbol] = useState(false)
  const [arbol, setArbol] = useState<CaracteristicaFila[]>([])
  const [guardando, setGuardando] = useState(false)
  const [medidasConError, setMedidasConError] = useState<Set<string>>(new Set())

  // ── "Editar Datos": prellenar datos compartidos (no de medida) en varios productos a la vez ──
  const [modoEditarDatos, setModoEditarDatos] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [datosCompartidos, setDatosCompartidos] = useState({
    categoria_id: '', descripcion: '', imagen_url: '',
    ivaIncluido: 'sin_cambio' as 'sin_cambio' | 'si' | 'no',
    venderPorFraccion: 'sin_cambio' as 'sin_cambio' | 'si' | 'no',
    medida_venta: '', cantidad_total_unidad: '', cantidad_minima_venta: '', precio_por_unidad_medida: '',
  })
  const [proveedoresAAsignar, setProveedoresAAsignar] = useState<{ key: string; proveedor_id: string; codigo: string }[]>([])
  const [aplicandoDatos, setAplicandoDatos] = useState(false)
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const temaAyuda = TEMAS_AYUDA.find(t => t.id === 'familia-anadir-miembro')

  const abrirEditarDatos = () => {
    setSeleccionados(new Set())
    setDatosCompartidos({
      categoria_id: '', descripcion: '', imagen_url: '',
      ivaIncluido: 'sin_cambio', venderPorFraccion: 'sin_cambio',
      medida_venta: '', cantidad_total_unidad: '', cantidad_minima_venta: '', precio_por_unidad_medida: '',
    })
    setProveedoresAAsignar([])
    setModoEditarDatos(true)
    setModoArbol(false)
  }
  const cerrarEditarDatos = () => setModoEditarDatos(false)

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const seleccionarTodos = () => setSeleccionados(new Set(miembros.map(m => m.id)))
  const deseleccionarTodos = () => setSeleccionados(new Set())

  const agregarProveedorAAsignar = () => {
    setProveedoresAAsignar(prev => [...prev, { key: crypto.randomUUID(), proveedor_id: '', codigo: '' }])
  }
  const quitarProveedorAAsignar = (key: string) => {
    setProveedoresAAsignar(prev => prev.filter(p => p.key !== key))
  }
  const actualizarProveedorAAsignar = (key: string, campo: 'proveedor_id' | 'codigo', valor: string) => {
    setProveedoresAAsignar(prev => prev.map(p => p.key === key ? { ...p, [campo]: valor } : p))
  }

  const aplicarDatosCompartidos = async () => {
    if (seleccionados.size === 0) {
      toast.error('Selecciona al menos un producto de la lista')
      return
    }

    const payload: Record<string, any> = {}
    if (datosCompartidos.categoria_id) payload.categoria_id = datosCompartidos.categoria_id
    if (datosCompartidos.descripcion.trim()) payload.descripcion = datosCompartidos.descripcion.trim()
    if (datosCompartidos.imagen_url.trim()) payload.imagen_url = datosCompartidos.imagen_url.trim()
    if (datosCompartidos.ivaIncluido !== 'sin_cambio') payload.iva_incluido = datosCompartidos.ivaIncluido === 'si'
    if (datosCompartidos.venderPorFraccion !== 'sin_cambio') {
      payload.vender_por_fraccion = datosCompartidos.venderPorFraccion === 'si'
      if (datosCompartidos.venderPorFraccion === 'si') {
        if (datosCompartidos.medida_venta.trim()) payload.medida_venta = datosCompartidos.medida_venta.trim()
        if (datosCompartidos.cantidad_total_unidad) payload.cantidad_total_unidad = Number(datosCompartidos.cantidad_total_unidad)
        if (datosCompartidos.cantidad_minima_venta) payload.cantidad_minima_venta = Number(datosCompartidos.cantidad_minima_venta)
        if (datosCompartidos.precio_por_unidad_medida) payload.precio_por_unidad_medida = Number(datosCompartidos.precio_por_unidad_medida)
      }
    }

    const proveedoresValidos = proveedoresAAsignar.filter(p => p.proveedor_id)

    if (Object.keys(payload).length === 0 && proveedoresValidos.length === 0) {
      toast.error('Llena al menos un campo, o agrega un proveedor, para poder aplicar algo')
      return
    }

    setAplicandoDatos(true)
    try {
      const ids = Array.from(seleccionados)

      if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from('productos').update(payload as any).in('id', ids)
        if (error) throw error
      }

      if (proveedoresValidos.length > 0) {
        for (const productoId of ids) {
          const { data: existentes } = await supabase
            .from('producto_proveedores')
            .select('proveedor_id')
            .eq('producto_id', productoId)
          const yaVinculados = new Set((existentes ?? []).map(e => e.proveedor_id))
          const nuevos = proveedoresValidos
            .filter(p => !yaVinculados.has(p.proveedor_id))
            .map(p => ({
              producto_id: productoId,
              proveedor_id: p.proveedor_id,
              precio_costo: 0,
              referencia_proveedor: p.codigo.trim() || null,
              notas: null,
            }))
          if (nuevos.length > 0) {
            const { error } = await supabase.from('producto_proveedores').insert(nuevos)
            if (error) throw error
          }
        }
      }

      toast.success(`Datos aplicados a ${ids.length} producto(s). Esto no los activa — sigue siendo necesario "Editar producto" para eso.`)
      cerrarEditarDatos()
      router.refresh()
      if (producto.familia_id) await recargarMiembros(producto.familia_id)
    } catch (err: any) {
      toast.error('Error al aplicar los datos: ' + err.message)
    } finally {
      setAplicandoDatos(false)
    }
  }

  const abrirArbol = () => {
    setArbol(producto.familia_id ? construirArbolDesdeMiembros(miembros) : [])
    setModoArbol(true)
    setModoEditarDatos(false)
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
    setMedidasConError(prev => {
      if (!prev.has(medKey)) return prev
      const next = new Set(prev)
      next.delete(medKey)
      return next
    })
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
      .select('id, nombre, codigo, unidad_medida, marca, caracteristica, activo, stock_almacen, stock_bodega, producto_proveedores(precio_costo)')
      .eq('familia_id', familiaId)
      .order('created_at', { ascending: true })
    const mapeados: Miembro[] = (data ?? []).map((m: any) => {
      const costos = (m.producto_proveedores ?? []).map((p: any) => p.precio_costo)
      const costoMinimo = costos.length > 0 ? Math.min(...costos) : 0
      const sinActualizar = m.stock_almacen === 0 && m.stock_bodega === 0 && costoMinimo === 0
      return {
        id: m.id, nombre: m.nombre, codigo: m.codigo, unidad_medida: m.unidad_medida,
        marca: m.marca, caracteristica: m.caracteristica, activo: m.activo,
        stock_almacen: m.stock_almacen, stock_bodega: m.stock_bodega, sinActualizar,
      }
    })
    setMiembros(mapeados)
  }

  const guardarArbol = async () => {
    interface Hoja { caracteristica: string; medida: string; unidad: string; marca: string; productoId: string | null; medKeyOrigen: string }
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
        const medidaTexto = med.medida.trim()
        if (!medidaTexto) {
          toast.error(`Falta la medida en "${car.texto}"`)
          return
        }
        if (!med.unidad) {
          toast.error(`Falta elegir la unidad en "${car.texto}" — ${medidaTexto}`)
          return
        }
        // Varias medidas separadas por ";" (ej: "Corto;Mediano;Grande") generan un producto por cada una.
        const subMedidas = medidaTexto.split(';').map(s => s.trim()).filter(Boolean)
        subMedidas.forEach((subMedida, subIdx) => {
          const marcas = med.marcas.length > 0 ? med.marcas : [{ key: '', productoId: null, marca: '' }]
          for (const mar of marcas) {
            hojas.push({
              caracteristica: car.texto.trim(),
              medida: subMedida,
              unidad: med.unidad,
              marca: mar.marca.trim() || MARCA_GENERICA,
              // Si hay varias medidas en el mismo campo, solo la primera actualiza el producto ya existente;
              // las demás siempre crean productos nuevos (para no pisar el mismo producto dos veces).
              productoId: subIdx === 0 ? mar.productoId : null,
              medKeyOrigen: med.key,
            })
          }
        })
      }
    }

    // Antes de guardar nada: revisa que no haya la misma combinación Característica+Medida+Marca repetida
    // (ya sea por escribir la misma medida dos veces en el mismo campo, o en dos campos distintos).
    const gruposPorCombinacion = new Map<string, Hoja[]>()
    for (const hoja of hojas) {
      const clave = `${hoja.caracteristica}|||${hoja.medida}|||${hoja.marca}`
      if (!gruposPorCombinacion.has(clave)) gruposPorCombinacion.set(clave, [])
      gruposPorCombinacion.get(clave)!.push(hoja)
    }
    const duplicados = Array.from(gruposPorCombinacion.values()).filter(grupo => grupo.length > 1)
    if (duplicados.length > 0) {
      const medKeysConError = new Set<string>()
      for (const grupo of duplicados) {
        for (const hoja of grupo) medKeysConError.add(hoja.medKeyOrigen)
      }
      setMedidasConError(medKeysConError)
      const primero = duplicados[0][0]
      toast.error(`Medida repetida en "${primero.caracteristica}": "${primero.medida}" con marca "${primero.marca}" aparece más de una vez. Corrígela en el recuadro marcado en rojo.`)
      return
    }
    setMedidasConError(new Set())

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
              activo: false,
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
      } else if (err.code === '23505' && err.message?.includes('productos_codigo_key')) {
        toast.error('El código generado ya existe en otro producto (activo o inactivo). Puede quedar algún producto a medio crear de este intento — revisa la lista de miembros antes de reintentar.')
      } else {
        toast.error('Error al guardar la familia: ' + err.message)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Botón de ayuda */}
      <div className="flex justify-end">
        <button type="button" onClick={() => setMostrarAyuda(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline">
          <HelpCircle className="h-3.5 w-3.5" />
          {mostrarAyuda ? 'Ocultar instrucciones' : '¿Cómo funciona "Añadir Miembro"?'}
        </button>
      </div>
      {mostrarAyuda && temaAyuda && (
        <div className="space-y-4 rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-4">
          <h3 className="font-display font-bold text-white">{temaAyuda.titulo}</h3>
          {temaAyuda.secciones.map((sec, i) => (
            <div key={i} className="space-y-2">
              {sec.subtitulo && <p className="text-sm font-semibold text-brand-blue">{sec.subtitulo}</p>}
              <ol className="space-y-1.5">
                {sec.pasos.map((paso, j) => (
                  <li key={j} className="flex gap-2 text-xs text-steel-300">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                      {j + 1}
                    </span>
                    <span>{paso}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
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
              {!m.activo && <span className="ml-2 rounded-full bg-steel-700 px-2 py-0.5 text-[10px] font-bold uppercase text-steel-300">Inactivo</span>}
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
      {!modoArbol && !modoEditarDatos && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="button" onClick={abrirArbol}
            className="h-11 rounded-xl bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
            <Plus className="mr-2 h-4 w-4" />Añadir Miembro
          </Button>
          <Button type="button" variant="outline" onClick={abrirEditarDatos}
            className="h-11 rounded-xl border-brand-blue/60 bg-transparent font-bold text-brand-blue hover:bg-brand-blue/10">
            <Settings2 className="mr-2 h-4 w-4" />Editar Datos
          </Button>
        </div>
      )}

      {/* Editar Datos: prellena datos compartidos (categoría, descripción, imagen, IVA, fracción, proveedores)
          en varios productos seleccionados a la vez. No los activa — eso solo lo hace "Editar producto". */}
      {modoEditarDatos && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-white">Editar Datos</h3>
              <p className="text-xs text-steel-500">Selecciona una o más ramas y prellena los datos que compartan. Todo es opcional — deja vacío lo que no aplique.</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-white" onClick={cerrarEditarDatos}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de ramas con checkbox */}
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#1a2430] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ramas ({seleccionados.size} de {miembros.length} seleccionadas)</span>
              <div className="flex gap-3 text-[11px] font-semibold">
                <button type="button" className="text-brand-blue hover:underline" onClick={seleccionarTodos}>Todas</button>
                <button type="button" className="text-steel-300 hover:underline" onClick={deseleccionarTodos}>Ninguna</button>
              </div>
            </div>
            {miembros.map(m => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-2 last:border-0 hover:bg-white/5">
                <input type="checkbox" checked={seleccionados.has(m.id)} onChange={() => toggleSeleccion(m.id)}
                  className="size-4 rounded border-white/20 accent-brand-yellow" />
                <span className="flex-1 text-sm text-white">{m.caracteristica || '—'}</span>
                <span className="text-sm text-steel-300">{m.unidad_medida || '—'}</span>
                <span className="text-sm text-steel-300">{m.marca || '—'}</span>
              </label>
            ))}
          </div>

          {/* Datos compartidos */}
          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="space-y-1">
              <Label className={LABEL_CLS}>Categoría</Label>
<Select value={datosCompartidos.categoria_id} onValueChange={v => v && setDatosCompartidos(prev => ({ ...prev, categoria_id: v }))}>                <SelectTrigger className="w-full border-white/10 bg-[#1a2430] text-white">
                  <SelectValue placeholder="Sin cambiar" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className={LABEL_CLS}>Descripción</Label>
              <Textarea value={datosCompartidos.descripcion} onChange={e => setDatosCompartidos(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Sin cambiar" className={`${INPUT_CLS} min-h-20`} />
            </div>

            <div className="space-y-1">
              <Label className={LABEL_CLS}>URL Imagen</Label>
              <Input value={datosCompartidos.imagen_url} onChange={e => setDatosCompartidos(prev => ({ ...prev, imagen_url: e.target.value }))}
                placeholder="Sin cambiar" className={INPUT_CLS} />
            </div>

            <div className="space-y-1">
              <Label className={LABEL_CLS}>IVA incluido en el precio</Label>
<Select value={datosCompartidos.ivaIncluido} onValueChange={v => v && setDatosCompartidos(prev => ({ ...prev, ivaIncluido: v as any }))}>                <SelectTrigger className="w-full border-white/10 bg-[#1a2430] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_cambio">No cambiar</SelectItem>
                  <SelectItem value="si">Activar</SelectItem>
                  <SelectItem value="no">Desactivar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className={LABEL_CLS}>Vender por fracción</Label>
<Select value={datosCompartidos.venderPorFraccion} onValueChange={v => v && setDatosCompartidos(prev => ({ ...prev, venderPorFraccion: v as any }))}>                <SelectTrigger className="w-full border-white/10 bg-[#1a2430] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_cambio">No cambiar</SelectItem>
                  <SelectItem value="si">Activar</SelectItem>
                  <SelectItem value="no">Desactivar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datosCompartidos.venderPorFraccion === 'si' && (
              <div className="ml-4 grid grid-cols-2 gap-3 rounded-lg border border-brand-blue/30 bg-brand-blue/5 p-3">
                <div className="col-span-2 space-y-1">
                  <Label className={LABEL_CLS}>Medida de venta (ej: metro, kg)</Label>
                  <Input value={datosCompartidos.medida_venta} onChange={e => setDatosCompartidos(prev => ({ ...prev, medida_venta: e.target.value }))} className={INPUT_CLS} />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Cantidad total por unidad</Label>
                  <Input type="number" value={datosCompartidos.cantidad_total_unidad} onChange={e => setDatosCompartidos(prev => ({ ...prev, cantidad_total_unidad: e.target.value }))} className={INPUT_CLS} />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Cantidad mínima de venta</Label>
                  <Input type="number" value={datosCompartidos.cantidad_minima_venta} onChange={e => setDatosCompartidos(prev => ({ ...prev, cantidad_minima_venta: e.target.value }))} className={INPUT_CLS} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className={LABEL_CLS}>Precio por unidad de medida</Label>
                  <Input type="number" value={datosCompartidos.precio_por_unidad_medida} onChange={e => setDatosCompartidos(prev => ({ ...prev, precio_por_unidad_medida: e.target.value }))} className={INPUT_CLS} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className={LABEL_CLS}>Proveedores asociados</Label>
              {proveedoresAAsignar.map(p => (
                <div key={p.key} className="flex items-end gap-2 rounded-lg border border-white/10 bg-[#1a2430] p-2">
                  <div className="flex-1 space-y-1">
<Select value={p.proveedor_id} onValueChange={v => v && actualizarProveedorAAsignar(p.key, 'proveedor_id', v)}>                      <SelectTrigger className="w-full border-white/10 bg-[#111820] text-white">
                        <SelectValue placeholder="Selecciona proveedor…" />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedoresDisponibles.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input value={p.codigo} onChange={e => actualizarProveedorAAsignar(p.key, 'codigo', e.target.value)}
                      placeholder="Código del proveedor (opcional)" className={INPUT_CLS} />
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" className="text-steel-300 hover:text-brand-red"
                    onClick={() => quitarProveedorAAsignar(p.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm"
                className="border-brand-blue/60 bg-transparent font-semibold text-brand-blue hover:bg-brand-blue/10"
                onClick={agregarProveedorAAsignar}>
                <Plus className="mr-1 h-4 w-4" />Proveedor
              </Button>
              <p className="text-[11px] text-steel-500">El costo de estos proveedores queda en $0 — ajústalo luego desde "Editar producto".</p>
            </div>
          </div>

          <Button type="button" disabled={aplicandoDatos} onClick={aplicarDatosCompartidos}
            className="h-11 w-full rounded-xl bg-brand-blue font-bold text-white hover:brightness-110">
            {aplicandoDatos ? 'Aplicando…' : `Aplicar a ${seleccionados.size} seleccionado(s)`}
          </Button>
        </div>
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
                <div key={med.key} className={`ml-4 space-y-3 rounded-lg border p-3 ${medidasConError.has(med.key) ? 'border-brand-red bg-brand-red/10 ring-2 ring-brand-red/40' : 'border-brand-blue/30 bg-brand-blue/5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-full space-y-1">
                      <Label className={LABEL_CLS}>Medida</Label>
                      <Input className={`${INPUT_CLS} h-11 w-full text-base`} placeholder="Ej: 3/4, 2.6, Corto;Mediano;Grande" value={med.medida}
                        onChange={e => actualizarMedida(car.key, med.key, 'medida', e.target.value)} />
                      <p className="text-[11px] text-steel-500">Separa varias con &quot;;&quot; para crear un producto por cada una.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" className="mt-5 shrink-0 text-steel-300 hover:text-brand-red"
                      onClick={() => quitarMedida(car.key, med.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-full space-y-1">
                    <Label className={LABEL_CLS}>Unidad</Label>
                    <Select value={med.unidad} onValueChange={v => v && actualizarMedida(car.key, med.key, 'unidad', v)}>
                      <SelectTrigger className="h-11 w-full border-white/10 bg-[#1a2430] text-white">
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    className="w-full border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 sm:w-auto"
                    onClick={() => agregarMarca(car.key, med.key)}>
                    <Plus className="mr-1 h-4 w-4" />Marca
                  </Button>

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