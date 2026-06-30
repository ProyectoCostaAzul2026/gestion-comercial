'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart,
} from 'recharts'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { Download } from 'lucide-react'

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes_anterior', label: 'Últimos 30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'año', label: 'Este año' },
  { value: 'rango', label: 'Rango personalizado' },
]

const TOP_OPCIONES = [
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
  { value: '50', label: 'Top 50' },
  { value: '100', label: 'Top 100' },
]

const COLORES_MEDIO: Record<string, string> = {
  efectivo: '#34d399',
  nequi: '#a855f7',
  daviplata: '#f87171',
  tarjeta: '#1c6cb4',
  credito: '#fbbf24',
}

const COLORES_GRAFICA = ['#ffce00', '#1c6cb4', '#34d399', '#a855f7', '#f87171', '#fbbf24']

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', nequi: 'Nequi',
  daviplata: 'Daviplata', tarjeta: 'Tarjeta', credito: 'Crédito',
}

const MEDIOS_ORDEN = ['efectivo', 'nequi', 'daviplata', 'tarjeta', 'credito']

// Estilos comunes para los ejes/grids de recharts sobre fondo oscuro
const AXIS_TICK = { fontSize: 9, fill: '#9aa7b0' }
const GRID_STROKE = 'rgba(255,255,255,0.08)'
const TOOLTIP_STYLE = { backgroundColor: '#1a2430', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f4f6f8', fontSize: 12 }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }
function pct(n: number) { return `${n.toFixed(1)}%` }

function KPICard({ label, valor, sub, color }: {
  label: string; valor: string; sub?: string; color?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${color ?? 'text-white'}`}>{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-steel-500">{sub}</p>}
    </div>
  )
}

function exportarTopPDF(
  titulo: string, columnas: string[], filas: (string | number)[][],
  desde: string, hasta: string
) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(titulo, 14, 15)
  doc.setFontSize(9)
  doc.text(`Período: ${desde} al ${hasta}`, 14, 21)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 26)
  autoTable(doc, {
    startY: 32, head: [columnas],
    body: filas.map(f => f.map(String)),
    styles: { fontSize: 8 }, headStyles: { fillColor: [24, 34, 43] },
  })
  doc.save(`${titulo.toLowerCase().replace(/ /g, '-')}-${desde}-${hasta}.pdf`)
}

interface ProductoTop {
  producto_id: string; codigo: string; nombre: string
  marca: string | null; unidad_medida: string | null
  cantidad: number; ingresos: number; tickets: number; costo: number
  pct_ganancia: number; unidades_por_dia: number
}

interface FlujoCajaItem {
  periodo: string; ingresos: number; egresos: number; utilidad: number
}

export function ReportesPanel({
  periodo, desde, hasta, diasPeriodo,
  kpisPeriodo, mediosPeriodoStats,
  graficaFlujoCaja, graficaMedios, graficaHoras, graficaEmpleados,
  topProductosData, inventario, deudaProveedores, nominaPeriodo,
}: {
  periodo: string; desde: string; hasta: string; diasPeriodo: number
  kpisPeriodo: {
    totalIngresos: number; totalCMV: number; totalGastos: number
    totalNominas: number; gananciaBruta: number; resultado: number; margenBruto: number
    numVentas: number; ventaPromedioDiaria: number
    ticketPromedioPeriodo: number; ticketsPromedioDiarios: number
  }
  mediosPeriodoStats: Record<string, { total: number; count: number }>
  graficaFlujoCaja: FlujoCajaItem[]
  graficaMedios: { metodo: string; total: number }[]
  graficaHoras: { hora: string; total: number }[]
  graficaEmpleados: { nombre: string; total: number; tickets: number }[]
  topProductosData: ProductoTop[]
  inventario: { valorCosto: number; valorVenta: number }
  deudaProveedores: { total: number; top5: { nombre: string; deuda: number }[] }
  nominaPeriodo: { nombre: string; total: number; dias: number }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [topN, setTopN] = useState(10)

  const actualizarURL = (params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    router.push(`${pathname}?${p.toString()}`)
  }

  const handlePeriodo = (v: string) => {
    if (!v) return
    if (v === 'rango') { actualizarURL({ periodo: v }); return }
    actualizarURL({ periodo: v, desde: '', hasta: '' })
  }

  const topPorCantidad = useMemo(() =>
    [...topProductosData].sort((a, b) => b.cantidad - a.cantidad).slice(0, topN),
    [topProductosData, topN])

  const topPorIngresos = useMemo(() =>
    [...topProductosData].sort((a, b) => b.ingresos - a.ingresos).slice(0, topN),
    [topProductosData, topN])

  const topPorFrecuencia = useMemo(() =>
    [...topProductosData].sort((a, b) => b.unidades_por_dia - a.unidades_por_dia).slice(0, topN),
    [topProductosData, topN])

  // Datos para gráfico estado de resultados
  const datosEstadoResultados = [
    { nombre: 'Ingresos', valor: kpisPeriodo.totalIngresos, color: '#34d399' },
    { nombre: 'CMV', valor: kpisPeriodo.totalCMV, color: '#e8453f' },
    { nombre: 'Gastos', valor: kpisPeriodo.totalGastos, color: '#f97316' },
    { nombre: 'Nóminas', valor: kpisPeriodo.totalNominas, color: '#fbbf24' },
    { nombre: 'Gan. bruta', valor: kpisPeriodo.gananciaBruta, color: kpisPeriodo.gananciaBruta >= 0 ? '#16a34a' : '#dc2626' },
    { nombre: 'Resultado', valor: kpisPeriodo.resultado, color: kpisPeriodo.resultado >= 0 ? '#ffce00' : '#dc2626' },
  ]

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header diagonal */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <h1 className="font-display text-3xl font-bold text-brand-yellow">Reportes</h1>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {/* ── SELECTOR DE PERÍODO ── */}
      <section className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Período de análisis</label>
            <Select items={PERIODOS} onValueChange={v => v && handlePeriodo(v)} value={periodo}>
              <SelectTrigger className="w-52 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {periodo === 'rango' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Desde</label>
                <Input type="date" value={desde}
                  onChange={e => actualizarURL({ desde: e.target.value, periodo: 'rango' })} className="w-36 border-white/10 bg-[#1a2430] text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Hasta</label>
                <Input type="date" value={hasta}
                  onChange={e => actualizarURL({ hasta: e.target.value, periodo: 'rango' })} className="w-36 border-white/10 bg-[#1a2430] text-white" />
              </div>
            </>
          )}
          <p className="self-end pb-2 text-xs text-steel-500">{desde} — {hasta} ({diasPeriodo} días)</p>
        </div>
      </section>

      {/* ── KPIs PERÍODO ── */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Período: {desde} — {hasta}
        </h2>

        {/* Ventas y tickets */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard label="Ventas totales" valor={fmt(kpisPeriodo.totalIngresos)}
            sub={`Promedio/día: ${fmt(kpisPeriodo.ventaPromedioDiaria)}`} color="text-emerald-400" />
          <KPICard label="Venta promedio por ticket" valor={fmt(kpisPeriodo.ticketPromedioPeriodo)} />
          <KPICard label="Tickets totales" valor={String(kpisPeriodo.numVentas)}
            sub={`Promedio/día: ${kpisPeriodo.ticketsPromedioDiarios.toFixed(1)}`} />
          <KPICard label="Nóminas período" valor={fmt(kpisPeriodo.totalNominas)}
            color="text-amber-400" />
        </div>

        {/* Saldos por medio período */}
        {Object.keys(mediosPeriodoStats).length > 0 && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
            <p className="text-xs font-medium text-steel-300">Ingresos por medio de pago — período</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {MEDIOS_ORDEN.filter(m => mediosPeriodoStats[m]).map(medio => {
                const stat = mediosPeriodoStats[medio]
                return (
                  <div key={medio} className="rounded-xl border border-white/10 bg-[#1a2430] p-3 text-center">
                    <p className="text-xs font-medium text-steel-300">{METODO_LABEL[medio]}</p>
                    <p className="mt-1 font-display font-bold text-white">{fmt(stat.total)}</p>
                    <p className="mt-0.5 text-xs text-steel-500">
                      Prom: {stat.count > 0 ? fmt(stat.total / stat.count) : '$0'}/tx
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Estado de resultados */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <p className="text-xs font-medium text-steel-300">Estado de resultados</p>

          {/* Tabla */}
          <div className="space-y-1">
            <div className="flex items-center justify-between border-b border-white/8 py-1.5">
              <span className="text-sm font-semibold text-white">Ingresos</span>
              <span className="font-display font-bold text-emerald-400">{fmt(kpisPeriodo.totalIngresos)}</span>
            </div>
            <div className="flex items-center justify-between py-1 pl-4">
              <span className="text-sm text-steel-300">— CMV</span>
              <span className="text-sm text-brand-red">({fmt(kpisPeriodo.totalCMV)})</span>
            </div>
            <div className="flex items-center justify-between py-1 pl-4">
              <span className="text-sm text-steel-300">— Gastos</span>
              <span className="text-sm text-brand-red">({fmt(kpisPeriodo.totalGastos)})</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 py-1 pl-4">
              <span className="text-sm text-steel-300">— Nóminas</span>
              <span className="text-sm text-brand-red">({fmt(kpisPeriodo.totalNominas)})</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 py-1.5">
              <span className="text-sm font-medium text-steel-300">= Ganancia bruta</span>
              <span className={`font-display font-bold ${kpisPeriodo.gananciaBruta >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                {fmt(kpisPeriodo.gananciaBruta)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-xl border-2 border-brand-yellow px-3 py-2">
              <div>
                <span className="text-base font-bold text-white">= Resultado del período</span>
                <p className="text-xs text-steel-500">Margen bruto: {pct(kpisPeriodo.margenBruto)}</p>
              </div>
              <p className={`font-display text-2xl font-black ${kpisPeriodo.resultado >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                {fmt(kpisPeriodo.resultado)}
              </p>
            </div>
          </div>

          {/* Gráfico estado de resultados — barras horizontales con eje central en 0 */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                { nombre: 'Ingresos', valor: kpisPeriodo.totalIngresos },
                { nombre: 'CMV', valor: -kpisPeriodo.totalCMV },
                { nombre: 'Nóminas', valor: -kpisPeriodo.totalNominas },
                { nombre: 'Gastos', valor: -kpisPeriodo.totalGastos },
                { nombre: 'Gan. Bruta', valor: kpisPeriodo.gananciaBruta },
                { nombre: 'Resultado', valor: kpisPeriodo.resultado },
              ]}
              layout="vertical"
              margin={{ top: 5, right: 80, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK}
                tickFormatter={v => `$${(Math.abs(v) / 1000000).toFixed(1)}M`}
                domain={['auto', 'auto']} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#9aa7b0' }} width={75} />
              <Tooltip formatter={(v: any) => [fmt(Math.abs(Number(v))), '']} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="valor" radius={[0, 3, 3, 0]}>
                {[
                  '#1c6cb4',   // Ingresos — azul de marca
                  '#5b6b76',   // CMV — acero
                  '#a855f7',   // Nóminas — morado
                  '#e8453f',   // Gastos — rojo
                  kpisPeriodo.gananciaBruta >= 0 ? '#34d399' : '#ea580c',  // Gan. Bruta
                  kpisPeriodo.resultado >= 0 ? '#ffce00' : '#c2410c',       // Resultado
                ].map((color, i) => <Cell key={i} fill={color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── FLUJO DE CAJA ── */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Análisis de ventas
        </h2>

        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <p className="mb-1 text-sm font-semibold text-white">Flujo de caja</p>
          <p className="mb-4 text-xs text-steel-500">
            {diasPeriodo > 30 ? 'Agrupado por mes' : 'Por día'}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={graficaFlujoCaja.map(d => ({
                ...d,
                egresos: -Math.abs(d.egresos), // negativos para que vayan hacia abajo
              }))}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#9aa7b0' }} />
              <YAxis tick={AXIS_TICK} tickFormatter={v => `$${(Math.abs(v) / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                formatter={(v: any, name: any) => [
                  fmt(Math.abs(Number(v))),
                  name === 'ingresos' ? 'Ingresos' : name === 'egresos' ? 'Egresos' : 'Utilidad'
                ]}
              />
              {/* Barras apiladas en el mismo eje: ingresos arriba (verde), egresos abajo (rojo) */}
              <Bar dataKey="ingresos" fill="#34d399" radius={[3, 3, 0, 0]} name="ingresos" />
              <Bar dataKey="egresos" fill="#e8453f" radius={[3, 3, 0, 0]} name="egresos" />
              <Line type="monotone" dataKey="utilidad" stroke="#ffce00" strokeWidth={2}
                dot={{ fill: '#ffce00', r: 4, strokeWidth: 2, stroke: '#111820' }} name="utilidad" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Medios de pago */}
          <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
            <p className="mb-4 text-sm font-semibold text-white">Por medio de pago</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={graficaMedios} dataKey="total" nameKey="metodo"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }: any) =>
                    `${METODO_LABEL[name] ?? name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  stroke="#111820"
                >
                  {graficaMedios.map((entry, i) => (
                    <Cell key={entry.metodo}
                      fill={COLORES_MEDIO[entry.metodo] ?? COLORES_GRAFICA[i % COLORES_GRAFICA.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Ventas por hora */}
          <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
            <p className="mb-4 text-sm font-semibold text-white">Ventas por hora del día</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={graficaHoras} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="hora" tick={AXIS_TICK} />
                <YAxis
                  tick={AXIS_TICK}
                  tickFormatter={v => `$${(Math.abs(v) / 1000).toFixed(0)}K`}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Ventas']} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="total" fill="#1c6cb4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas por empleado */}
        {graficaEmpleados.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
            <p className="mb-4 text-sm font-semibold text-white">Ventas por empleado</p>
            <ResponsiveContainer width="100%" height={Math.max(120, graficaEmpleados.length * 40)}>
              <BarChart data={graficaEmpleados} layout="vertical"
                margin={{ top: 5, right: 60, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#9aa7b0' }} width={100} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(v: any, name: any) => [
                    name === 'total' ? fmt(Number(v)) : v,
                    name === 'total' ? 'Ventas' : 'Tickets'
                  ]}
                />
                <Bar dataKey="total" fill="#ffce00" radius={[0, 3, 3, 0]}>
                  {graficaEmpleados.map((_, i) => (
                    <Cell key={i} fill={COLORES_GRAFICA[i % COLORES_GRAFICA.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {graficaEmpleados.map(e => (
                <div key={e.nombre} className="flex justify-between text-xs text-steel-300">
                  <span>{e.nombre}</span>
                  <span>{e.tickets} tickets · prom {fmt(e.tickets > 0 ? e.total / e.tickets : 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── TOP PRODUCTOS ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Análisis de productos
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-steel-300">Mostrar:</label>
            <Select items={TOP_OPCIONES} onValueChange={v => v && setTopN(parseInt(v))} value={String(topN)}>
              <SelectTrigger className="h-8 w-28 border-white/10 bg-[#1a2430] text-xs text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOP_OPCIONES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Top por cantidad */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="font-semibold text-white">Top {topN} — Más vendidos por cantidad</p>
            <Button variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() =>
              exportarTopPDF(`Top ${topN} Más Vendidos`,
                ['#', 'Código', 'Nombre', 'Marca', 'Medida', 'Cantidad', 'Ingreso', '% Ganancia', 'N° Tickets'],
                topPorCantidad.map((p, i) => [
                  i + 1, p.codigo, p.nombre, p.marca ?? '—', p.unidad_medida ?? '—',
                  p.cantidad, fmt(p.ingresos), pct(p.pct_ganancia), p.tickets
                ]), desde, hasta)}>
              <Download className="mr-1 h-4 w-4" />PDF
            </Button>
          </div>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
              <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">% Gan.</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPorCantidad.map((p, i) => (
                  <TableRow key={p.producto_id} className="border-white/8 hover:bg-white/5">
                    <TableCell className="text-xs text-steel-500">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo}</TableCell>
                    <TableCell className="text-xs font-medium text-white">{p.nombre}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                    <TableCell className="text-right font-display font-bold text-white">{p.cantidad}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmt(p.ingresos)}</TableCell>
                    <TableCell className={`text-right text-xs ${p.pct_ganancia >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                      {pct(p.pct_ganancia)}
                    </TableCell>
                    <TableCell className="text-right text-steel-300">{p.tickets}</TableCell>
                  </TableRow>
                ))}
                {topPorCantidad.length === 0 && (
                  <TableRow className="border-white/8"><TableCell colSpan={9} className="py-6 text-center text-steel-500">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Top por ingresos */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="font-semibold text-white">Top {topN} — Mayor ingreso generado</p>
            <Button variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() =>
              exportarTopPDF(`Top ${topN} Mayor Ingreso`,
                ['#', 'Código', 'Nombre', 'Marca', 'Medida', 'Ingreso', '% Ganancia', 'Margen bruto'],
                topPorIngresos.map((p, i) => [
                  i + 1, p.codigo, p.nombre, p.marca ?? '—', p.unidad_medida ?? '—',
                  fmt(p.ingresos), pct(p.pct_ganancia), fmt(p.ingresos - p.costo)
                ]), desde, hasta)}>
              <Download className="mr-1 h-4 w-4" />PDF
            </Button>
          </div>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
              <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">% Gan.</TableHead>
                  <TableHead className="text-right">Margen bruto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPorIngresos.map((p, i) => {
                  const margen = p.ingresos - p.costo
                  return (
                    <TableRow key={p.producto_id} className="border-white/8 hover:bg-white/5">
                      <TableCell className="text-xs text-steel-500">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo}</TableCell>
                      <TableCell className="text-xs font-medium text-white">{p.nombre}</TableCell>
                      <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                      <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                      <TableCell className="text-right font-display font-bold text-emerald-400">{fmt(p.ingresos)}</TableCell>
                      <TableCell className={`text-right text-xs ${p.pct_ganancia >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                        {pct(p.pct_ganancia)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${margen >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                        {fmt(margen)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {topPorIngresos.length === 0 && (
                  <TableRow className="border-white/8"><TableCell colSpan={8} className="py-6 text-center text-steel-500">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Top por rotación */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="font-semibold text-white">Top {topN} — Mayor rotación</p>
            <Button variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() =>
              exportarTopPDF(`Top ${topN} Mayor Rotación`,
                ['#', 'Código', 'Nombre', 'Marca', 'Medida', 'Ingreso', '% Ganancia', 'Und/día'],
                topPorFrecuencia.map((p, i) => [
                  i + 1, p.codigo, p.nombre, p.marca ?? '—', p.unidad_medida ?? '—',
                  fmt(p.ingresos), pct(p.pct_ganancia), p.unidades_por_dia.toFixed(2)
                ]), desde, hasta)}>
              <Download className="mr-1 h-4 w-4" />PDF
            </Button>
          </div>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
              <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">% Gan.</TableHead>
                  <TableHead className="text-right">Und/día</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPorFrecuencia.map((p, i) => (
                  <TableRow key={p.producto_id} className="border-white/8 hover:bg-white/5">
                    <TableCell className="text-xs text-steel-500">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo}</TableCell>
                    <TableCell className="text-xs font-medium text-white">{p.nombre}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmt(p.ingresos)}</TableCell>
                    <TableCell className={`text-right text-xs ${p.pct_ganancia >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                      {pct(p.pct_ganancia)}
                    </TableCell>
                    <TableCell className="text-right font-display font-bold text-white">{p.unidades_por_dia.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {topPorFrecuencia.length === 0 && (
                  <TableRow className="border-white/8"><TableCell colSpan={8} className="py-6 text-center text-steel-500">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── INVENTARIO Y PROVEEDORES ── */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Inventario y proveedores
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <KPICard label="Valor inventario a costo"
            valor={fmt(inventario.valorCosto)} sub="Stock actual × precio de compra" color="text-brand-blue" />
          <KPICard label="Valor inventario a precio de venta"
            valor={fmt(inventario.valorVenta)} sub="Stock actual × precio de venta" color="text-emerald-400" />
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">Deuda con proveedores</p>
            <span className="font-display text-lg font-bold text-brand-red">{fmt(deudaProveedores.total)}</span>
          </div>
          {deudaProveedores.top5.length > 0 && (
            <div className="space-y-1">
              <p className="mb-2 text-xs text-steel-300">Top 5 con mayor deuda</p>
              {deudaProveedores.top5.map(d => (
                <div key={d.nombre} className="flex justify-between border-b border-white/8 pb-1 text-sm last:border-0">
                  <span className="text-steel-300">{d.nombre}</span>
                  <span className="font-medium text-brand-red">{fmt(d.deuda)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── NÓMINA ── */}
      {nominaPeriodo.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Nómina del período
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Días pagados</TableHead>
                    <TableHead className="text-right">Total pagado</TableHead>
                    <TableHead className="text-right">Promedio/día</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...nominaPeriodo].sort((a, b) => b.total - a.total).map(n => (
                    <TableRow key={n.nombre} className="border-white/8 hover:bg-white/5">
                      <TableCell className="text-xs font-medium text-white">{n.nombre}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">{n.dias}</TableCell>
                      <TableCell className="text-right font-display font-bold text-white">{fmt(n.total)}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">
                        {n.dias > 0 ? fmt(n.total / n.dias) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-steel-700 hover:bg-steel-700">
                    <TableCell className="font-bold text-brand-yellow">Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-display font-bold text-brand-yellow">
                      {fmt(nominaPeriodo.reduce((s, n) => s + n.total, 0))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}