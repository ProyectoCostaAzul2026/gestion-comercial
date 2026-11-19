'use client'

import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart,
} from 'recharts'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import Link from 'next/link'
import { Download, Banknote, Smartphone, CreditCard, Coins, Calculator, FileSpreadsheet, TrendingUp, Wallet, PackageX } from 'lucide-react'
import { SelectorPeriodo, Variacion } from './selector-periodo'
import type { Periodo } from '@/lib/periodos'
import type { ResumenPeriodo } from '@/lib/reportes-servidor'

const TOP_OPCIONES = [
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
  { value: '50', label: 'Top 50' },
  { value: '100', label: 'Top 100' },
]

const COLORES_MEDIO: Record<string, string> = {
  efectivo: 'var(--entra)',
  nequi: 'var(--violeta)',
  daviplata: 'var(--sale)',
  tarjeta: 'var(--chart-2)',
  credito: 'var(--aviso)',
}

const COLORES_GRAFICA = ['var(--chart-1)', 'var(--chart-2)', 'var(--entra)', 'var(--violeta)', 'var(--sale)', 'var(--aviso)']

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', nequi: 'Nequi',
  daviplata: 'Daviplata', tarjeta: 'Tarjeta', credito: 'Crédito',
}

const MEDIOS_ORDEN = ['efectivo', 'nequi', 'daviplata', 'tarjeta', 'credito']

// Ícono y color por medio — mismo lenguaje visual que las tarjetas de alerta del dashboard
const MEDIO_ESTILO: Record<string, { icono: any; texto: string; borde: string; fondo: string; anillo: string }> = {
  efectivo:  { icono: Banknote,   texto: 'text-emerald-400', borde: 'border-emerald-500/30', fondo: 'bg-emerald-500/10', anillo: 'bg-emerald-500/20' },
  nequi:     { icono: Smartphone, texto: 'text-purple-400',  borde: 'border-purple-500/30',  fondo: 'bg-purple-500/10',  anillo: 'bg-purple-500/20' },
  daviplata: { icono: Smartphone, texto: 'text-red-400',     borde: 'border-red-500/30',     fondo: 'bg-red-500/10',     anillo: 'bg-red-500/20' },
  tarjeta:   { icono: CreditCard, texto: 'text-enlace',  borde: 'border-brand-blue/30',  fondo: 'bg-brand-blue/10',  anillo: 'bg-brand-blue/20' },
  credito:   { icono: Coins,      texto: 'text-amber-400',   borde: 'border-amber-500/30',   fondo: 'bg-amber-500/10',   anillo: 'bg-amber-500/20' },
}

// Estilos comunes para los ejes/grids de recharts sobre fondo oscuro
const AXIS_TICK = { fontSize: 9, fill: 'var(--suave)' }
const GRID_STROKE = 'rgba(255,255,255,0.08)'
const TOOLTIP_STYLE = { backgroundColor: 'var(--sup2)', border: '1px solid var(--linea)', borderRadius: 12, color: 'var(--tinta)', fontSize: 12 }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }
function pct(n: number) { return `${n.toFixed(1)}%` }

type ModoGrafico = 'valor' | 'ticket' | 'valorTicket'
const ETIQUETA_MODO: Record<ModoGrafico, string> = { valor: 'Valor', ticket: 'Ticket', valorTicket: 'Valor/Ticket' }
function SelectorModoGrafico({ modo, onChange }: { modo: ModoGrafico; onChange: (m: ModoGrafico) => void }) {
  return (
    <div className="mb-3 flex gap-1.5">
      {(['valor', 'ticket', 'valorTicket'] as ModoGrafico[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
            modo === m
              ? 'border-brand-yellow bg-brand-yellow/15 text-brand-yellow'
              : 'border-linea text-steel-300 hover:border-linea-fuerte'
          }`}
        >
          {ETIQUETA_MODO[m]}
        </button>
      ))}
    </div>
  )
}

function KPICard({ label, valor, sub, color, comparacion }: {
  label: string; valor: string; sub?: string; color?: string
  /** Variación contra el periodo anterior */
  comparacion?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-linea bg-superficie p-4">
      <p className="text-sm font-semibold text-suave">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${color ?? 'text-tinta'}`}>{valor}</p>
      {comparacion && <div className="mt-0.5">{comparacion}</div>}
      {sub && <p className="mt-0.5 text-xs text-steel-500">{sub}</p>}
    </div>
  )
}

interface FilaUtilidad {
  /** Tarjeta de Inventario de esta categoría o familia */
  href?: string | null
  nombre: string; ingresos: number; costo: number; utilidad: number; margen: number; unidades: number; productos: number
}

/** Utilidad real (ventas menos costo con IVA) agrupada por categoría o por familia */
function TablaUtilidad({ porCategoria, porFamilia, desde, hasta }: {
  porCategoria: FilaUtilidad[]; porFamilia: FilaUtilidad[]; desde: string; hasta: string
}) {
  const [vista, setVista] = useState<'categoria' | 'familia'>('categoria')
  const [verTodo, setVerTodo] = useState(false)
  const filas = vista === 'categoria' ? porCategoria : porFamilia
  const mostradas = verTodo ? filas : filas.slice(0, 15)
  const total = filas.reduce((t, f) => ({ ingresos: t.ingresos + f.ingresos, costo: t.costo + f.costo }), { ingresos: 0, costo: 0 })
  return (
    <div className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-tinta">Utilidad por {vista === 'categoria' ? 'categoría' : 'familia'}</p>
          <p className="text-xs text-steel-500">Ventas menos costo (con el IVA pagado al proveedor). Ordenado por utilidad.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-fondo p-1">
            {(['categoria', 'familia'] as const).map(v => (
              <button key={v} type="button" onClick={() => { setVista(v); setVerTodo(false) }}
                className={`h-9 rounded-lg px-3 text-xs font-bold ${vista === v ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:text-tinta'}`}>
                {v === 'categoria' ? 'Categoría' : 'Familia'}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="border-linea text-steel-300 hover:text-tinta"
            onClick={() => exportarTopPDF(`Utilidad por ${vista === 'categoria' ? 'categoria' : 'familia'}`,
              ['Nombre', 'Unidades', 'Ventas', 'Costo', 'Utilidad', 'Margen'],
              filas.map(f => [f.nombre, Math.round(f.unidades * 100) / 100, fmt(f.ingresos), fmt(f.costo), fmt(f.utilidad), pct(f.margen)]),
              desde, hasta)}>
            <Download className="mr-1 h-3.5 w-3.5" />PDF
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
            <TableHead>{vista === 'categoria' ? 'Categoría' : 'Familia'}</TableHead>
            <TableHead className="text-right">Ventas</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="text-right">Utilidad</TableHead>
            <TableHead className="text-right">Margen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mostradas.map(f => (
            <TableRow key={f.nombre} className="border-linea hover:bg-velo/5">
              <TableCell className="text-sm font-medium text-tinta">
                {f.href ? <Link href={f.href} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{f.nombre}</Link> : f.nombre}
                <span className="block text-xs font-normal text-steel-500">{f.productos} producto{f.productos === 1 ? '' : 's'}</span>
              </TableCell>
              <TableCell className="text-right text-xs text-steel-300">{fmt(f.ingresos)}</TableCell>
              <TableCell className="text-right text-xs text-steel-300">{fmt(f.costo)}</TableCell>
              <TableCell className={`text-right font-display font-bold ${f.utilidad >= 0 ? 'text-emerald-400' : 'text-sale'}`}>{fmt(f.utilidad)}</TableCell>
              <TableCell className={`text-right text-xs font-semibold ${f.margen >= 30 ? 'text-emerald-400' : f.margen >= 15 ? 'text-amber-400' : 'text-sale'}`}>{pct(f.margen)}</TableCell>
            </TableRow>
          ))}
          {filas.length === 0 && (
            <TableRow className="border-linea"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin ventas en el periodo</TableCell></TableRow>
          )}
          {filas.length > 0 && (
            <TableRow className="bg-superficie-2 hover:bg-superficie-2">
              <TableCell className="font-bold text-brand-yellow">Total</TableCell>
              <TableCell className="text-right text-xs font-bold text-tinta">{fmt(total.ingresos)}</TableCell>
              <TableCell className="text-right text-xs font-bold text-tinta">{fmt(total.costo)}</TableCell>
              <TableCell className="text-right font-display font-bold text-brand-yellow">{fmt(total.ingresos - total.costo)}</TableCell>
              <TableCell className="text-right text-xs font-bold text-tinta">{total.ingresos > 0 ? pct(((total.ingresos - total.costo) / total.ingresos) * 100) : '—'}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {filas.length > 15 && (
        <button type="button" onClick={() => setVerTodo(v => !v)} className="w-full text-center text-xs font-medium text-enlace hover:underline">
          {verTodo ? 'Ver menos' : `Ver las ${filas.length}`}
        </button>
      )}
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
  periodo, hoy, anterior, desde, hasta, diasPeriodo,
  kpisPeriodo, mediosPeriodoStats,
  graficaFlujoCaja, graficaMedios, graficaHoras, graficaDiasSemana, graficaEmpleados,
  topProductosData, inventario, deudaProveedores, nominaPeriodo,
  descuentos, utilidadPorCategoria, utilidadPorFamilia,
}: {
  periodo: Periodo; hoy: string
  anterior: { desde: string; hasta: string; etiqueta: string; resumen: ResumenPeriodo }
  desde: string; hasta: string; diasPeriodo: number
  descuentos: { total: number; ventasConDescuento: number; serie: { periodo: string; descuentos: number; ventas: number; tickets: number }[] }
  utilidadPorCategoria: FilaUtilidad[]
  utilidadPorFamilia: FilaUtilidad[]
  kpisPeriodo: {
    totalIngresos: number; totalCMV: number; totalGastos: number
    totalNominas: number; gananciaBruta: number; resultado: number; margenBruto: number
    numVentas: number; ventaPromedioDiaria: number
    ticketPromedioPeriodo: number; ticketsPromedioDiarios: number
  }
  mediosPeriodoStats: Record<string, { total: number; count: number }>
  graficaFlujoCaja: FlujoCajaItem[]
  graficaMedios: { metodo: string; total: number }[]
  graficaHoras: { hora: string; total: number; tickets: number; valorPorTicket: number }[]
  graficaDiasSemana: { dia: string; promedio: number; ticketsPromedio: number; valorPorTicket: number }[]
  graficaEmpleados: { nombre: string; total: number; tickets: number }[]
  topProductosData: ProductoTop[]
  inventario: { valorCosto: number; valorVenta: number }
  deudaProveedores: { total: number; top5: { nombre: string; deuda: number }[] }
  nominaPeriodo: { nombre: string; total: number; dias: number }[]
}) {
  const [topN, setTopN] = useState(10)
  const [modoHoras, setModoHoras] = useState<'valor' | 'ticket' | 'valorTicket'>('valor')
  const [modoDias, setModoDias] = useState<'valor' | 'ticket' | 'valorTicket'>('valor')
  const ant = anterior.resumen

  const topPorCantidad = useMemo(() =>
    [...topProductosData].sort((a, b) => b.cantidad - a.cantidad).slice(0, topN),
    [topProductosData, topN])

  const topPorIngresos = useMemo(() =>
    [...topProductosData].sort((a, b) => b.ingresos - a.ingresos).slice(0, topN),
    [topProductosData, topN])

  const topPorFrecuencia = useMemo(() =>
    [...topProductosData].sort((a, b) => b.unidades_por_dia - a.unidades_por_dia).slice(0, topN),
    [topProductosData, topN])

  const granTotalMediosPeriodo = MEDIOS_ORDEN.reduce(
    (s, m) => s + (mediosPeriodoStats[m]?.total ?? 0), 0)
  const totalTxMediosPeriodo = MEDIOS_ORDEN.reduce(
    (s, m) => s + (mediosPeriodoStats[m]?.count ?? 0), 0)

  const datosHorasMostrados = useMemo(() => graficaHoras.map(h => ({
    hora: h.hora,
    valor: modoHoras === 'valor' ? h.total : modoHoras === 'ticket' ? h.tickets : h.valorPorTicket,
  })), [graficaHoras, modoHoras])

  const datosDiasMostrados = useMemo(() => graficaDiasSemana.map(d => ({
    dia: d.dia,
    valor: modoDias === 'valor' ? d.promedio : modoDias === 'ticket' ? d.ticketsPromedio : d.valorPorTicket,
  })), [graficaDiasSemana, modoDias])

  // Datos para gráfico estado de resultados
  const datosEstadoResultados = [
    { nombre: 'Ingresos', valor: kpisPeriodo.totalIngresos, color: 'var(--entra)' },
    { nombre: 'CMV', valor: kpisPeriodo.totalCMV, color: 'var(--sale)' },
    { nombre: 'Gastos', valor: kpisPeriodo.totalGastos, color: 'var(--aviso)' },
    { nombre: 'Nóminas', valor: kpisPeriodo.totalNominas, color: 'var(--aviso)' },
    { nombre: 'Gan. bruta', valor: kpisPeriodo.gananciaBruta, color: kpisPeriodo.gananciaBruta >= 0 ? 'var(--entra)' : 'var(--sale)' },
    { nombre: 'Resultado', valor: kpisPeriodo.resultado, color: kpisPeriodo.resultado >= 0 ? 'var(--chart-1)' : 'var(--sale)' },
  ]

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header diagonal */}
      <div className="relative py-1">
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">Reportes</h1>
      </div>

      {/* ── SELECTOR DE PERÍODO ── */}
      <SelectorPeriodo periodo={periodo} hoy={hoy} anterior={anterior.etiqueta} />

      {/* Vistas de análisis y exportación */}
      <nav aria-label="Más reportes" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { href: '/dashboard/reportes/flujo', icono: TrendingUp, titulo: 'Flujo de caja proyectado', sub: 'Próximas semanas' },
          { href: '/dashboard/reportes/cartera', icono: Wallet, titulo: 'Cartera por edades', sub: 'Clientes y proveedores' },
          { href: '/dashboard/reportes/sin-movimiento', icono: PackageX, titulo: 'Sin movimiento', sub: 'Dinero quieto en stock' },
          { href: `/dashboard/contabilidad/exportar?desde=${desde}&hasta=${hasta}`, icono: FileSpreadsheet, titulo: 'Excel para el contador', sub: 'Del periodo elegido', descarga: true },
        ].map(v => {
          const Icono = v.icono
          const clase = 'flex min-h-16 items-center gap-3 rounded-2xl border border-linea bg-superficie p-3 transition-colors hover:border-brand-yellow/50'
          const contenido = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/10 text-brand-yellow"><Icono className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-tinta">{v.titulo}</span>
                <span className="block text-xs text-steel-500">{v.sub}</span>
              </span>
            </>
          )
          return v.descarga
            ? <a key={v.href} href={v.href} className={clase}>{contenido}</a>
            : <Link key={v.href} href={v.href} className={clase}>{contenido}</Link>
        })}
      </nav>

      {/* ── KPIs PERÍODO ── */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Resumen del periodo
        </h2>

        {/* Ventas y tickets */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard label="Ventas totales" valor={fmt(kpisPeriodo.totalIngresos)}
            comparacion={<Variacion actual={kpisPeriodo.totalIngresos} anterior={ant.ingresos} compacto />}
            sub={`Promedio/día: ${fmt(kpisPeriodo.ventaPromedioDiaria)}`} color="text-emerald-400" />
          <KPICard label="Venta promedio por ticket" valor={fmt(kpisPeriodo.ticketPromedioPeriodo)}
            comparacion={<Variacion actual={kpisPeriodo.ticketPromedioPeriodo} anterior={ant.ticketPromedio} compacto />} />
          <KPICard label="Tickets totales" valor={String(kpisPeriodo.numVentas)}
            comparacion={<Variacion actual={kpisPeriodo.numVentas} anterior={ant.numVentas} compacto />}
            sub={`Promedio/día: ${kpisPeriodo.ticketsPromedioDiarios.toFixed(1)}`} />
          <KPICard label="Resultado" valor={fmt(kpisPeriodo.resultado)}
            comparacion={<Variacion actual={kpisPeriodo.resultado} anterior={ant.resultado} compacto />}
            color={kpisPeriodo.resultado >= 0 ? 'text-brand-yellow' : 'text-sale'} />
        </div>

        {/* Saldos por medio período */}
        {Object.keys(mediosPeriodoStats).length > 0 && (
          <div className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
            <p className="text-xs font-medium text-steel-300">Ingresos por medio de pago — período</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {MEDIOS_ORDEN.filter(m => mediosPeriodoStats[m]).map(medio => {
                const stat = mediosPeriodoStats[medio]
                const est = MEDIO_ESTILO[medio]
                const Icono = est.icono
                return (
                  <div key={medio} className={`rounded-xl border ${est.borde} ${est.fondo} p-3 text-center`}>
                    <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${est.anillo} ${est.texto}`}>
                      <Icono className="size-4" />
                    </span>
                    <p className="text-xs font-medium text-steel-300">{METODO_LABEL[medio]}</p>
                    <p className={`mt-1 font-display font-bold ${est.texto}`}>{fmt(stat.total)}</p>
                    <p className="mt-0.5 text-xs text-steel-500">
                      Prom: {stat.count > 0 ? fmt(stat.total / stat.count) : '$0'}/tx
                    </p>
                  </div>
                )
              })}
              <div className="rounded-xl border-2 border-brand-yellow/40 bg-brand-yellow/10 p-3 text-center">
                <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-yellow">
                  <Calculator className="size-4" />
                </span>
                <p className="text-xs font-medium text-steel-300">Gran Total</p>
                <p className="mt-1 font-display font-bold text-brand-yellow">{fmt(granTotalMediosPeriodo)}</p>
                <p className="mt-0.5 text-xs text-steel-500">
                  Prom: {totalTxMediosPeriodo > 0 ? fmt(granTotalMediosPeriodo / totalTxMediosPeriodo) : '$0'}/tx
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estado de resultados */}
        <div className="space-y-4 rounded-2xl border border-linea bg-superficie p-4">
          <p className="text-xs font-medium text-steel-300">Estado de resultados</p>

          {/* Tabla */}
          <div className="space-y-1">
            <div className="flex items-center justify-between border-b border-linea py-1.5">
              <span className="text-sm font-semibold text-tinta">Ingresos</span>
              <span className="font-display font-bold text-emerald-400">{fmt(kpisPeriodo.totalIngresos)}</span>
            </div>
            <div className="flex items-center justify-between py-1 pl-4">
              <span className="text-sm text-steel-300">— CMV</span>
              <span className="text-sm text-sale">({fmt(kpisPeriodo.totalCMV)})</span>
            </div>
            <div className="flex items-center justify-between py-1 pl-4">
              <span className="text-sm text-steel-300">— Gastos</span>
              <span className="text-sm text-sale">({fmt(kpisPeriodo.totalGastos)})</span>
            </div>
            <div className="flex items-center justify-between border-b border-linea py-1 pl-4">
              <span className="text-sm text-steel-300">— Nóminas</span>
              <span className="text-sm text-sale">({fmt(kpisPeriodo.totalNominas)})</span>
            </div>
            <div className="flex items-center justify-between border-b border-linea py-1.5">
              <span className="text-sm font-medium text-steel-300">= Ganancia bruta</span>
              <span className={`font-display font-bold ${kpisPeriodo.gananciaBruta >= 0 ? 'text-emerald-400' : 'text-sale'}`}>
                {fmt(kpisPeriodo.gananciaBruta)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-xl border-2 border-brand-yellow px-3 py-2">
              <div>
                <span className="text-base font-bold text-tinta">= Resultado del período</span>
                <p className="text-xs text-steel-500">Margen bruto: {pct(kpisPeriodo.margenBruto)}</p>
              </div>
              <p className={`font-display text-2xl font-bold ${kpisPeriodo.resultado >= 0 ? 'text-emerald-400' : 'text-sale'}`}>
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
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--suave)' }} width={75} />
              <Tooltip formatter={(v: any) => [fmt(Math.abs(Number(v))), '']} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="valor" radius={[0, 3, 3, 0]}>
                {[
                  'var(--chart-2)',   // Ingresos — azul de marca
                  'var(--tenue)',   // CMV — acero
                  'var(--violeta)',   // Nóminas — morado
                  'var(--sale)',   // Gastos — rojo
                  kpisPeriodo.gananciaBruta >= 0 ? 'var(--entra)' : 'var(--aviso)',  // Gan. Bruta
                  kpisPeriodo.resultado >= 0 ? 'var(--chart-1)' : 'var(--aviso)',       // Resultado
                ].map((color, i) => <Cell key={i} fill={color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── COMPARACIÓN CON EL PERIODO ANTERIOR ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Contra el periodo anterior
        </h2>
        <div className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Este periodo</TableHead>
                <TableHead className="text-right">Anterior</TableHead>
                <TableHead className="text-right">Cambio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {([
                ['Ventas', kpisPeriodo.totalIngresos, ant.ingresos, false, true],
                ['Tickets', kpisPeriodo.numVentas, ant.numVentas, false, false],
                ['Ticket promedio', kpisPeriodo.ticketPromedioPeriodo, ant.ticketPromedio, false, true],
                ['Costo de lo vendido', kpisPeriodo.totalCMV, ant.costoVentas, true, true],
                ['Ganancia bruta', kpisPeriodo.gananciaBruta, ant.gananciaBruta, false, true],
                ['Gastos', kpisPeriodo.totalGastos, ant.gastos, true, true],
                ['Nómina', kpisPeriodo.totalNominas, ant.nominas, true, true],
                ['Descuentos dados', descuentos.total, ant.descuentos, true, true],
                ['Resultado', kpisPeriodo.resultado, ant.resultado, false, true],
              ] as [string, number, number, boolean, boolean][]).map(([nombre, actual, previo, inverso, dinero]) => (
                <TableRow key={nombre} className={`border-linea hover:bg-velo/5 ${nombre === 'Resultado' ? 'bg-brand-yellow/5' : ''}`}>
                  <TableCell className={`text-xs ${nombre === 'Resultado' ? 'font-bold text-brand-yellow' : 'font-medium text-tinta'}`}>{nombre}</TableCell>
                  <TableCell className="text-right font-display text-sm font-bold text-tinta">{dinero ? fmt(actual) : actual.toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right text-xs text-steel-300">{dinero ? fmt(previo) : previo.toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right"><Variacion actual={actual} anterior={previo} inverso={inverso} compacto /></TableCell>
                </TableRow>
              ))}
              <TableRow className="border-linea hover:bg-velo/5">
                <TableCell className="text-xs font-medium text-tinta">Margen bruto</TableCell>
                <TableCell className="text-right font-display text-sm font-bold text-tinta">{pct(kpisPeriodo.margenBruto)}</TableCell>
                <TableCell className="text-right text-xs text-steel-300">{pct(ant.margenBruto)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">
                  {Math.abs(kpisPeriodo.margenBruto - ant.margenBruto) < 0.05 ? (
                    <span className="text-steel-300">= 0.0 pts</span>
                  ) : (
                    <span className={kpisPeriodo.margenBruto > ant.margenBruto ? 'text-emerald-400' : 'text-sale'}>
                      {kpisPeriodo.margenBruto > ant.margenBruto ? '▲' : '▼'} {Math.abs(kpisPeriodo.margenBruto - ant.margenBruto).toFixed(1)} pts
                    </span>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { nombre: 'Ventas', actual: kpisPeriodo.totalIngresos, anterior: ant.ingresos },
                { nombre: 'Gan. bruta', actual: kpisPeriodo.gananciaBruta, anterior: ant.gananciaBruta },
                { nombre: 'Gastos+nómina', actual: kpisPeriodo.totalGastos + kpisPeriodo.totalNominas, anterior: ant.gastos + ant.nominas },
                { nombre: 'Resultado', actual: kpisPeriodo.resultado, anterior: ant.resultado },
              ]}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--suave)' }} />
              <YAxis tick={AXIS_TICK} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={50} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                formatter={(v: any, name: any) => [fmt(Number(v)), name === 'actual' ? 'Este periodo' : 'Anterior']} />
              <Bar dataKey="anterior" fill="var(--tenue)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-steel-500">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand-yellow" />Este periodo
            <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-tenue" />{anterior.etiqueta}
          </p>
        </div>
      </section>

      {/* ── DESCUENTOS EN EL TIEMPO ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Descuentos
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KPICard label="Descuentos dados" valor={fmt(descuentos.total)} color="text-amber-400"
            comparacion={<Variacion actual={descuentos.total} anterior={ant.descuentos} inverso compacto />} />
          <KPICard label="Sobre lo que se habría vendido"
            valor={pct(kpisPeriodo.totalIngresos + descuentos.total > 0 ? (descuentos.total / (kpisPeriodo.totalIngresos + descuentos.total)) * 100 : 0)}
            sub="Descuento ÷ (ventas + descuento)" />
          <KPICard label="Ventas con descuento" valor={String(descuentos.ventasConDescuento)}
            sub={kpisPeriodo.numVentas > 0 ? `${pct((descuentos.ventasConDescuento / kpisPeriodo.numVentas) * 100)} de los tickets` : undefined} />
        </div>
        <div className="rounded-2xl border border-linea bg-superficie p-4">
          <p className="mb-1 text-sm font-semibold text-tinta">Descuentos en el tiempo</p>
          <p className="mb-4 text-xs text-steel-500">{diasPeriodo > 92 ? 'Por mes' : 'Por día'}. Incluye descuentos por línea, descuento total y total editado a mano.</p>
          {descuentos.total > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={descuentos.serie} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: 'var(--suave)' }} />
                <YAxis yAxisId="d" tick={AXIS_TICK} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={45} />
                <YAxis yAxisId="t" orientation="right" tick={AXIS_TICK} allowDecimals={false} width={25} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(v: any, name: any) => name === 'tickets' ? [v, 'Ventas con descuento'] : [fmt(Number(v)), 'Descuento']} />
                <Bar yAxisId="d" dataKey="descuentos" fill="var(--aviso)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="t" type="monotone" dataKey="tickets" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-steel-500">No se dieron descuentos en este periodo.</p>
          )}
        </div>
      </section>

      {/* ── FLUJO DE CAJA ── */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Análisis de ventas
        </h2>

        <div className="rounded-2xl border border-linea bg-superficie p-4">
          <p className="mb-1 text-sm font-semibold text-tinta">Flujo de caja</p>
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
              <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: 'var(--suave)' }} />
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
              <Bar dataKey="ingresos" fill="var(--entra)" radius={[3, 3, 0, 0]} name="ingresos" />
              <Bar dataKey="egresos" fill="var(--sale)" radius={[3, 3, 0, 0]} name="egresos" />
              <Line type="monotone" dataKey="utilidad" stroke="var(--chart-1)" strokeWidth={2}
                dot={{ fill: 'var(--chart-1)', r: 4, strokeWidth: 2, stroke: 'var(--sup)' }} name="utilidad" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Medios de pago */}
          <div className="rounded-2xl border border-linea bg-superficie p-4">
            <p className="mb-4 text-sm font-semibold text-tinta">Por medio de pago</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={graficaMedios} dataKey="total" nameKey="metodo"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }: any) =>
                    `${METODO_LABEL[name] ?? name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  stroke="var(--sup)"
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
          <div className="rounded-2xl border border-linea bg-superficie p-4">
            <p className="mb-1 text-sm font-semibold text-tinta">Ventas por hora del día</p>
            <SelectorModoGrafico modo={modoHoras} onChange={setModoHoras} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={datosHorasMostrados} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="hora" tick={AXIS_TICK} />
                <YAxis
                  tick={AXIS_TICK}
                  tickFormatter={v => modoHoras === 'ticket' ? `${v}` : `$${(Math.abs(v) / 1000).toFixed(0)}K`}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <Tooltip formatter={(v: any) => [modoHoras === 'ticket' ? Number(v).toFixed(0) : fmt(Number(v)), ETIQUETA_MODO[modoHoras]]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="valor" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas promedio por día de la semana */}
        <div className="rounded-2xl border border-linea bg-superficie p-4">
          <p className="mb-1 text-sm font-semibold text-tinta">Ventas promedio por día de la semana</p>
          <p className="mb-3 text-xs text-steel-500">Lunes a domingo · promedio sobre el período seleccionado</p>
          <SelectorModoGrafico modo={modoDias} onChange={setModoDias} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosDiasMostrados} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="dia" tick={AXIS_TICK} />
              <YAxis
                tick={AXIS_TICK}
                tickFormatter={v => modoDias === 'ticket' ? `${v.toFixed(1)}` : `$${(Math.abs(v) / 1000).toFixed(0)}K`}
                domain={['auto', 'auto']}
                allowDataOverflow={false}
              />
              <Tooltip formatter={(v: any) => [modoDias === 'ticket' ? Number(v).toFixed(1) : fmt(Number(v)), ETIQUETA_MODO[modoDias]]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ventas por empleado */}
        {graficaEmpleados.length > 0 && (
          <div className="rounded-2xl border border-linea bg-superficie p-4">
            <p className="mb-4 text-sm font-semibold text-tinta">Ventas por empleado</p>
            <ResponsiveContainer width="100%" height={Math.max(120, graficaEmpleados.length * 40)}>
              <BarChart data={graficaEmpleados} layout="vertical"
                margin={{ top: 5, right: 60, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--suave)' }} width={100} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(v: any, name: any) => [
                    name === 'total' ? fmt(Number(v)) : v,
                    name === 'total' ? 'Ventas' : 'Tickets'
                  ]}
                />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[0, 3, 3, 0]}>
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
          <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
            Análisis de productos
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-steel-300">Mostrar:</label>
            <Select items={TOP_OPCIONES} onValueChange={v => v && setTopN(parseInt(v))} value={String(topN)}>
              <SelectTrigger className="h-8 w-28 border-linea bg-superficie-2 text-xs text-tinta"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOP_OPCIONES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Top por cantidad */}
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie">
          <div className="flex items-center justify-between border-b border-linea px-4 py-3">
            <p className="font-semibold text-tinta">Top {topN} — Más vendidos por cantidad</p>
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
                <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
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
                  <TableRow key={p.producto_id} className="border-linea hover:bg-velo/5">
                    <TableCell className="text-xs text-steel-500">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo}</TableCell>
                    <TableCell className="text-sm font-medium"><Link href={`/dashboard/inventario/${p.producto_id}`} prefetch={false} className="text-tinta underline-offset-2 hover:text-enlace hover:underline">{p.nombre}</Link></TableCell>
                    <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                    <TableCell className="text-right font-display font-bold text-tinta">{p.cantidad}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmt(p.ingresos)}</TableCell>
                    <TableCell className={`text-right text-xs ${p.pct_ganancia >= 0 ? 'text-emerald-400' : 'text-sale'}`}>
                      {pct(p.pct_ganancia)}
                    </TableCell>
                    <TableCell className="text-right text-steel-300">{p.tickets}</TableCell>
                  </TableRow>
                ))}
                {topPorCantidad.length === 0 && (
                  <TableRow className="border-linea"><TableCell colSpan={9} className="py-6 text-center text-steel-500">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Top por ingresos */}
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie">
          <div className="flex items-center justify-between border-b border-linea px-4 py-3">
            <p className="font-semibold text-tinta">Top {topN} — Mayor ingreso generado</p>
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
                <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
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
                    <TableRow key={p.producto_id} className="border-linea hover:bg-velo/5">
                      <TableCell className="text-xs text-steel-500">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo}</TableCell>
                      <TableCell className="text-sm font-medium"><Link href={`/dashboard/inventario/${p.producto_id}`} prefetch={false} className="text-tinta underline-offset-2 hover:text-enlace hover:underline">{p.nombre}</Link></TableCell>
                      <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                      <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                      <TableCell className="text-right font-display font-bold text-emerald-400">{fmt(p.ingresos)}</TableCell>
                      <TableCell className={`text-right text-xs ${p.pct_ganancia >= 0 ? 'text-emerald-400' : 'text-sale'}`}>
                        {pct(p.pct_ganancia)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${margen >= 0 ? 'text-emerald-400' : 'text-sale'}`}>
                        {fmt(margen)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {topPorIngresos.length === 0 && (
                  <TableRow className="border-linea"><TableCell colSpan={8} className="py-6 text-center text-steel-500">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Top por rotación */}
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie">
          <div className="flex items-center justify-between border-b border-linea px-4 py-3">
            <p className="font-semibold text-tinta">Top {topN} — Mayor rotación</p>
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
                <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
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
                  <TableRow key={p.producto_id} className="border-linea hover:bg-velo/5">
                    <TableCell className="text-xs text-steel-500">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-brand-yellow">{p.codigo}</TableCell>
                    <TableCell className="text-sm font-medium"><Link href={`/dashboard/inventario/${p.producto_id}`} prefetch={false} className="text-tinta underline-offset-2 hover:text-enlace hover:underline">{p.nombre}</Link></TableCell>
                    <TableCell className="text-xs text-steel-300">{p.marca ?? '—'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{p.unidad_medida ?? '—'}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmt(p.ingresos)}</TableCell>
                    <TableCell className={`text-right text-xs ${p.pct_ganancia >= 0 ? 'text-emerald-400' : 'text-sale'}`}>
                      {pct(p.pct_ganancia)}
                    </TableCell>
                    <TableCell className="text-right font-display font-bold text-tinta">{p.unidades_por_dia.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {topPorFrecuencia.length === 0 && (
                  <TableRow className="border-linea"><TableCell colSpan={8} className="py-6 text-center text-steel-500">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── UTILIDAD POR CATEGORÍA Y FAMILIA ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Utilidad real
        </h2>
        <TablaUtilidad porCategoria={utilidadPorCategoria} porFamilia={utilidadPorFamilia} desde={desde} hasta={hasta} />
      </section>

      {/* ── INVENTARIO Y PROVEEDORES ── */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
          Inventario y proveedores
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <KPICard label="Valor inventario a costo"
            valor={fmt(inventario.valorCosto)} sub="Stock actual × precio de compra" color="text-enlace" />
          <KPICard label="Valor inventario a precio de venta"
            valor={fmt(inventario.valorVenta)} sub="Stock actual × precio de venta" color="text-emerald-400" />
        </div>
        <div className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-tinta">Deuda con proveedores</p>
            <span className="font-display text-lg font-bold text-sale">{fmt(deudaProveedores.total)}</span>
          </div>
          {deudaProveedores.top5.length > 0 && (
            <div className="space-y-1">
              <p className="mb-2 text-xs text-steel-300">Top 5 con mayor deuda</p>
              {deudaProveedores.top5.map(d => (
                <div key={d.nombre} className="flex justify-between border-b border-linea pb-1 text-sm last:border-0">
                  <span className="text-steel-300">{d.nombre}</span>
                  <span className="font-medium text-sale">{fmt(d.deuda)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── NÓMINA ── */}
      {nominaPeriodo.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
            Nómina del período
          </h2>
          <div className="overflow-hidden rounded-2xl border border-linea bg-superficie">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Días pagados</TableHead>
                    <TableHead className="text-right">Total pagado</TableHead>
                    <TableHead className="text-right">Promedio/día</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...nominaPeriodo].sort((a, b) => b.total - a.total).map(n => (
                    <TableRow key={n.nombre} className="border-linea hover:bg-velo/5">
                      <TableCell className="text-xs font-medium text-tinta">{n.nombre}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">{n.dias}</TableCell>
                      <TableCell className="text-right font-display font-bold text-tinta">{fmt(n.total)}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">
                        {n.dias > 0 ? fmt(n.total / n.dias) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-superficie-2 hover:bg-superficie-2">
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