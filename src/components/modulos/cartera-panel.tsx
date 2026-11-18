'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { TRAMOS, type FilaCartera, type Tramo } from '@/lib/cartera'
import { enlaceWhatsApp, textoRecordatorioCredito } from '@/lib/whatsapp'

type Cartera = { filas: FilaCartera[]; totales: Record<Tramo, number>; total: number }

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

export function CarteraPanel({ hoy, negocio, clientes, proveedores }: {
  hoy: string
  negocio: string
  clientes: Cartera
  proveedores: Cartera
}) {
  const [vista, setVista] = useState<'clientes' | 'proveedores'>('clientes')
  const [filtro, setFiltro] = useState<Tramo | 'todos'>('todos')
  const [abierto, setAbierto] = useState<string | null>(null)
  const cartera = vista === 'clientes' ? clientes : proveedores
  const filas = filtro === 'todos' ? cartera.filas : cartera.filas.filter(f => f.tramos[filtro] > 0)
  const vencido = cartera.total - cartera.totales.por_vencer

  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-[#0b1117] p-1">
        {([['clientes', 'Me deben (clientes)', clientes.total], ['proveedores', 'Debo (proveedores)', proveedores.total]] as const).map(([v, label, total]) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v}
            onClick={() => { setVista(v); setFiltro('todos'); setAbierto(null) }}
            className={`rounded-lg px-2 py-2 text-left transition-colors ${vista === v ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:bg-white/5'}`}>
            <span className="block text-xs font-bold">{label}</span>
            <span className="block font-display text-base font-bold">{fmt(total)}</span>
          </button>
        ))}
      </div>

      {/* Resumen por tramos */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white">{vista === 'clientes' ? 'Por cobrar' : 'Por pagar'}</p>
          <p className="text-xs text-steel-300">
            Vencido: <span className={`font-display font-bold ${vencido > 0 ? 'text-brand-red' : 'text-emerald-400'}`}>{fmt(vencido)}</span>
            {cartera.total > 0 && <span className="text-steel-500"> ({Math.round((vencido / cartera.total) * 100)}%)</span>}
          </p>
        </div>
        {cartera.total > 0 && (
          <div className="flex h-3 overflow-hidden rounded-full bg-white/5" aria-hidden>
            {TRAMOS.map(t => cartera.totales[t.clave] > 0 && (
              <div key={t.clave} style={{ width: `${(cartera.totales[t.clave] / cartera.total) * 100}%`, backgroundColor: t.color }} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <button type="button" onClick={() => setFiltro('todos')}
            className={`rounded-xl border p-2.5 text-left ${filtro === 'todos' ? 'border-brand-yellow bg-brand-yellow/10' : 'border-white/10 hover:border-white/20'}`}>
            <span className="block text-[11px] text-steel-300">Todo</span>
            <span className="block font-display text-sm font-bold text-white">{fmt(cartera.total)}</span>
          </button>
          {TRAMOS.map(t => (
            <button key={t.clave} type="button" onClick={() => setFiltro(t.clave)} disabled={!cartera.totales[t.clave]}
              className={`rounded-xl border p-2.5 text-left disabled:opacity-40 ${filtro === t.clave ? 'border-brand-yellow bg-brand-yellow/10' : 'border-white/10 hover:border-white/20'}`}>
              <span className="flex items-center gap-1.5 text-[11px] text-steel-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />{t.label}
              </span>
              <span className="block font-display text-sm font-bold text-white">{fmt(cartera.totales[t.clave])}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Lista por cliente o proveedor */}
      <section className="space-y-2">
        {filas.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500">
            {vista === 'clientes' ? 'Ningún cliente tiene saldo pendiente.' : 'No hay facturas por pagar.'}
          </p>
        )}
        {filas.map(f => {
          const clave = f.terceroId ?? f.tercero
          const abiertoAqui = abierto === clave
          const peor = TRAMOS.find(t => t.clave === (f.maxDias <= 0 ? 'por_vencer' : f.maxDias <= 30 ? 'd1_30' : f.maxDias <= 60 ? 'd31_60' : f.maxDias <= 90 ? 'd61_90' : 'mas_90'))!
          const whatsapp = vista === 'clientes'
            ? enlaceWhatsApp(f.telefono, textoRecordatorioCredito(negocio, f.tercero,
                f.documentos.map(d => ({ ticket: Number(d.referencia.replace(/\D/g, '')) || null, saldo: d.saldo, vence: d.vencimiento })), hoy))
            : null
          return (
            <div key={clave} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
              <button type="button" onClick={() => setAbierto(abiertoAqui ? null : clave)} aria-expanded={abiertoAqui}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/5">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: peor.color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{f.tercero}</span>
                  <span className="block text-[11px] text-steel-500">
                    {f.documentos.length} documento{f.documentos.length === 1 ? '' : 's'} · {f.maxDias > 0 ? `${f.maxDias} días de mora` : 'al día'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-base font-bold text-white">{fmt(f.total)}</span>
                  {f.total - f.tramos.por_vencer > 0 && (
                    <span className="block text-[11px] text-brand-red">{fmt(f.total - f.tramos.por_vencer)} vencido</span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-steel-500 transition-transform ${abiertoAqui ? 'rotate-180' : ''}`} />
              </button>
              {abiertoAqui && (
                <div className="space-y-2 border-t border-white/10 p-3">
                  {f.documentos.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0">
                        <span className="block font-medium text-white">{d.referencia}</span>
                        <span className="block text-steel-500">
                          {d.fecha ? `Del ${d.fecha}` : 'Sin fecha'}{d.vencimiento ? ` · vence ${d.vencimiento}` : ''}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-display font-bold text-white">{fmt(d.saldo)}</span>
                        <span className="block" style={{ color: TRAMOS.find(t => t.clave === d.tramo)!.color }}>
                          {d.dias > 0 ? `${d.dias} días` : 'al día'}
                        </span>
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {f.terceroId && (
                      <Link href={vista === 'clientes' ? `/dashboard/clientes/${f.terceroId}` : `/dashboard/proveedores/${f.terceroId}`}
                        className="inline-flex h-10 items-center rounded-xl border border-white/10 px-3 text-xs font-semibold text-white hover:bg-white/5">
                        {vista === 'clientes' ? 'Ver cliente y abonar' : 'Ver proveedor y pagar'}
                      </Link>
                    )}
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500">
                        <MessageCircle className="h-4 w-4" />Recordar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
