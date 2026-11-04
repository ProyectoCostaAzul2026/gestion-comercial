'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ListOrdered, Pencil, Plus, Scale, Settings2, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ordenarPorMedida } from '@/lib/escala-precios'
import { formatearPeso, pesoDeCantidad } from '@/lib/peso'
import { EscalaPrecios } from './escala-precios'
import { CalculadoraPesoUnitario } from './peso-por-unidad'
import { INPUT_CLS, LABEL_CLS } from './producto-form'

// Grupo de medidas: los productos de una misma familia, característica y marca que solo cambian de medida. Se ven
// ordenados por tamaño (o en el orden manual guardado), se editan en bloque y, si es administrador, tienen escala de
// precios.

export interface MiembroGrupo {
  id: string
  nombre: string
  codigo: string | null
  unidad_medida: string | null
  marca: string | null
  activo: boolean
  stock_actual: number
  stock_minimo: number
  ubicacion: string | null
  precio_venta: number
  precio_costo_base: number | null
  tiene_iva: boolean
  iva_incluido: boolean
  porcentaje_iva: number
  orden_medida: number | null
  /** Peso de una unidad en gramos (null: no se cuenta por peso) */
  peso_unitario_g: number | null
}

interface Props {
  productoActualId: string
  miembrosIniciales: MiembroGrupo[]
  esAdmin: boolean
  /** Margen por defecto del negocio, en porcentaje */
  margenDefault: number
  categorias: { id: string; nombre: string }[]
  proveedoresDisponibles: { id: string; nombre: string }[]
}

const OPCIONES_CAMBIO = [
  { value: 'sin_cambio', label: 'No cambiar' },
  { value: 'si', label: 'Activar' },
  { value: 'no', label: 'Desactivar' },
]

const DATOS_VACIOS = {
  categoria_id: '', descripcion: '', imagen_url: '', ubicacion: '', stock_minimo: '',
  ivaIncluido: 'sin_cambio' as 'sin_cambio' | 'si' | 'no',
}

const pesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`
const mensajeError = (err: unknown) => (err as { message?: string } | null)?.message ?? String(err)

export function GrupoMedidasPanel({
  productoActualId, miembrosIniciales, esAdmin, margenDefault, categorias, proveedoresDisponibles,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [miembros, setMiembros] = useState<MiembroGrupo[]>(miembrosIniciales)
  const ordenados = useMemo(() => ordenarPorMedida(miembros), [miembros])
  const tieneOrdenManual = miembros.some(m => m.orden_medida !== null)

  // ── Orden manual ──
  const [ordenEdicion, setOrdenEdicion] = useState<string[] | null>(null)
  const [guardandoOrden, setGuardandoOrden] = useState(false)
  const porId = useMemo(() => new Map(miembros.map(m => [m.id, m])), [miembros])
  const lista = ordenEdicion ? ordenEdicion.map(id => porId.get(id)!).filter(Boolean) : ordenados

  const mover = (indice: number, paso: -1 | 1) => {
    setOrdenEdicion(prev => {
      if (!prev) return prev
      const destino = indice + paso
      if (destino < 0 || destino >= prev.length) return prev
      const siguiente = [...prev]
      ;[siguiente[indice], siguiente[destino]] = [siguiente[destino], siguiente[indice]]
      return siguiente
    })
  }

  const guardarOrden = async (restablecer: boolean) => {
    const ids = restablecer ? miembros.map(m => m.id) : ordenEdicion
    if (!ids || ids.length === 0) return
    setGuardandoOrden(true)
    try {
      const { error } = await supabase.rpc('ordenar_medidas', { p_producto_ids: ids, p_restablecer: restablecer })
      if (error) throw error
      setMiembros(prev => prev.map(m => ({ ...m, orden_medida: restablecer ? null : ids.indexOf(m.id) + 1 })))
      setOrdenEdicion(null)
      toast.success(restablecer ? 'Las medidas vuelven al orden automático por tamaño' : 'Orden guardado')
    } catch (err) {
      toast.error('Error al guardar el orden: ' + mensajeError(err))
    } finally {
      setGuardandoOrden(false)
    }
  }

  // ── Editar datos en bloque ──
  const [editando, setEditando] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [datos, setDatos] = useState(DATOS_VACIOS)
  const [proveedoresAAsignar, setProveedoresAAsignar] = useState<{ key: string; proveedor_id: string; codigo: string }[]>([])
  const [aplicando, setAplicando] = useState(false)

  const abrirEdicion = () => {
    setSeleccionados(new Set(miembros.map(m => m.id)))
    setDatos(DATOS_VACIOS)
    setProveedoresAAsignar([])
    setEditando(true)
    setEditandoPesos(false)
    setOrdenEdicion(null)
  }

  const alternarSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id)
      return siguiente
    })
  }

  const aplicarDatos = async () => {
    if (seleccionados.size === 0) { toast.error('Selecciona al menos una medida'); return }

    const payload: {
      categoria_id?: string; descripcion?: string; imagen_url?: string; ubicacion?: string
      stock_minimo?: number; iva_incluido?: boolean
    } = {}
    if (datos.categoria_id) payload.categoria_id = datos.categoria_id
    if (datos.descripcion.trim()) payload.descripcion = datos.descripcion.trim()
    if (datos.imagen_url.trim()) payload.imagen_url = datos.imagen_url.trim()
    if (datos.ubicacion.trim()) payload.ubicacion = datos.ubicacion.trim()
    if (datos.stock_minimo.trim()) {
      const minimo = Number(datos.stock_minimo)
      if (!Number.isInteger(minimo) || minimo < 0) { toast.error('El stock mínimo debe ser un número entero de 0 o más'); return }
      payload.stock_minimo = minimo
    }
    if (datos.ivaIncluido !== 'sin_cambio') payload.iva_incluido = datos.ivaIncluido === 'si'
    const proveedoresValidos = proveedoresAAsignar.filter(p => p.proveedor_id)

    if (Object.keys(payload).length === 0 && proveedoresValidos.length === 0) {
      toast.error('Llena al menos un campo, o agrega un proveedor, para poder aplicar algo')
      return
    }

    setAplicando(true)
    try {
      const ids = Array.from(seleccionados)
      if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from('productos').update(payload).in('id', ids)
        if (error) throw error
      }
      if (proveedoresValidos.length > 0) {
        // Los vínculos producto-proveedor que ya existen se dejan como están; solo se crean los que faltan
        const vinculos = ids.flatMap(productoId => proveedoresValidos.map(p => ({
          producto_id: productoId,
          proveedor_id: p.proveedor_id,
          precio_costo: 0,
          referencia_proveedor: p.codigo.trim() || null,
          notas: null,
        })))
        const { error } = await supabase
          .from('producto_proveedores')
          .upsert(vinculos, { onConflict: 'producto_id,proveedor_id', ignoreDuplicates: true })
        if (error) throw error
      }
      setMiembros(prev => prev.map(m => seleccionados.has(m.id) ? {
        ...m,
        ...(payload.ubicacion !== undefined ? { ubicacion: payload.ubicacion } : {}),
        ...(payload.stock_minimo !== undefined ? { stock_minimo: payload.stock_minimo } : {}),
        ...(payload.iva_incluido !== undefined ? { iva_incluido: payload.iva_incluido } : {}),
      } : m))
      toast.success(`Datos aplicados a ${ids.length} medida(s)`)
      setEditando(false)
      router.refresh()
    } catch (err) {
      toast.error('Error al aplicar los datos: ' + mensajeError(err))
    } finally {
      setAplicando(false)
    }
  }

  // ── Pesos por unidad: el peso de una unidad de cada medida, en una sola pantalla ──
  const [editandoPesos, setEditandoPesos] = useState(false)
  const [pesosEdicion, setPesosEdicion] = useState<Record<string, string>>({})
  const [calculandoPara, setCalculandoPara] = useState<string | null>(null)
  const [guardandoPesos, setGuardandoPesos] = useState(false)

  const abrirPesos = () => {
    setPesosEdicion(Object.fromEntries(miembros.map(m => [m.id, m.peso_unitario_g != null ? String(m.peso_unitario_g) : ''])))
    setCalculandoPara(null)
    setEditandoPesos(true)
    setEditando(false)
    setOrdenEdicion(null)
  }

  /** null: sin peso (campo vacío); undefined: valor no válido */
  const leerPeso = (texto: string | undefined): number | null | undefined => {
    const t = (texto ?? '').trim()
    if (t === '') return null
    const n = Number(t.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  const cambiosPeso = ordenados
    .map(m => ({ m, peso: leerPeso(pesosEdicion[m.id]) }))
    .filter(({ m, peso }) => peso !== undefined && peso !== m.peso_unitario_g)
  const pesosInvalidos = editandoPesos ? ordenados.filter(m => leerPeso(pesosEdicion[m.id]) === undefined).length : 0

  const guardarPesos = async () => {
    if (pesosInvalidos > 0 || cambiosPeso.length === 0) return
    setGuardandoPesos(true)
    try {
      const p_pesos = cambiosPeso.map(({ m, peso }) => ({ producto_id: m.id, peso_unitario_g: peso ?? null }))
      const { error } = await supabase.rpc('guardar_pesos_unitarios', { p_pesos })
      if (error) throw error
      const nuevos = new Map(p_pesos.map(x => [x.producto_id, x.peso_unitario_g]))
      setMiembros(prev => prev.map(m => nuevos.has(m.id) ? { ...m, peso_unitario_g: nuevos.get(m.id) ?? null } : m))
      setEditandoPesos(false)
      toast.success(`Peso por unidad guardado en ${p_pesos.length} medida(s)`)
      router.refresh()
    } catch (err) {
      toast.error('Error al guardar los pesos: ' + mensajeError(err))
    } finally {
      setGuardandoPesos(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-steel-500">
        Reúne los productos de la misma familia, característica y marca que solo cambian de medida.
        {tieneOrdenManual ? ' Están en el orden manual guardado.' : ' Están ordenados por tamaño.'}
      </p>

      {/* Lista de medidas */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 bg-[#1a2430] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-steel-300">
          <span>Medida ({miembros.length})</span>
          <span className="w-14 text-right">Stock</span>
          <span className="w-20 text-right">{ordenEdicion ? 'Mover' : 'Precio'}</span>
        </div>
        {lista.map((m, i) => (
          <div key={m.id}
            className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0 ${m.id === productoActualId ? 'bg-brand-yellow/5' : ''}`}>
            <div className="min-w-0">
              <Link href={`/dashboard/inventario/${m.id}`} className="text-sm font-medium text-white hover:underline">
                {m.unidad_medida || '—'}
              </Link>
              {m.id === productoActualId && <span className="ml-2 text-[10px] font-bold uppercase text-brand-yellow">Actual</span>}
              {!m.activo && <span className="ml-2 rounded-full bg-steel-700 px-2 py-0.5 text-[10px] font-bold uppercase text-steel-300">Inactivo</span>}
              <p className="truncate font-mono text-[10px] text-steel-500">
                {m.codigo ?? '—'}
                {m.peso_unitario_g != null && <span className="font-sans"> · {formatearPeso(m.peso_unitario_g)} c/u</span>}
              </p>
            </div>
            <span className={`w-14 text-right font-display text-sm font-bold ${m.stock_actual === 0 ? 'text-brand-red' : 'text-brand-yellow'}`}>
              {m.stock_actual}
            </span>
            {ordenEdicion ? (
              <span className="flex w-20 justify-end gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Subir ${m.unidad_medida ?? ''}`}
                  disabled={i === 0} onClick={() => mover(i, -1)} className="text-steel-300 hover:text-white">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bajar ${m.unidad_medida ?? ''}`}
                  disabled={i === lista.length - 1} onClick={() => mover(i, 1)} className="text-steel-300 hover:text-white">
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </span>
            ) : (
              <span className="w-20 text-right text-sm text-white">{pesos(m.precio_venta)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Acciones */}
      {!editando && !ordenEdicion && !editandoPesos && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button type="button" variant="outline" onClick={() => setOrdenEdicion(ordenados.map(m => m.id))}
            className="h-11 rounded-xl border-white/15 bg-transparent font-bold text-white hover:bg-white/5 hover:text-white">
            <ListOrdered className="mr-2 h-4 w-4" />Ordenar medidas
          </Button>
          <Button type="button" variant="outline" onClick={abrirEdicion}
            className="h-11 rounded-xl border-brand-blue/60 bg-transparent font-bold text-brand-blue hover:bg-brand-blue/10">
            <Settings2 className="mr-2 h-4 w-4" />Editar datos del grupo
          </Button>
          <Button type="button" variant="outline" onClick={abrirPesos}
            className="h-11 rounded-xl border-white/15 bg-transparent font-bold text-white hover:bg-white/5 hover:text-white">
            <Scale className="mr-2 h-4 w-4" />Pesos por unidad
          </Button>
        </div>
      )}

      {editandoPesos && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-white">Peso por unidad</h3>
              <p className="text-xs text-steel-500">
                Escribe cuánto pesa una unidad de cada medida, en gramos. Con eso la venta muestra cuánto pesar y el stock se
                puede contar por peso. Déjalo vacío para no usar el peso en esa medida.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" className="text-steel-300 hover:text-white"
              onClick={() => setEditandoPesos(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            {ordenados.map(m => {
              const peso = leerPeso(pesosEdicion[m.id])
              return (
                <div key={m.id} className="space-y-2 border-b border-white/5 px-3 py-2.5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-sm text-white">
                      {m.unidad_medida || '—'}
                      {!m.activo && <span className="ml-2 text-[10px] font-bold uppercase text-steel-500">Inactivo</span>}
                    </span>
                    <Input type="number" inputMode="decimal" min={0} step="0.001" placeholder="g"
                      aria-label={`Peso de una unidad de ${m.unidad_medida ?? 'esta medida'}, en gramos`}
                      value={pesosEdicion[m.id] ?? ''} onChange={e => setPesosEdicion(prev => ({ ...prev, [m.id]: e.target.value }))}
                      className={`${INPUT_CLS} h-9 w-28 text-[16px] ${peso === undefined ? 'border-brand-red/60' : ''}`} />
                    <button type="button" onClick={() => setCalculandoPara(calculandoPara === m.id ? null : m.id)}
                      className="shrink-0 text-xs font-semibold text-brand-blue hover:underline">
                      Pesar varias
                    </button>
                  </div>
                  {typeof peso === 'number' && (
                    <p className="text-[11px] text-steel-500">100 unidades pesan {formatearPeso(pesoDeCantidad(100, peso))}</p>
                  )}
                  {calculandoPara === m.id && (
                    <CalculadoraPesoUnitario onUsar={p => { setPesosEdicion(prev => ({ ...prev, [m.id]: String(p) })); setCalculandoPara(null) }} />
                  )}
                </div>
              )
            })}
          </div>

          {pesosInvalidos > 0 && (
            <p className="text-xs text-brand-red">Revisa los pesos en rojo: deben ser mayores que 0, o quedar vacíos.</p>
          )}
          <Button type="button" disabled={guardandoPesos || cambiosPeso.length === 0 || pesosInvalidos > 0} onClick={guardarPesos}
            className="h-11 w-full rounded-xl bg-brand-blue font-bold text-white hover:bg-brand-blue hover:brightness-110">
            {guardandoPesos ? 'Guardando…' : cambiosPeso.length === 0 ? 'Sin cambios de peso' : `Guardar ${cambiosPeso.length} peso(s)`}
          </Button>
        </div>
      )}

      {ordenEdicion && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button type="button" disabled={guardandoOrden} onClick={() => guardarOrden(false)}
              className="h-11 rounded-xl bg-brand-yellow font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
              {guardandoOrden ? 'Guardando…' : 'Guardar orden'}
            </Button>
            <Button type="button" variant="outline" disabled={guardandoOrden || !tieneOrdenManual} onClick={() => guardarOrden(true)}
              className="h-11 rounded-xl border-white/15 bg-transparent font-semibold text-white hover:bg-white/5 hover:text-white">
              Volver al orden por tamaño
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOrdenEdicion(null)}
              className="h-11 rounded-xl text-steel-300 hover:text-white">
              Cancelar
            </Button>
          </div>
          <p className="text-[11px] text-steel-500">Usa las flechas para mover una medida. El orden se guarda para todo el grupo.</p>
        </div>
      )}

      {/* Editar datos en bloque: lo mismo de "Editar Datos" de familias, más ubicación y stock mínimo. No toca precios. */}
      {editando && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-white">Editar datos del grupo</h3>
              <p className="text-xs text-steel-500">Elige las medidas y llena solo lo que quieras cambiar; lo vacío se deja como está.</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" className="text-steel-300 hover:text-white"
              onClick={() => setEditando(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#1a2430] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-steel-300">
                Medidas ({seleccionados.size} de {miembros.length})
              </span>
              <div className="flex gap-3 text-[11px] font-semibold">
                <button type="button" className="text-brand-blue hover:underline" onClick={() => setSeleccionados(new Set(miembros.map(m => m.id)))}>Todas</button>
                <button type="button" className="text-steel-300 hover:underline" onClick={() => setSeleccionados(new Set())}>Ninguna</button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {ordenados.map(m => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-2 last:border-0 hover:bg-white/5">
                  <input type="checkbox" checked={seleccionados.has(m.id)} onChange={() => alternarSeleccion(m.id)}
                    className="size-4 rounded border-white/20 accent-brand-yellow" />
                  <span className="flex-1 text-sm text-white">{m.unidad_medida || '—'}</span>
                  {!m.activo && <span className="text-[10px] font-bold uppercase text-steel-500">Inactivo</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="space-y-1">
              <Label className={LABEL_CLS}>Categoría</Label>
              <Select value={datos.categoria_id} onValueChange={v => v && setDatos(prev => ({ ...prev, categoria_id: v }))}
                items={categorias.map(c => ({ value: c.id, label: c.nombre }))}>
                <SelectTrigger className="w-full border-white/10 bg-[#1a2430] text-white">
                  <SelectValue placeholder="Sin cambiar" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="grupo-descripcion" className={LABEL_CLS}>Descripción</Label>
              <Textarea id="grupo-descripcion" value={datos.descripcion} placeholder="Sin cambiar"
                onChange={e => setDatos(prev => ({ ...prev, descripcion: e.target.value }))} className={`${INPUT_CLS} min-h-20`} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="grupo-imagen" className={LABEL_CLS}>URL imagen</Label>
              <Input id="grupo-imagen" value={datos.imagen_url} placeholder="Sin cambiar"
                onChange={e => setDatos(prev => ({ ...prev, imagen_url: e.target.value }))} className={INPUT_CLS} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="grupo-ubicacion" className={LABEL_CLS}>Ubicación</Label>
                <Input id="grupo-ubicacion" value={datos.ubicacion} placeholder="Sin cambiar"
                  onChange={e => setDatos(prev => ({ ...prev, ubicacion: e.target.value }))} className={INPUT_CLS} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grupo-stock-minimo" className={LABEL_CLS}>Stock mínimo</Label>
                <Input id="grupo-stock-minimo" type="number" inputMode="numeric" min={0} step={1} value={datos.stock_minimo}
                  placeholder="Sin cambiar" onChange={e => setDatos(prev => ({ ...prev, stock_minimo: e.target.value }))} className={INPUT_CLS} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className={LABEL_CLS}>IVA incluido en el costo</Label>
              <Select value={datos.ivaIncluido} onValueChange={v => v && setDatos(prev => ({ ...prev, ivaIncluido: v as typeof prev.ivaIncluido }))}
                items={OPCIONES_CAMBIO}>
                <SelectTrigger className="w-full border-white/10 bg-[#1a2430] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_cambio">No cambiar</SelectItem>
                  <SelectItem value="si">Activar</SelectItem>
                  <SelectItem value="no">Desactivar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={LABEL_CLS}>Proveedores asociados</Label>
              {proveedoresAAsignar.map(p => (
                <div key={p.key} className="flex items-end gap-2 rounded-lg border border-white/10 bg-[#1a2430] p-2">
                  <div className="flex-1">
                    <Select value={p.proveedor_id}
                      onValueChange={v => v && setProveedoresAAsignar(prev => prev.map(x => x.key === p.key ? { ...x, proveedor_id: v } : x))}
                      items={proveedoresDisponibles.map(pr => ({ value: pr.id, label: pr.nombre }))}>
                      <SelectTrigger className="w-full border-white/10 bg-[#111820] text-white">
                        <SelectValue placeholder="Selecciona proveedor…" />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedoresDisponibles.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input value={p.codigo} placeholder="Código del proveedor (opcional)" className={INPUT_CLS}
                      onChange={e => setProveedoresAAsignar(prev => prev.map(x => x.key === p.key ? { ...x, codigo: e.target.value } : x))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar proveedor" className="text-steel-300 hover:text-brand-red"
                    onClick={() => setProveedoresAAsignar(prev => prev.filter(x => x.key !== p.key))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm"
                className="border-brand-blue/60 bg-transparent font-semibold text-brand-blue hover:bg-brand-blue/10"
                onClick={() => setProveedoresAAsignar(prev => [...prev, { key: crypto.randomUUID(), proveedor_id: '', codigo: '' }])}>
                <Plus className="mr-1 h-4 w-4" />Proveedor
              </Button>
              <p className="text-[11px] text-steel-500">El costo de estos proveedores queda en $0; ajústalo luego en cada producto.</p>
            </div>
          </div>

          <Button type="button" disabled={aplicando} onClick={aplicarDatos}
            className="h-11 w-full rounded-xl bg-brand-blue font-bold text-white hover:bg-brand-blue hover:brightness-110">
            {aplicando ? 'Aplicando…' : `Aplicar a ${seleccionados.size} medida(s)`}
          </Button>
        </div>
      )}

      {esAdmin ? (
        <EscalaPrecios
          miembros={ordenados}
          margenDefault={margenDefault}
          onGuardado={precios => setMiembros(prev => prev.map(m => precios[m.id] !== undefined ? { ...m, precio_venta: precios[m.id] } : m))}
        />
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111820] px-4 py-3 text-xs text-steel-300">
          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
          La escala de precios y los cambios de precio son solo para administradores.
        </p>
      )}
    </div>
  )
}
