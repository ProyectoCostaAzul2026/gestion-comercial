'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/avisos'
import {
  BookmarkPlus, Check, ChevronDown, ChevronUp, CopyPlus, Flag, Pencil, Plus, RotateCcw, Trash2, User, Users, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PRIORIDADES, ordenarPendientes, textoVencimiento, type PlantillaTarea, type Prioridad, type Tarea } from '@/lib/tareas'

interface Persona { id: string; nombre: string; rol: string }

interface Props {
  pendientes: Tarea[]
  hechas: Tarea[]
  plantillas: PlantillaTarea[]
  personas: Persona[]
  esAdmin: boolean
  usuarioId: string
  hoy: string
}

interface Borrador {
  id: string | null
  titulo: string
  descripcion: string
  prioridad: Prioridad
  asignado_a: string
  fecha_limite: string
  plantilla_id: string | null
  guardarPlantilla: boolean
}

const VACIO: Borrador = {
  id: null, titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', fecha_limite: '', plantilla_id: null, guardarPlantilla: false,
}

const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  alta: 'border-brand-red/40 bg-brand-red/15 text-sale',
  media: 'border-brand-yellow/40 bg-brand-yellow/15 text-brand-yellow',
  baja: 'border-linea bg-velo/5 text-steel-300',
}

type Filtro = 'todas' | 'mias' | 'libres' | string

export function TareasPanel({ pendientes, hechas, plantillas, personas, esAdmin, usuarioId, hoy }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const nombre = (id: string | null) => (id ? personas.find(p => p.id === id)?.nombre ?? 'Alguien' : null)
  const [filtro, setFiltro] = useState<Filtro>(esAdmin ? 'todas' : 'mias')
  const [verHechas, setVerHechas] = useState(false)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [marcando, setMarcando] = useState<string | null>(null)
  const [cerrando, setCerrando] = useState<Tarea | null>(null)
  const [nota, setNota] = useState('')

  const filtrar = (t: Tarea) =>
    filtro === 'todas' ? true
      : filtro === 'mias' ? t.asignado_a === usuarioId
        : filtro === 'libres' ? t.asignado_a === null
          : t.asignado_a === filtro
  const lista = ordenarPendientes(pendientes.filter(filtrar), hoy)
  const listaHechas = hechas.filter(filtrar)
  const cuentaMias = pendientes.filter(t => t.asignado_a === usuarioId).length
  const cuentaLibres = pendientes.filter(t => t.asignado_a === null).length

  // ── Crear, editar y reutilizar (administrador) ──
  const desdePlantilla = (p: PlantillaTarea) => setBorrador({
    ...VACIO, titulo: p.titulo, descripcion: p.descripcion ?? '', prioridad: p.prioridad, asignado_a: p.asignado_a ?? '', plantilla_id: p.id,
  })
  const repetir = (t: Tarea) => setBorrador({
    ...VACIO, titulo: t.titulo, descripcion: t.descripcion ?? '', prioridad: t.prioridad, asignado_a: t.asignado_a ?? '', plantilla_id: t.plantilla_id,
  })
  const editar = (t: Tarea) => setBorrador({
    id: t.id, titulo: t.titulo, descripcion: t.descripcion ?? '', prioridad: t.prioridad, asignado_a: t.asignado_a ?? '',
    fecha_limite: t.fecha_limite ?? '', plantilla_id: t.plantilla_id, guardarPlantilla: false,
  })

  async function guardar() {
    if (!borrador) return
    const titulo = borrador.titulo.trim()
    if (!titulo) { toast.error('Escribe qué hay que hacer'); return }
    if (borrador.fecha_limite && !borrador.id && borrador.fecha_limite < hoy) { toast.error('La fecha límite ya pasó'); return }
    setGuardando(true)
    try {
      const datos = {
        titulo,
        descripcion: borrador.descripcion.trim() || null,
        prioridad: borrador.prioridad,
        asignado_a: borrador.asignado_a || null,
        fecha_limite: borrador.fecha_limite || null,
      }
      let plantillaId = borrador.plantilla_id
      if (borrador.guardarPlantilla) {
        const { data, error } = await supabase.from('tareas_plantillas')
          .insert({ titulo: datos.titulo, descripcion: datos.descripcion, prioridad: datos.prioridad, asignado_a: datos.asignado_a } as never)
          .select('id').single()
        if (error) throw error
        plantillaId = (data as unknown as { id: string }).id
      }
      if (borrador.id) {
        const { error } = await supabase.from('tareas').update(datos as never).eq('id', borrador.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tareas').insert({ ...datos, plantilla_id: plantillaId } as never)
        if (error) throw error
        if (plantillaId) {
          const usada = plantillas.find(p => p.id === plantillaId)
          if (usada) await supabase.from('tareas_plantillas').update({ veces_usada: usada.veces_usada + 1 } as never).eq('id', plantillaId)
        }
      }
      toast.success(borrador.id ? 'Tarea actualizada' : 'Tarea creada')
      setBorrador(null)
      router.refresh()
    } catch (err) {
      toast.error('No se pudo guardar: ' + (err as { message?: string }).message)
    } finally {
      setGuardando(false)
    }
  }

  async function borrarTarea(t: Tarea) {
    if (!window.confirm(`¿Borrar la tarea "${t.titulo}"?`)) return
    const { error } = await supabase.from('tareas').delete().eq('id', t.id)
    if (error) { toast.error('No se pudo borrar: ' + error.message); return }
    toast.success('Tarea borrada')
    router.refresh()
  }

  async function borrarPlantilla(p: PlantillaTarea) {
    if (!window.confirm(`¿Borrar la plantilla "${p.titulo}"? Las tareas ya creadas no cambian.`)) return
    const { error } = await supabase.from('tareas_plantillas').delete().eq('id', p.id)
    if (error) { toast.error('No se pudo borrar: ' + error.message); return }
    toast.success('Plantilla borrada')
    router.refresh()
  }

  // ── Marcar hecha o devolver a pendiente ──
  async function marcar(t: Tarea, hecha: boolean, notaCierre?: string) {
    setMarcando(t.id)
    const { error } = await supabase.rpc('marcar_tarea', { p_tarea_id: t.id, p_hecha: hecha, p_nota: notaCierre ?? undefined })
    setMarcando(null)
    if (error) { toast.error(error.message); return }
    toast.success(hecha ? '¡Tarea hecha!' : 'La tarea volvió a pendientes')
    setCerrando(null)
    setNota('')
    router.refresh()
  }

  const FILTROS: { valor: Filtro; etiqueta: string; cuenta?: number }[] = [
    ...(esAdmin ? [{ valor: 'todas', etiqueta: 'Todas', cuenta: pendientes.length }] : []),
    { valor: 'mias', etiqueta: esAdmin ? 'Mías' : 'Mis tareas', cuenta: cuentaMias },
    { valor: 'libres', etiqueta: 'Libres', cuenta: cuentaLibres },
  ]
  const CAMPO = 'h-11 w-full rounded-xl border border-linea bg-superficie-2 px-3 text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25 focus:outline-none'
  const ETIQUETA = 'mb-1 block text-sm font-semibold text-suave'

  const Tarjeta = ({ t }: { t: Tarea }) => {
    const venc = textoVencimiento(t.fecha_limite, hoy)
    const hecha = t.estado === 'hecha'
    const puedeDeshacer = hecha && (esAdmin || t.hecha_por === usuarioId)
    return (
      <li className={`flex gap-3 rounded-2xl border bg-superficie p-3 ${hecha ? 'border-linea opacity-70' : venc?.vencida ? 'border-brand-red/40' : 'border-linea'}`}>
        <button type="button" disabled={marcando === t.id || (hecha && !puedeDeshacer)}
          onClick={() => (hecha ? marcar(t, false) : setCerrando(t))}
          aria-label={hecha ? `Volver a pendiente: ${t.titulo}` : `Marcar como hecha: ${t.titulo}`}
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition ${
            hecha ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-linea-fuerte text-transparent hover:border-brand-yellow hover:text-brand-yellow'
          }`}>
          <Check className="h-5 w-5" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${hecha ? 'text-steel-300 line-through' : 'text-tinta'}`}>{t.titulo}</p>
          {t.descripcion && <p className="mt-0.5 whitespace-pre-line text-xs text-steel-300">{t.descripcion}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            {!hecha && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold ${COLOR_PRIORIDAD[t.prioridad]}`}>
                <Flag className="h-3 w-3" aria-hidden />{PRIORIDADES.find(p => p.valor === t.prioridad)?.etiqueta}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-steel-300">
              {t.asignado_a ? <User className="h-3 w-3" aria-hidden /> : <Users className="h-3 w-3" aria-hidden />}
              {t.asignado_a ? (t.asignado_a === usuarioId ? 'Para ti' : nombre(t.asignado_a)) : 'Libre'}
            </span>
            {venc && !hecha && (
              <span className={venc.vencida ? 'font-bold text-sale' : venc.hoy ? 'font-bold text-brand-yellow' : 'text-steel-300'}>· {venc.texto}</span>
            )}
            {hecha && (
              <span className="text-emerald-400">
                · Hecha por {t.hecha_por === usuarioId ? 'ti' : nombre(t.hecha_por)}{t.hecha_en ? ` el ${new Date(t.hecha_en).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' })}` : ''}
              </span>
            )}
          </div>
          {hecha && t.nota && <p className="mt-1 text-xs italic text-steel-300">«{t.nota}»</p>}
        </div>
        {esAdmin && (
          <div className="flex shrink-0 flex-col gap-1">
            {hecha ? (
              <button type="button" onClick={() => repetir(t)} aria-label={`Crear de nuevo: ${t.titulo}`} title="Crear de nuevo"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-300 hover:bg-velo/5 hover:text-brand-yellow">
                <CopyPlus className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => editar(t)} aria-label={`Editar: ${t.titulo}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-300 hover:bg-velo/5 hover:text-tinta">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => borrarTarea(t)} aria-label={`Borrar: ${t.titulo}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-300 hover:bg-velo/5 hover:text-sale">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {esAdmin && (
        <div className="space-y-3">
          <button type="button" onClick={() => setBorrador({ ...VACIO })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 md:w-auto md:px-6">
            <Plus className="h-5 w-5" strokeWidth={3} /> Nueva tarea
          </button>
          {plantillas.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-tenue">Crear desde una plantilla</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
                {plantillas.map(p => (
                  <span key={p.id} className="flex shrink-0 items-center rounded-full border border-linea bg-superficie">
                    <button type="button" onClick={() => desdePlantilla(p)} className="flex h-9 items-center gap-1.5 pl-3 pr-1 text-xs font-semibold text-tinta hover:text-brand-yellow">
                      <CopyPlus className="h-3.5 w-3.5" aria-hidden />{p.titulo}
                    </button>
                    <button type="button" onClick={() => borrarPlantilla(p)} aria-label={`Borrar plantilla ${p.titulo}`}
                      className="flex h-9 w-8 items-center justify-center text-steel-500 hover:text-sale">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {FILTROS.map(f => (
          <button key={f.valor} type="button" onClick={() => setFiltro(f.valor)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              filtro === f.valor ? 'bg-brand-yellow text-steel-900' : 'border border-linea bg-superficie-2 text-steel-300 hover:text-tinta'
            }`}>
            {f.etiqueta}
            {f.cuenta !== undefined && <span className={`rounded-full px-1.5 text-xs ${filtro === f.valor ? 'bg-steel-900/15' : 'bg-velo/10'}`}>{f.cuenta}</span>}
          </button>
        ))}
        {esAdmin && (
          <select value={['todas', 'mias', 'libres'].includes(filtro) ? '' : filtro} onChange={e => setFiltro(e.target.value || 'todas')}
            aria-label="Ver tareas de una persona" className="h-10 shrink-0 rounded-xl border border-linea bg-superficie-2 px-3 text-sm text-tinta">
            <option value="">Por persona…</option>
            {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Pendientes */}
      {lista.length === 0 ? (
        <div className="rounded-2xl bg-superficie p-8 text-center">
          <Check className="mx-auto mb-2 h-8 w-8 text-emerald-400" aria-hidden />
          <p className="text-sm text-tinta">No hay tareas pendientes{filtro === 'mias' ? ' para ti' : filtro === 'libres' ? ' libres' : ''}.</p>
        </div>
      ) : (
        <ul className="space-y-2">{lista.map(t => <Tarjeta key={t.id} t={t} />)}</ul>
      )}

      {/* Hechas (últimos 30 días) */}
      {listaHechas.length > 0 && (
        <section className="space-y-2">
          <button type="button" onClick={() => setVerHechas(v => !v)} aria-expanded={verHechas}
            className="flex items-center gap-1 text-sm font-semibold text-steel-300 hover:text-tinta">
            {verHechas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Hechas en los últimos 30 días ({listaHechas.length})
          </button>
          {verHechas && <ul className="space-y-2">{listaHechas.map(t => <Tarjeta key={t.id} t={t} />)}</ul>}
        </section>
      )}

      {/* Marcar como hecha, con nota opcional */}
      {cerrando && (
        <Sheet open onOpenChange={abierto => { if (!abierto) { setCerrando(null); setNota('') } }}>
          <SheetContent side="bottom" className="rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg">
            <SheetHeader className="p-0 pr-8">
              <SheetTitle className="text-base text-tinta">¿Terminaste esta tarea?</SheetTitle>
              <SheetDescription className="text-sm text-steel-300">{cerrando.titulo}</SheetDescription>
            </SheetHeader>
            <div>
              <label htmlFor="nota-tarea" className={ETIQUETA}>Nota (opcional)</label>
              <input id="nota-tarea" value={nota} maxLength={500} onChange={e => setNota(e.target.value)}
                placeholder="Ej: faltaron 2 cajas, quedaron en bodega" className={CAMPO} />
            </div>
            <button type="button" disabled={marcando === cerrando.id} onClick={() => marcar(cerrando, true, nota)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50">
              <Check className="h-5 w-5" strokeWidth={3} />{marcando === cerrando.id ? 'Guardando…' : 'Sí, la hice'}
            </button>
          </SheetContent>
        </Sheet>
      )}

      {/* Crear o editar (administrador) */}
      {borrador && (
        <Sheet open onOpenChange={abierto => { if (!abierto && !guardando) setBorrador(null) }}>
          <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg">
            <SheetHeader className="p-0 pr-8">
              <SheetTitle className="text-base text-tinta">{borrador.id ? 'Editar tarea' : 'Nueva tarea'}</SheetTitle>
              <SheetDescription className="text-xs text-steel-300">
                {borrador.plantilla_id && !borrador.id ? 'Creada desde una plantilla: cambia lo que necesites.' : 'Déjala libre para que la haga cualquiera, o asígnala.'}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3">
              <div>
                <label htmlFor="t-titulo" className={ETIQUETA}>Qué hay que hacer</label>
                <input id="t-titulo" value={borrador.titulo} maxLength={200} autoFocus
                  onChange={e => setBorrador({ ...borrador, titulo: e.target.value })} placeholder="Ej: Organizar la vitrina de tornillería" className={CAMPO} />
              </div>
              <div>
                <label htmlFor="t-desc" className={ETIQUETA}>Detalles (opcional)</label>
                <textarea id="t-desc" value={borrador.descripcion} maxLength={2000} rows={3}
                  onChange={e => setBorrador({ ...borrador, descripcion: e.target.value })}
                  className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25 focus:outline-none" />
              </div>
              <div>
                <span className={ETIQUETA}>Prioridad</span>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Prioridad">
                  {PRIORIDADES.map(p => (
                    <button key={p.valor} type="button" role="radio" aria-checked={borrador.prioridad === p.valor}
                      onClick={() => setBorrador({ ...borrador, prioridad: p.valor })}
                      className={`h-11 rounded-xl border text-sm font-bold transition ${borrador.prioridad === p.valor ? COLOR_PRIORIDAD[p.valor] : 'border-linea bg-superficie-2 text-steel-300'}`}>
                      {p.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="t-asignado" className={ETIQUETA}>Para</label>
                  <select id="t-asignado" value={borrador.asignado_a} onChange={e => setBorrador({ ...borrador, asignado_a: e.target.value })} className={CAMPO}>
                    <option value="">Libre (cualquiera)</option>
                    {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="t-fecha" className={ETIQUETA}>Fecha límite</label>
                  <input id="t-fecha" type="date" min={borrador.id ? undefined : hoy} value={borrador.fecha_limite}
                    onChange={e => setBorrador({ ...borrador, fecha_limite: e.target.value })} className={CAMPO} />
                </div>
              </div>
              {!borrador.id && !borrador.plantilla_id && (
                <label className="flex items-center gap-2 text-sm text-steel-300">
                  <input type="checkbox" checked={borrador.guardarPlantilla} onChange={e => setBorrador({ ...borrador, guardarPlantilla: e.target.checked })}
                    className="h-4 w-4 accent-brand-yellow" />
                  <BookmarkPlus className="h-4 w-4" aria-hidden /> Guardar también como plantilla para reutilizarla
                </label>
              )}
            </div>
            <div className="flex gap-2">
              {borrador.id && (
                <button type="button" onClick={() => setBorrador(null)} disabled={guardando}
                  className="flex h-12 items-center gap-2 rounded-xl border border-linea px-4 text-sm font-bold text-tinta hover:bg-velo/5">
                  <RotateCcw className="h-4 w-4" />Cancelar
                </button>
              )}
              <button type="button" onClick={guardar} disabled={guardando}
                className="h-12 flex-1 rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
                {guardando ? 'Guardando…' : borrador.id ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
