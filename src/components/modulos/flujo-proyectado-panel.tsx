'use client'

import { useMemo, useState } from 'react'
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { sumarDiasFecha } from '@/lib/periodos'

interface Documento { id: string; nombre: string; referencia: string; fecha: string; monto: number }

interface Semana {
  indice: number
  desde: string
  hasta: string
  cobros: number
  ventas: number
  pagos: number
  reposicion: number
  gastos: number
  nomina: number
  entradas: number
  salidas: number
  neto: number
  saldoInicial: number
  saldoFinal: number
  docsCobro: Documento[]
  docsPago: Documento[]
}

const fmt = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('es-CO')}`
const corto = (f: string) => `${Number(f.slice(8))}/${Number(f.slice(5, 7))}`
const AXIS_TICK = { fontSize: 9, fill: 'var(--suave)' }
const TOOLTIP_STYLE = { backgroundColor: 'var(--sup2)', border: '1px solid var(--linea)', borderRadius: 12, color: 'var(--tinta)', fontSize: 12 }

/**
 * Proyección semana a semana. Lo seguro: el dinero de hoy, los créditos por cobrar y las facturas por pagar según su
 * fecha (lo vencido cuenta en la primera semana). Lo estimado, con interruptores: ventas de contado, reposición de la
 * mercancía vendida, gastos y nómina al promedio reciente.
 */
export function FlujoProyectadoPanel({ hoy, disponible, cobros, pagos, promedios }: {
  hoy: string
  disponible: { efectivo: number; nequi: number; daviplata: number; tarjeta: number; cajaMayor: number }
  cobros: Documento[]
  pagos: Documento[]
  promedios: { dias: number; desde: string; ventasContadoDia: number; costoVentasDia: number; gastosDia: number; nominaDia: number }
}) {
  const [semanas, setSemanas] = useState(8)
  const [conVentas, setConVentas] = useState(true)
  const [conGastos, setConGastos] = useState(true)
  const [cobroProbable, setCobroProbable] = useState(100)
  const [abierta, setAbierta] = useState<number | null>(null)

  const saldoHoy = disponible.efectivo + disponible.nequi + disponible.daviplata + disponible.tarjeta + disponible.cajaMayor

  const proyeccion = useMemo(() => {
    const lista: Semana[] = []
    let saldo = saldoHoy
    for (let i = 0; i < semanas; i++) {
      const desde = sumarDiasFecha(hoy, i * 7)
      const hasta = sumarDiasFecha(desde, 6)
      // Lo vencido se espera en la primera semana
      const enSemana = (d: Documento) => (i === 0 ? d.fecha <= hasta : d.fecha >= desde && d.fecha <= hasta)
      const docsCobro = cobros.filter(enSemana)
      const docsPago = pagos.filter(enSemana)
      const cobrosSemana = docsCobro.reduce((s, d) => s + d.monto, 0) * (cobroProbable / 100)
      const ventas = conVentas ? promedios.ventasContadoDia * 7 : 0
      const reposicion = conVentas ? promedios.costoVentasDia * 7 : 0
      const gastos = conGastos ? promedios.gastosDia * 7 : 0
      const nomina = conGastos ? promedios.nominaDia * 7 : 0
      const pagosSemana = docsPago.reduce((s, d) => s + d.monto, 0)
      const entradas = cobrosSemana + ventas
      const salidas = pagosSemana + reposicion + gastos + nomina
      const saldoInicial = saldo
      saldo = saldo + entradas - salidas
      lista.push({
        indice: i, desde, hasta, cobros: cobrosSemana, ventas, pagos: pagosSemana, reposicion, gastos, nomina,
        entradas, salidas, neto: entradas - salidas, saldoInicial, saldoFinal: saldo, docsCobro, docsPago,
      })
    }
    return lista
  }, [saldoHoy, semanas, hoy, cobros, pagos, conVentas, conGastos, cobroProbable, promedios])

  const primeraNegativa = proyeccion.find(s => s.saldoFinal < 0)
  const minimo = proyeccion.reduce((m, s) => Math.min(m, s.saldoFinal), saldoHoy)
  const vencidoCobrar = cobros.filter(d => d.fecha < hoy).reduce((s, d) => s + d.monto, 0)
  const vencidoPagar = pagos.filter(d => d.fecha < hoy).reduce((s, d) => s + d.monto, 0)

  const Interruptor = ({ activo, onCambio, titulo, detalle }: { activo: boolean; onCambio: (v: boolean) => void; titulo: string; detalle: string }) => (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onCambio(!activo)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left ${activo ? 'border-brand-yellow/50 bg-brand-yellow/5' : 'border-linea'}`}>
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${activo ? 'bg-brand-yellow' : 'bg-steel-700'}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${activo ? 'translate-x-4' : ''}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-tinta">{titulo}</span>
        <span className="block text-xs text-steel-500">{detalle}</span>
      </span>
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Dinero de hoy */}
      <section className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-tinta">Dinero disponible hoy</p>
          <p className="font-display text-2xl font-bold text-emerald-400">{fmt(saldoHoy)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          {([['Efectivo', disponible.efectivo], ['Nequi', disponible.nequi], ['Daviplata', disponible.daviplata], ['Tarjeta', disponible.tarjeta], ['Caja mayor', disponible.cajaMayor]] as const).map(([n, v]) => (
            <div key={n} className="rounded-lg bg-velo/5 px-2.5 py-2">
              <span className="block text-steel-300">{n}</span>
              <span className="block font-display font-bold text-tinta">{fmt(v)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-steel-500">Sin contar la base de la caja menor. El efectivo es el que falta por cerrar en caja.</p>
      </section>

      {/* Supuestos */}
      <section className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-tinta">Supuestos</p>
          <div className="flex gap-1 rounded-xl bg-fondo p-1">
            {[4, 8, 12].map(n => (
              <button key={n} type="button" onClick={() => setSemanas(n)}
                className={`h-9 rounded-lg px-3 text-xs font-bold ${semanas === n ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:text-tinta'}`}>
                {n} semanas
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Interruptor activo={conVentas} onCambio={setConVentas} titulo="Ventas de contado al promedio"
            detalle={`${fmt(promedios.ventasContadoDia * 7)} por semana, menos ${fmt(promedios.costoVentasDia * 7)} para reponer la mercancía`} />
          <Interruptor activo={conGastos} onCambio={setConGastos} titulo="Gastos y nómina al promedio"
            detalle={`${fmt(promedios.gastosDia * 7)} de gastos y ${fmt(promedios.nominaDia * 7)} de nómina por semana`} />
        </div>
        <label className="block space-y-1">
          <span className="flex justify-between text-xs text-steel-300">
            <span>Parte de los créditos que de verdad se cobra a tiempo</span>
            <span className="font-bold text-tinta">{cobroProbable}%</span>
          </span>
          <input type="range" min={0} max={100} step={10} value={cobroProbable} onChange={e => setCobroProbable(Number(e.target.value))}
            className="w-full accent-accion" />
        </label>
        <p className="text-xs text-steel-500">
          Promedios de los últimos {promedios.dias} días (desde el {promedios.desde}). Lo vencido se espera en la primera semana:
          por cobrar {fmt(vencidoCobrar)}, por pagar {fmt(vencidoPagar)}.
        </p>
      </section>

      {/* Alerta */}
      {primeraNegativa ? (
        <div className="flex items-start gap-2 rounded-2xl border border-brand-red/40 bg-brand-red/10 p-3 text-sm text-sale">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            El dinero no alcanza en la semana del {corto(primeraNegativa.desde)} al {corto(primeraNegativa.hasta)}: faltarían {fmt(-primeraNegativa.saldoFinal)}.
            Conviene cobrar créditos, mover pagos a proveedores o reducir compras antes de esa fecha.
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Con estos supuestos el dinero alcanza todas las semanas. El punto más bajo es {fmt(minimo)}.
        </div>
      )}

      {/* Gráfica */}
      <section className="rounded-2xl border border-linea bg-superficie p-4">
        <p className="mb-3 text-sm font-semibold text-tinta">Saldo al final de cada semana</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={proyeccion.map(s => ({ semana: corto(s.desde), entradas: s.entradas, salidas: -s.salidas, saldo: s.saldoFinal }))}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: 'var(--suave)' }} />
            <YAxis tick={AXIS_TICK} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={50} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              formatter={(v: any, name: any) => [fmt(Math.abs(Number(v))), name === 'entradas' ? 'Entradas' : name === 'salidas' ? 'Salidas' : 'Saldo final']} />
            <ReferenceLine y={0} stroke="var(--sale)" strokeDasharray="4 4" />
            <Bar dataKey="entradas" fill="var(--entra)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="salidas" fill="var(--sale)" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="saldo" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: 'var(--chart-1)' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* Semana a semana */}
      <section className="space-y-2">
        {proyeccion.map(s => {
          const abiertaAqui = abierta === s.indice
          return (
            <div key={s.indice} className="overflow-hidden rounded-2xl border border-linea bg-superficie">
              <button type="button" onClick={() => setAbierta(abiertaAqui ? null : s.indice)} aria-expanded={abiertaAqui}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-velo/5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-tinta">{s.indice === 0 ? 'Esta semana' : `Semana ${s.indice + 1}`}</span>
                  <span className="block text-xs text-steel-500">{corto(s.desde)} al {corto(s.hasta)}</span>
                </span>
                <span className="text-right text-xs">
                  <span className="block text-emerald-400">+{fmt(s.entradas)}</span>
                  <span className="block text-sale">-{fmt(s.salidas)}</span>
                </span>
                <span className="w-28 text-right">
                  <span className={`block font-display text-base font-bold ${s.saldoFinal < 0 ? 'text-sale' : 'text-tinta'}`}>{fmt(s.saldoFinal)}</span>
                  <span className="block text-xs text-steel-500">al final</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-steel-500 transition-transform ${abiertaAqui ? 'rotate-180' : ''}`} />
              </button>
              {abiertaAqui && (
                <div className="grid gap-3 border-t border-linea p-3 text-xs md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-400">Entradas</p>
                    <Linea texto={`Créditos por cobrar${cobroProbable < 100 ? ` (${cobroProbable}%)` : ''}`} valor={s.cobros} />
                    {s.docsCobro.map(d => <Detalle key={d.id} d={d} hoy={hoy} />)}
                    {conVentas && <Linea texto="Ventas de contado estimadas" valor={s.ventas} />}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sale">Salidas</p>
                    <Linea texto="Facturas de proveedores" valor={s.pagos} />
                    {s.docsPago.map(d => <Detalle key={d.id} d={d} hoy={hoy} />)}
                    {conVentas && <Linea texto="Reposición de mercancía" valor={s.reposicion} />}
                    {conGastos && <Linea texto="Gastos" valor={s.gastos} />}
                    {conGastos && <Linea texto="Nómina" valor={s.nomina} />}
                  </div>
                  <div className="flex justify-between border-t border-linea pt-2 md:col-span-2">
                    <span className="text-steel-300">Empieza con {fmt(s.saldoInicial)} · neto {s.neto >= 0 ? '+' : ''}{fmt(s.neto)}</span>
                    <span className="font-bold text-tinta">Termina con {fmt(s.saldoFinal)}</span>
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

function Linea({ texto, valor }: { texto: string; valor: number }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-steel-300">{texto}</span>
      <span className="font-semibold text-tinta">{fmt(valor)}</span>
    </div>
  )
}

function Detalle({ d, hoy }: { d: Documento; hoy: string }) {
  return (
    <div className="flex justify-between gap-2 pl-3 text-xs text-steel-500">
      <span className="truncate">{d.nombre} · {d.referencia}{d.fecha < hoy ? ` · vencido ${d.fecha}` : ` · ${d.fecha}`}</span>
      <span>{fmt(d.monto)}</span>
    </div>
  )
}
