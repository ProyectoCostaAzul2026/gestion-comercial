'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ClipboardCheck, Search, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { normalizar } from '@/lib/inventario-arbol'
import { cargaConteo, leerCantidad, lineasContadas, type Contado, type ProductoConteo } from '@/lib/conteo'
import { ContarPorPeso } from './peso-por-unidad'

interface Props {
  productos: ProductoConteo[]
  categorias: { id: string; nombre: string }[]
  /** Filtro con el que se abre (por ejemplo, el grupo desde el que se entró) */
  inicial?: { texto?: string; categoria?: string }
}

const BORRADOR = 'conteo-inventario-borrador'
const POR_PAGINA = 40
const SIN_UBICACION = '__sin__'

/**
 * Conteo de inventario con el celular. Solo cambia el stock de los lugares en los que se escribió una cantidad.
 * Lo escrito se guarda en el celular como borrador hasta que se guarda o se descarta el conteo.
 */
export function ConteoInventario({ productos, categorias, inicial }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [texto, setTexto] = useState(inicial?.texto ?? '')
  const [categoria, setCategoria] = useState(inicial?.categoria ?? '')
  const [ubicacion, setUbicacion] = useState('')
  const [soloContados, setSoloContados] = useState(false)
  const [limite, setLimite] = useState(POR_PAGINA)
  const [contados, setContados] = useState<Record<string, Contado>>({})
  const [cargado, setCargado] = useState(false)
  const [revisando, setRevisando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Borrador: un conteo largo no se pierde si se cierra la app o se recarga la página
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(BORRADOR)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee una sola vez del almacenamiento del navegador
      if (guardado) setContados(JSON.parse(guardado))
    } catch { /* borrador dañado: se empieza de cero */ }
    setCargado(true)
  }, [])
  useEffect(() => {
    if (!cargado) return
    try { window.localStorage.setItem(BORRADOR, JSON.stringify(contados)) } catch { /* sin espacio: sigue sin borrador */ }
  }, [contados, cargado])

  const ubicaciones = useMemo(
    () => [...new Set(productos.map(p => p.ubicacion?.trim()).filter((u): u is string => !!u))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })),
    [productos],
  )

  const lineas = useMemo(() => lineasContadas(productos, contados), [productos, contados])
  const idsContados = useMemo(() => new Set(lineas.map(l => l.producto.id)), [lineas])
  const conDiferencia = lineas.filter(l => l.diferencia !== 0)
  const carga = useMemo(() => cargaConteo(lineas), [lineas])

  const filtrados = useMemo(() => {
    const tokens = normalizar(texto).split(/\s+/).filter(Boolean)
    return productos.filter(p => {
      if (soloContados && !idsContados.has(p.id)) return false
      if (categoria && p.categoria_id !== categoria) return false
      if (ubicacion === SIN_UBICACION ? !!p.ubicacion?.trim() : ubicacion && p.ubicacion?.trim() !== ubicacion) return false
      if (tokens.length === 0) return true
      const donde = normalizar([p.codigo, p.nombre, p.marca, p.unidad_medida, p.ubicacion].filter(Boolean).join(' '))
      return tokens.every(t => donde.includes(t))
    })
  }, [productos, texto, categoria, ubicacion, soloContados, idsContados])

  const hayFiltro = texto.trim() !== '' || categoria !== '' || ubicacion !== '' || soloContados

  const escribir = (id: string, lugar: 'almacen' | 'bodega', valor: string, porPeso = false) => {
    const limpio = valor.replace(/\D/g, '').slice(0, 7)
    setContados(prev => {
      const actual = prev[id] ?? { almacen: '', bodega: '' }
      return { ...prev, [id]: { ...actual, [lugar]: limpio, porPeso: porPeso || actual.porPeso } }
    })
  }
  const quitar = (id: string) => setContados(prev => {
    const copia = { ...prev }
    delete copia[id]
    return copia
  })

  const descartar = () => {
    if (lineas.length > 0 && !window.confirm(`¿Descartar lo contado en ${lineas.length} producto${lineas.length === 1 ? '' : 's'}? No se cambia ningún stock.`)) return
    setContados({})
    setSoloContados(false)
  }

  async function guardar() {
    if (carga.length === 0) { toast.info('Lo contado coincide con el sistema: no hay nada que ajustar'); return }
    setGuardando(true)
    const { error } = await supabase.rpc('registrar_conteo_inventario' as never, { p_conteos: carga } as never)
    setGuardando(false)
    if (error) {
      // PGRST202: la función todavía no existe en la base (falta aplicar la migración)
      toast.error(error.code === 'PGRST202'
        ? 'Falta activar el conteo en la base de datos (migración registrar_conteo_inventario). Tu conteo sigue guardado en este celular.'
        : 'No se guardó el conteo: ' + error.message, { duration: 9000 })
      return
    }
    toast.success(`Conteo guardado: ${carga.length} producto${carga.length === 1 ? '' : 's'} ajustado${carga.length === 1 ? '' : 's'}`)
    setContados({})
    setRevisando(false)
    setSoloContados(false)
    router.refresh()
  }

  const SELECT = 'h-11 w-full rounded-lg border border-white/10 bg-[#1a2430] px-3 text-[16px] text-white'
  const CAMPO = 'h-11 border-white/10 bg-[#1a2430] text-center text-[16px] font-bold text-white placeholder:font-normal placeholder:text-steel-500'

  return (
    <div className="space-y-3 pb-24">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input value={texto} onChange={e => { setTexto(e.target.value); setLimite(POR_PAGINA) }}
          placeholder="Buscar por nombre, código, marca o medida…"
          className="h-12 border-white/10 bg-[#1a2430] pl-9 pr-10 text-[16px] text-white placeholder:text-steel-500" />
        {texto && (
          <button type="button" onClick={() => setTexto('')} aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-steel-300 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={ubicacion} onChange={e => { setUbicacion(e.target.value); setLimite(POR_PAGINA) }} className={SELECT} aria-label="Ubicación">
          <option value="">Toda ubicación</option>
          {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
          <option value={SIN_UBICACION}>Sin ubicación</option>
        </select>
        <select value={categoria} onChange={e => { setCategoria(e.target.value); setLimite(POR_PAGINA) }} className={SELECT} aria-label="Categoría">
          <option value="">Toda categoría</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-steel-300">
        <input type="checkbox" checked={soloContados} onChange={e => setSoloContados(e.target.checked)} className="h-4 w-4 accent-brand-yellow" />
        Ver solo lo que ya conté ({lineas.length})
      </label>

      {!hayFiltro ? (
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-6 text-center text-sm text-steel-300">
          <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-brand-yellow/60" aria-hidden />
          Elige una ubicación o una categoría, o busca un producto, para empezar a contar.
          <p className="mt-1 text-xs text-steel-500">Deja en blanco lo que no cuentes: su stock no cambia.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-steel-300">{filtrados.length} producto{filtrados.length === 1 ? '' : 's'}</p>
          <ul className="space-y-2">
            {filtrados.slice(0, limite).map(p => {
              const c = contados[p.id] ?? { almacen: '', bodega: '' }
              const almacen = leerCantidad(c.almacen)
              const bodega = leerCantidad(c.bodega)
              const contado = almacen !== null || bodega !== null
              const diferencia = (almacen === null ? 0 : almacen - p.stock_almacen) + (bodega === null ? 0 : bodega - p.stock_bodega)
              return (
                <li key={p.id} className={`rounded-2xl border bg-[#111820] p-3 ${contado ? (diferencia === 0 ? 'border-emerald-500/40' : 'border-brand-yellow/50') : 'border-white/10'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight text-white">{p.nombre} <span className="text-brand-yellow">{p.unidad_medida ?? ''}</span></p>
                      <p className="truncate text-[11px] text-steel-300">
                        <span className="font-mono">{p.codigo ?? '—'}</span>
                        {p.marca ? ` · ${p.marca}` : ''}{p.ubicacion ? ` · ${p.ubicacion}` : ''}
                      </p>
                    </div>
                    {contado && (
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${diferencia === 0 ? 'bg-emerald-500/20 text-emerald-400' : diferencia > 0 ? 'bg-brand-yellow/20 text-brand-yellow' : 'bg-brand-red/20 text-brand-red'}`}>
                          {diferencia === 0 ? <Check className="inline h-3 w-3" aria-label="Coincide" /> : `${diferencia > 0 ? '+' : ''}${diferencia}`}
                        </span>
                        <button type="button" onClick={() => quitar(p.id)} aria-label={`Borrar lo contado de ${p.nombre}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-300 hover:bg-white/10 hover:text-brand-red">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {p.vender_por_fraccion ? (
                    <p className="mt-2 text-xs text-steel-500">Se vende por fracción (metro o kilo): ajusta su stock en «Editar producto».</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(['almacen', 'bodega'] as const).map(lugar => {
                        const sistema = lugar === 'almacen' ? p.stock_almacen : p.stock_bodega
                        const nombreLugar = lugar === 'almacen' ? 'Almacén' : 'Bodega'
                        return (
                          <div key={lugar} className="space-y-1">
                            <label htmlFor={`${lugar}-${p.id}`} className="flex justify-between text-[11px] text-steel-300">
                              <span>{nombreLugar}</span><span>Sistema: <b className="text-white">{sistema}</b></span>
                            </label>
                            <Input id={`${lugar}-${p.id}`} inputMode="numeric" pattern="[0-9]*" value={c[lugar]} placeholder="Sin contar"
                              onChange={e => escribir(p.id, lugar, e.target.value)} className={CAMPO} autoComplete="off" />
                            {p.peso_unitario_g && p.peso_unitario_g > 0 && (
                              <ContarPorPeso id={`peso-${lugar}-${p.id}`} pesoUnitario={Number(p.peso_unitario_g)} stockActual={sistema}
                                lugar={nombreLugar.toLowerCase()} onUsar={unidades => escribir(p.id, lugar, String(unidades), true)} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {filtrados.length > limite && (
            <button type="button" onClick={() => setLimite(l => l + POR_PAGINA)}
              className="h-11 w-full rounded-xl border border-white/15 text-sm font-bold text-white hover:bg-white/5">
              Mostrar más ({filtrados.length - limite} restantes)
            </button>
          )}
          {filtrados.length === 0 && <p className="p-6 text-center text-sm text-steel-500">No hay productos con ese filtro.</p>}
        </>
      )}

      {/* Barra del conteo: siempre a la vista, encima de la barra de navegación del celular */}
      {lineas.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-white/10 bg-[#111820]/95 px-4 py-2 backdrop-blur lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <div className="min-w-0 flex-1 text-xs text-steel-300">
              <p className="font-bold text-white">{lineas.length} contado{lineas.length === 1 ? '' : 's'}</p>
              <p>{conDiferencia.length === 0 ? 'Todo coincide' : `${conDiferencia.length} con diferencia`}</p>
            </div>
            <button type="button" onClick={descartar} className="h-11 rounded-xl border border-white/15 px-3 text-sm font-bold text-white hover:bg-white/5">Descartar</button>
            <button type="button" onClick={() => setRevisando(true)} className="h-11 rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105">Revisar y guardar</button>
          </div>
        </div>
      )}

      {revisando && (
        <Sheet open onOpenChange={abierto => { if (!abierto && !guardando) setRevisando(false) }}>
          <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg">
            <SheetHeader className="p-0 pr-8">
              <SheetTitle className="text-base text-white">Guardar conteo</SheetTitle>
              <SheetDescription className="text-xs text-steel-300">
                {lineas.length} producto{lineas.length === 1 ? '' : 's'} contado{lineas.length === 1 ? '' : 's'} · {carga.length} con ajuste de stock
              </SheetDescription>
            </SheetHeader>
            {carga.length === 0 ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-white">Todo lo contado coincide con el sistema: no hay ajustes que guardar.</p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10 text-xs">
                {lineas.filter(l => carga.some(x => x.producto_id === l.producto.id)).map(l => (
                  <li key={l.producto.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{l.producto.nombre} {l.producto.unidad_medida ?? ''}</p>
                      <p className="text-steel-300">
                        {l.almacen !== null && l.almacen !== l.producto.stock_almacen && `Almacén ${l.producto.stock_almacen} → ${l.almacen}`}
                        {l.almacen !== null && l.almacen !== l.producto.stock_almacen && l.bodega !== null && l.bodega !== l.producto.stock_bodega && ' · '}
                        {l.bodega !== null && l.bodega !== l.producto.stock_bodega && `Bodega ${l.producto.stock_bodega} → ${l.bodega}`}
                        {l.porPeso && ' · por peso'}
                      </p>
                    </div>
                    <span className={`shrink-0 font-display text-sm font-bold ${l.diferencia > 0 ? 'text-brand-yellow' : l.diferencia < 0 ? 'text-brand-red' : 'text-steel-300'}`}>
                      {l.diferencia > 0 ? '+' : ''}{l.diferencia}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-steel-500">
              Cada ajuste queda en el historial de movimientos con tu usuario. Si un producto se vendió o se recibió mientras contabas, no se ajusta y te avisa para contarlo de nuevo.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRevisando(false)} disabled={guardando}
                className="h-12 flex-1 rounded-xl border border-white/15 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-50">Seguir contando</button>
              {carga.length > 0 && (
                <button type="button" onClick={guardar} disabled={guardando}
                  className="h-12 flex-[1.4] rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
                  {guardando ? 'Guardando…' : `Guardar ${carga.length} ajuste${carga.length === 1 ? '' : 's'}`}
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
