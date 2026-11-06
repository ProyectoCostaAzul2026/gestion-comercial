'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Eye, FolderInput, Layers, Pencil, Plus, PowerOff, Scissors, Shapes, SlidersHorizontal,
} from 'lucide-react'

/** Lo mínimo de un producto que necesitan las acciones de mover y sacar */
export interface ProductoAccion {
  id: string
  nombre: string
  familia_id: string | null
  caracteristica: string | null
  marca: string | null
  categoria_id: string | null
  unidad_medida?: string | null
}

export type ObjetivoAcciones =
  | { tipo: 'producto'; producto: ProductoAccion }
  | { tipo: 'grupo'; nombre: string; productos: ProductoAccion[] }

type Modo = 'menu' | 'categoria' | 'familia' | 'sacar'

const SEPARADOR = ' - '
const limpiar = (t: string) => t.trim().replace(/\s+/g, ' ')

interface Props {
  /** Montar con una `key` distinta por objetivo, para que el formulario empiece con sus datos */
  objetivo: ObjetivoAcciones
  onCerrar: () => void
  categorias: { id: string; nombre: string }[]
  familias: { id: string; nombre_base: string }[]
  esAdmin: boolean
  /** Ruta a la que vuelve "Agregar producto" (el nivel del inventario donde se abrió el menú) */
  rutaVolver?: string
  /** Si se da, "Ver su grupo de medidas" navega dentro del inventario en lugar de ir a la página del grupo */
  onVerGrupo?: (producto: ProductoAccion) => void
  /** Se llama después de mover o desactivar (por ejemplo, para salir de una página que ya no aplica) */
  onHecho?: () => void
}

/**
 * Menú de acciones de un producto o de un grupo de medidas completo: ver, editar, mover a otra categoría, mover a otra
 * familia o grupo, sacar del grupo y desactivar. Mover y sacar usan la función mover_productos de la base de datos.
 */
export function AccionesInventario({ objetivo, onCerrar, categorias, familias, esAdmin, rutaVolver, onVerGrupo, onHecho }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const productos = objetivo.tipo === 'producto' ? [objetivo.producto] : objetivo.productos
  const base = productos[0]
  const familiaActual = base.familia_id ? (familias.find(f => f.id === base.familia_id)?.nombre_base ?? '') : ''

  const [modo, setModo] = useState<Modo>('menu')
  const [categoriaId, setCategoriaId] = useState(base.categoria_id ?? '')
  const [familia, setFamilia] = useState(familiaActual)
  const [caracteristica, setCaracteristica] = useState(base.caracteristica ?? '')
  const [cambiarCategoria, setCambiarCategoria] = useState(false)
  const [sugeridasDe, setSugeridasDe] = useState<{ familiaId: string; lista: string[] } | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Características que ya tiene la familia escrita: se sugieren para unir el producto a un grupo que ya existe
  const familiaDestino = useMemo(() => {
    const nombre = limpiar(familia).toLowerCase()
    return nombre ? familias.find(f => f.nombre_base.trim().toLowerCase() === nombre) ?? null : null
  }, [familia, familias])
  const idDestino = modo === 'familia' ? familiaDestino?.id ?? null : null
  useEffect(() => {
    if (!idDestino) return
    let vigente = true
    supabase.from('productos').select('caracteristica').eq('familia_id', idDestino).eq('activo', true)
      .then(({ data }) => {
        if (!vigente) return
        const unicas = [...new Set((data ?? []).map(d => d.caracteristica).filter((c): c is string => !!c))]
        setSugeridasDe({ familiaId: idDestino, lista: unicas.sort((a, b) => a.localeCompare(b, 'es')) })
      })
    return () => { vigente = false }
  }, [idDestino, supabase])
  const sugeridas = idDestino && sugeridasDe?.familiaId === idDestino ? sugeridasDe.lista : []

  const esGrupo = objetivo.tipo === 'grupo'
  const titulo = esGrupo ? objetivo.nombre : objetivo.producto.nombre
  const subtitulo = esGrupo
    ? `Grupo de medidas · ${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}${base.marca ? ` · ${base.marca}` : ''}`
    : [base.unidad_medida, base.marca].filter(Boolean).join(' · ')
  const ids = productos.map(p => p.id)

  const nombreFinal = `${limpiar(familia) ? (familiaDestino?.nombre_base ?? limpiar(familia)) : '…'}${SEPARADOR}${limpiar(caracteristica) || '…'}`

  async function mover(args: { p_categoria_id?: string; p_familia?: string; p_caracteristica?: string }, mensaje: string) {
    setGuardando(true)
    const { error } = await supabase.rpc('mover_productos', { p_producto_ids: ids, ...args })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success(mensaje)
    onCerrar()
    router.refresh()
    onHecho?.()
  }

  function validarNombre(): string | null {
    if (!limpiar(familia)) return 'Escribe la familia'
    if (!limpiar(caracteristica)) return 'Escribe la característica'
    if (limpiar(familia).includes(SEPARADOR) || limpiar(caracteristica).includes(SEPARADOR)) return 'No uses " - " dentro de la familia o la característica (usa /)'
    return null
  }

  async function guardarFamilia() {
    const problema = validarNombre()
    if (problema) { toast.error(problema); return }
    if (cambiarCategoria && !categoriaId) { toast.error('Elige la categoría'); return }
    await mover({
      p_familia: limpiar(familia),
      p_caracteristica: limpiar(caracteristica),
      ...(cambiarCategoria ? { p_categoria_id: categoriaId } : {}),
    }, esGrupo ? 'Grupo movido' : 'Producto movido')
  }

  async function guardarSacar() {
    const nueva = limpiar(caracteristica)
    if (!nueva) { toast.error('Escribe la característica nueva'); return }
    if (nueva.includes(SEPARADOR)) { toast.error('No uses " - " dentro de la característica (usa /)'); return }
    if (nueva.toLowerCase() === (base.caracteristica ?? '').trim().toLowerCase()) {
      toast.error('Escribe una característica distinta a la actual para que quede en su propio grupo'); return
    }
    await mover({ p_caracteristica: nueva }, 'Producto sacado del grupo')
  }

  async function guardarCategoria() {
    if (!categoriaId) { toast.error('Elige la categoría'); return }
    if (productos.every(p => p.categoria_id === categoriaId)) { toast.error('Ya está en esa categoría'); return }
    await mover({ p_categoria_id: categoriaId }, 'Categoría cambiada')
  }

  async function desactivar() {
    if (esGrupo) return
    if (!window.confirm(`¿Seguro que deseas desactivar "${base.nombre}"${base.unidad_medida ? ` ${base.unidad_medida}` : ''}? Ya no aparecerá en el inventario activo.`)) return
    setGuardando(true)
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', base.id)
    setGuardando(false)
    if (error) { toast.error('Error al desactivar: ' + error.message); return }
    toast.success('Producto desactivado')
    onCerrar()
    router.refresh()
    onHecho?.()
  }

  const volver = rutaVolver ? `&volver=${encodeURIComponent(rutaVolver)}` : ''
  const BOTON = 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white hover:bg-white/5 disabled:opacity-50'
  const CAMPO = 'h-11 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500'
  const SELECT = 'h-11 w-full rounded-lg border border-white/10 bg-[#1a2430] px-3 text-[16px] text-white'

  const selectorCategoria = (
    <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className={SELECT} aria-label="Categoría">
      <option value="">Elige la categoría…</option>
      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
    </select>
  )

  return (
    <Sheet open onOpenChange={abierto => { if (!abierto) onCerrar() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-4 sm:mx-auto sm:max-w-lg">
        <SheetHeader className="p-0 pr-8">
          <SheetTitle className="text-base text-white">{titulo}</SheetTitle>
          {subtitulo && <SheetDescription className="text-xs text-steel-300">{subtitulo}</SheetDescription>}
        </SheetHeader>

        {modo !== 'menu' && (
          <button type="button" onClick={() => setModo('menu')} className="inline-flex items-center gap-1 self-start text-xs text-brand-blue hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a las acciones
          </button>
        )}

        {modo === 'menu' && (
          <nav className="flex flex-col">
            {!esGrupo && (
              <>
                <Link href={`/dashboard/inventario/${base.id}`} className={BOTON}><Eye className="h-4 w-4 text-steel-300" /> Ver detalle</Link>
                <Link href={`/dashboard/inventario/${base.id}/editar`} className={BOTON}><Pencil className="h-4 w-4 text-steel-300" /> Editar producto</Link>
                {base.familia_id && (onVerGrupo
                  ? <button type="button" className={BOTON} onClick={() => { onCerrar(); onVerGrupo(base) }}><Layers className="h-4 w-4 text-steel-300" /> Ver su grupo de medidas</button>
                  : <Link href={`/dashboard/inventario/${base.id}/grupo`} className={BOTON}><Layers className="h-4 w-4 text-steel-300" /> Ver su grupo de medidas</Link>)}
              </>
            )}
            {esGrupo && (
              <>
                <Link href={`/dashboard/inventario/nuevo?desde=${base.id}${volver}`} className={BOTON}><Plus className="h-4 w-4 text-steel-300" /> Agregar una medida a este grupo</Link>
                <Link href={`/dashboard/inventario/${base.id}/grupo`} className={BOTON}><SlidersHorizontal className="h-4 w-4 text-steel-300" /> Precios, orden y pesos del grupo</Link>
              </>
            )}
            <div className="my-1 border-t border-white/10" />
            <button type="button" className={BOTON} onClick={() => setModo('categoria')}>
              <Shapes className="h-4 w-4 text-brand-yellow" /> Mover a otra categoría
            </button>
            <button type="button" className={BOTON} onClick={() => setModo('familia')}>
              <FolderInput className="h-4 w-4 text-brand-yellow" /> Mover a otra familia o grupo de medidas
            </button>
            {!esGrupo && base.familia_id && (
              <button type="button" className={BOTON} onClick={() => { setCaracteristica(base.caracteristica ? `${base.caracteristica} ` : ''); setModo('sacar') }}>
                <Scissors className="h-4 w-4 text-brand-yellow" /> Sacar de su grupo de medidas
              </button>
            )}
            {!esGrupo && esAdmin && (
              <button type="button" className={`${BOTON} text-brand-red`} onClick={desactivar} disabled={guardando}>
                <PowerOff className="h-4 w-4" /> Desactivar producto
              </button>
            )}
          </nav>
        )}

        {modo === 'categoria' && (
          <div className="space-y-3">
            <p className="text-xs text-steel-300">
              {esGrupo ? 'Todas las medidas del grupo pasan' : 'El producto pasa'} a la categoría que elijas. El nombre, la familia y el grupo no cambian.
            </p>
            {selectorCategoria}
            <button type="button" onClick={guardarCategoria} disabled={guardando}
              className="h-11 w-full rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Cambiar categoría'}
            </button>
          </div>
        )}

        {modo === 'familia' && (
          <div className="space-y-3">
            <p className="text-xs text-steel-300">
              El nombre queda como <span className="font-semibold text-white">Familia - Característica</span>. Si la familia no
              existe se crea. Si eliges una característica que la familia ya tiene con la misma marca, {esGrupo ? 'las medidas se unen' : 'el producto se une'} a ese grupo de medidas.
              El código, el stock y los precios no cambian.
            </p>
            <div className="space-y-1">
              <Label htmlFor="mover-familia" className="text-xs text-steel-300">Familia</Label>
              <Input id="mover-familia" list="mover-familias" value={familia} onChange={e => setFamilia(e.target.value)} placeholder="Ej: Codo" className={CAMPO} autoComplete="off" />
              <datalist id="mover-familias">{familias.map(f => <option key={f.id} value={f.nombre_base} />)}</datalist>
              {limpiar(familia) && !familiaDestino && <p className="text-[11px] text-brand-yellow">Familia nueva: se creará al guardar.</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="mover-caracteristica" className="text-xs text-steel-300">Característica</Label>
              <Input id="mover-caracteristica" list="mover-caracteristicas" value={caracteristica} onChange={e => setCaracteristica(e.target.value)} placeholder="Ej: PVC Presion" className={CAMPO} autoComplete="off" />
              <datalist id="mover-caracteristicas">{sugeridas.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <label className="flex items-center gap-2 text-sm text-steel-300">
              <input type="checkbox" checked={cambiarCategoria} onChange={e => setCambiarCategoria(e.target.checked)} className="h-4 w-4 accent-brand-yellow" />
              Cambiar también la categoría
            </label>
            {cambiarCategoria && selectorCategoria}
            <p className="rounded-lg border border-white/10 bg-[#111820] px-3 py-2 text-xs text-steel-300">
              Quedará como: <span className="font-semibold text-white">{nombreFinal}</span>
            </p>
            <button type="button" onClick={guardarFamilia} disabled={guardando}
              className="h-11 w-full rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
              {guardando ? 'Guardando…' : esGrupo ? 'Mover grupo' : 'Mover producto'}
            </button>
          </div>
        )}

        {modo === 'sacar' && (
          <div className="space-y-3">
            <p className="text-xs text-steel-300">
              El producto sigue en la familia <span className="font-semibold text-white">{familiaActual}</span> pero forma su propio
              grupo de medidas con otra característica.
            </p>
            <div className="space-y-1">
              <Label htmlFor="sacar-caracteristica" className="text-xs text-steel-300">Característica nueva</Label>
              <Input id="sacar-caracteristica" value={caracteristica} onChange={e => setCaracteristica(e.target.value)} className={CAMPO} autoComplete="off" autoFocus />
            </div>
            <p className="rounded-lg border border-white/10 bg-[#111820] px-3 py-2 text-xs text-steel-300">
              Quedará como: <span className="font-semibold text-white">{familiaActual}{SEPARADOR}{limpiar(caracteristica) || '…'}</span>
            </p>
            <button type="button" onClick={guardarSacar} disabled={guardando}
              className="h-11 w-full rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Sacar del grupo'}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Botón "Más acciones" de la página de un producto: abre el mismo menú del inventario */
export function BotonAccionesProducto({ producto, categorias, familias, esAdmin }: {
  producto: ProductoAccion
  categorias: { id: string; nombre: string }[]
  familias: { id: string; nombre_base: string }[]
  esAdmin: boolean
}) {
  const [abierto, setAbierto] = useState(0)
  return (
    <>
      <button type="button" onClick={() => setAbierto(n => n + 1)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white hover:bg-white/5">
        <FolderInput className="h-4 w-4" /> Mover, sacar del grupo o desactivar
      </button>
      {abierto > 0 && (
        <AccionesInventario
          key={abierto}
          objetivo={{ tipo: 'producto', producto }}
          onCerrar={() => setAbierto(0)}
          categorias={categorias}
          familias={familias}
          esAdmin={esAdmin}
        />
      )}
    </>
  )
}
