'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Database, ShieldAlert, Timer, User } from 'lucide-react'
import {
  ACCION_BITACORA, ORIGEN_BITACORA, TABLA_BITACORA, cambiosDeDetalle, textoValor,
  type BorradoBitacora, type RegistroBitacora,
} from '@/lib/bitacora'

interface Props {
  registros: RegistroBitacora[]
  borrados: BorradoBitacora[]
  filtros: { tabla: string; origen: string; desde: string; hasta: string }
  /** Hay más registros de los que se muestran */
  hayMas: boolean
}

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-CO', {
  timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

const COLOR_ACCION: Record<RegistroBitacora['accion'], string> = {
  crear: 'border-brand-blue/40 bg-brand-blue/15 text-brand-blue',
  cambiar: 'border-brand-yellow/30 bg-brand-yellow/15 text-brand-yellow',
  borrar: 'border-brand-red/40 bg-brand-red/15 text-brand-red',
  vaciar: 'border-brand-red/40 bg-brand-red/15 text-brand-red',
}

function Registro({ r }: { r: RegistroBitacora }) {
  const [abierto, setAbierto] = useState(false)
  const cambios = cambiosDeDetalle(r.detalle)
  const tieneDetalle = r.detalle !== null && r.detalle !== undefined
  const IconoOrigen = r.origen === 'sistema' ? User : r.origen === 'automatico' ? Timer : Database
  return (
    <li className={`rounded-2xl border bg-[#111820] ${r.origen === 'base_de_datos' ? 'border-brand-red/30' : 'border-white/10'}`}>
      <button type="button" disabled={!tieneDetalle} onClick={() => setAbierto(v => !v)} aria-expanded={tieneDetalle ? abierto : undefined}
        className="flex w-full items-start gap-3 px-3 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-steel-300">
            <span className="font-mono text-steel-500">#{r.numero}</span>
            <span className={`rounded-full border px-2 py-0.5 font-bold ${COLOR_ACCION[r.accion]}`}>{ACCION_BITACORA[r.accion]}</span>
            <span className="font-semibold text-white">{TABLA_BITACORA[r.tabla] ?? r.tabla}</span>
            <span>{fechaHora(r.ocurrido_en)}</span>
          </p>
          <p className="mt-1 text-sm text-white">{r.resumen}</p>
          <p className={`mt-1 flex items-center gap-1.5 text-[11px] ${r.origen === 'base_de_datos' ? 'text-brand-red' : 'text-steel-300'}`}>
            <IconoOrigen className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {r.origen === 'sistema' ? (r.usuario_nombre ?? 'Usuario del sistema') : `${ORIGEN_BITACORA[r.origen]} (${r.rol_bd})`}
          </p>
        </div>
        {tieneDetalle && (abierto ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-steel-300" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-steel-300" />)}
      </button>
      {abierto && tieneDetalle && (
        <div className="border-t border-white/10 px-3 py-2 text-xs">
          {cambios ? (
            <ul className="space-y-1">
              {cambios.map(c => (
                <li key={c.columna} className="flex flex-wrap gap-x-2">
                  <span className="text-steel-300">{c.columna}:</span>
                  <span className="text-brand-red line-through">{textoValor(c.antes)}</span>
                  <span className="text-steel-500">→</span>
                  <span className="font-semibold text-emerald-400">{textoValor(c.despues)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-steel-300">{JSON.stringify(r.detalle, null, 2)}</pre>
          )}
        </div>
      )}
    </li>
  )
}

/** Bitácora de cambios importantes: solo lectura. Nadie puede cambiarla ni borrarla desde la app. */
export function BitacoraPanel({ registros, borrados, filtros, hayMas }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const filtrar = (clave: string, valor: string) => {
    const sp = new URLSearchParams(params.toString())
    if (valor) sp.set(clave, valor); else sp.delete(clave)
    router.push(`${pathname}?${sp.toString()}`)
  }
  const sinFiltro = !filtros.tabla && !filtros.origen && !filtros.desde && !filtros.hasta
  // Solo tiene sentido buscar saltos cuando se ve la lista completa, sin filtros
  const SELECT = 'h-11 w-full rounded-lg border border-white/10 bg-[#1a2430] px-3 text-[16px] text-white'
  const ETIQUETA = 'text-[10px] font-bold uppercase tracking-widest text-steel-300'

  return (
    <div className="space-y-4">
      {borrados.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-brand-red/40 bg-brand-red/10 p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <ShieldAlert className="h-5 w-5 text-brand-red" aria-hidden />Se borraron registros de la bitácora
          </h2>
          <p className="text-xs text-steel-300">Esto solo se puede hacer directamente en la base de datos. Este aviso no se puede quitar.</p>
          <ul className="space-y-1 text-sm text-white">
            {borrados.map(b => (
              <li key={b.id} className="rounded-xl border border-white/10 bg-[#111820] px-3 py-2">
                <p>
                  {fechaHora(b.ocurrido_en)}: {b.forma === 'vaciado' ? 'se vació la bitácora' : 'se borraron registros'} ({b.registros.toLocaleString('es-CO')})
                  {b.numero_desde !== null && ` · del #${b.numero_desde} al #${b.numero_hasta}`}
                </p>
                <p className="text-xs text-steel-300">
                  {b.fecha_desde && b.fecha_hasta ? `Cubrían del ${fechaHora(b.fecha_desde)} al ${fechaHora(b.fecha_hasta)} · ` : ''}usuario de la base: {b.rol_bd}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label htmlFor="bit-tabla" className={ETIQUETA}>Qué</label>
          <select id="bit-tabla" value={filtros.tabla} onChange={e => filtrar('tabla', e.target.value)} className={SELECT}>
            <option value="">Todo</option>
            {Object.entries(TABLA_BITACORA).sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="bit-origen" className={ETIQUETA}>Desde dónde</label>
          <select id="bit-origen" value={filtros.origen} onChange={e => filtrar('origen', e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            {Object.entries(ORIGEN_BITACORA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="bit-desde" className={ETIQUETA}>Desde</label>
          <input id="bit-desde" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => filtrar('desde', e.target.value)} className={SELECT} />
        </div>
        <div className="space-y-1">
          <label htmlFor="bit-hasta" className={ETIQUETA}>Hasta</label>
          <input id="bit-hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={e => filtrar('hasta', e.target.value)} className={SELECT} />
        </div>
      </div>

      {registros.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500">
          {sinFiltro ? 'Todavía no hay cambios registrados.' : 'No hay registros con ese filtro.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {registros.map(r => <Registro key={r.numero} r={r} />)}
        </ul>
      )}
      {hayMas && <p className="text-center text-xs text-steel-500">Se muestran los {registros.length} más recientes. Usa las fechas para ver más atrás.</p>}
    </div>
  )
}
