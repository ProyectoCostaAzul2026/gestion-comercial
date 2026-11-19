'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DenominacionesPanel } from './denominaciones-panel'
import { AlertTriangle, ArrowLeftRight, ArrowUpFromLine, Banknote, Calculator, Coins, CreditCard, Receipt, Smartphone, Truck, Users, Wallet } from 'lucide-react'
import { esDomingoOFestivo } from '@/lib/festivos-colombia'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Movimiento {
  id: string; hora: string; tipo_movimiento: string
  origen_destino: string; monto: number
  observaciones: string | null; referencia_tipo: string | null
}

interface FondoDenominacion {
  tipo: string; denominacion: number; cantidad: number; billetes_acumulados: number
}

interface SaldoMedio { medio: string; saldo_acumulado: number }

interface CajaPanelProps {
  ventasEfectivo: number; ventasNequi: number
  ventasDaviplata: number; ventasTarjeta: number; ventasCredito: number
  totalIngresos: number; totalEgresos: number
  movimientos: Movimiento[]
  fondos: FondoDenominacion[]
  saldos: SaldoMedio[]
  config: { monto_base_caja_menor: number; monto_inicial_monedas: number; monto_inicial_sencillo: number }
  fechaHoy: string
  nominasPagadasHoy: number; empleadosActivos: number
  arqueoHoy: any
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_MOV_LABEL: Record<string, string> = {
  ingreso: 'Ingreso', egreso: 'Egreso', gasto: 'Gasto',
  retiro: 'Retiro', pago_proveedor: 'Pago proveedor',
  nomina: 'Nómina', transferencia_caja_mayor: 'Transfer. Caja Mayor',
}

const ORIGEN_LABEL: Record<string, string> = {
  efectivo: 'Efectivo (Caja Menor)',
  caja_menor: 'Efectivo (Caja Menor)',
  caja_mayor: 'Caja Mayor',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  credito: 'Crédito',
  abono_credito: 'Abono crédito',
}

const MEDIO_ESTILO: Record<string, { label: string; icono: any; texto: string; borde: string; fondo: string; anillo: string }> = {
  efectivo:   { label: 'Efectivo',   icono: Banknote,   texto: 'text-emerald-400', borde: 'border-emerald-500/30', fondo: 'bg-emerald-500/10', anillo: 'bg-emerald-500/20' },
  nequi:      { label: 'Nequi',      icono: Smartphone, texto: 'text-purple-400',  borde: 'border-purple-500/30',  fondo: 'bg-purple-500/10',  anillo: 'bg-purple-500/20' },
  daviplata:  { label: 'Daviplata',  icono: Smartphone, texto: 'text-red-400',     borde: 'border-red-500/30',     fondo: 'bg-red-500/10',     anillo: 'bg-red-500/20' },
  tarjeta:    { label: 'Tarjeta',    icono: CreditCard, texto: 'text-brand-blue',  borde: 'border-brand-blue/30',  fondo: 'bg-brand-blue/10',  anillo: 'bg-brand-blue/20' },
  credito:    { label: 'Crédito',    icono: Coins,      texto: 'text-amber-400',   borde: 'border-amber-500/30',   fondo: 'bg-amber-500/10',   anillo: 'bg-amber-500/20' },
  caja_mayor: { label: 'Caja Mayor', icono: Wallet,     texto: 'text-emerald-400', borde: 'border-emerald-500/30', fondo: 'bg-emerald-500/10', anillo: 'bg-emerald-500/20' },
}

// ─── CajaPanel ───────────────────────────────────────────────────────────────

export function CajaPanel({
  ventasEfectivo, ventasNequi, ventasDaviplata, ventasTarjeta, ventasCredito,
  totalIngresos, totalEgresos,
  movimientos, fondos, saldos, config,
  fechaHoy, nominasPagadasHoy, empleadosActivos, arqueoHoy,
}: CajaPanelProps) {

  // ── Filtros movimientos ──
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroOrigen, setFiltroOrigen] = useState('todos')

  // ── Computed ──
  const saldoTotal = totalIngresos - totalEgresos
  const nominaAlDia = nominasPagadasHoy >= empleadosActivos
  const esFestivoHoy = esDomingoOFestivo(fechaHoy)

  const saldosPorMedio = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of saldos) map[s.medio] = Number(s.saldo_acumulado)
    return map
  }, [saldos])

  const granTotalEntradasDia = ventasEfectivo + ventasNequi + ventasDaviplata + ventasTarjeta + ventasCredito
  const granTotalSaldosFondo = useMemo(() =>
    ['nequi', 'daviplata', 'tarjeta', 'credito', 'caja_mayor']
      .reduce((s, medio) => s + (saldosPorMedio[medio] ?? 0), 0),
    [saldosPorMedio])

  /** Resumen del día en texto: WhatsApp deja elegir a quién enviarlo */
  const compartirResumen = () => {
    const p = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
    const texto = [
      `*Cierre del día ${fechaHoy}*`,
      `Ventas: ${p(granTotalEntradasDia)}`,
      `• Efectivo: ${p(ventasEfectivo)}`,
      `• Nequi: ${p(ventasNequi)}`,
      `• Daviplata: ${p(ventasDaviplata)}`,
      `• Tarjeta: ${p(ventasTarjeta)}`,
      `• A crédito: ${p(ventasCredito)}`,
      `Otros ingresos de caja: ${p(totalIngresos)}`,
      `Egresos (gastos, retiros, proveedores, nómina): ${p(totalEgresos)}`,
      `Efectivo que debe haber sobre la base: ${p(saldosPorMedio.efectivo ?? 0)}`,
      `Nómina pagada: ${nominasPagadasHoy} de ${empleadosActivos}`,
      arqueoHoy ? 'Caja cerrada con arqueo.' : 'La caja aún no se ha cerrado.',
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const TIPOS_EGRESO = ['gasto', 'retiro', 'pago_proveedor', 'nomina', 'egreso']
  const TIPOS_INGRESO = ['ingreso']

  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroTipo === 'egreso' && !TIPOS_EGRESO.includes(m.tipo_movimiento)) return false
    if (filtroTipo === 'ingreso' && !TIPOS_INGRESO.includes(m.tipo_movimiento)) return false
    if (filtroTipo !== 'todos' && filtroTipo !== 'egreso' && filtroTipo !== 'ingreso' && m.tipo_movimiento !== filtroTipo) return false
    const origenNorm = (m.origen_destino === 'caja_menor' || m.origen_destino === 'efectivo') ? 'efectivo' : m.origen_destino
    if (filtroOrigen !== 'todos' && origenNorm !== filtroOrigen) return false
    return true
  })
  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Header diagonal */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] py-3 pl-4 pr-14 md:py-4 md:pr-28">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-yellow md:text-3xl">Caja</h1>
            <p className="mt-0.5 text-xs text-steel-300">{fechaHoy}{esFestivoHoy ? ' · Domingo/Festivo' : ''}</p>
          </div>
          {!arqueoHoy ? (
            <Link href="/dashboard/caja/cierre"
              className="inline-flex h-10 items-center rounded-xl border border-brand-red/40 px-4 text-sm font-semibold text-brand-red hover:bg-brand-red/15">
              Arqueo y cierre de caja
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Caja cerrada hoy</span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 overflow-hidden md:w-24">
          <div className="absolute inset-y-0 right-0 w-9 -skew-x-12 translate-x-4 bg-brand-yellow/80 md:w-20 md:translate-x-8" />
          <div className="absolute inset-y-0 right-0 w-3 -skew-x-12 translate-x-1 bg-brand-blue md:w-7" />
        </div>
      </div>

      {/* Resumen del día para enviarlo al dueño o guardarlo */}
      <button type="button" onClick={compartirResumen}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 text-sm font-bold text-emerald-400 hover:bg-emerald-500/10">
        Compartir el resumen del día por WhatsApp
      </button>

      {/* Advertencia nómina */}
      {!nominaAlDia && (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-3 text-sm text-brand-yellow">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{nominasPagadasHoy} de {empleadosActivos} empleados tienen nómina pagada hoy. Se recomienda pagar antes de cerrar caja.</span>
        </div>
      )}

      {/* Entradas del día */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Entradas del día
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { medio: 'efectivo', valor: ventasEfectivo, sub: 'Caja menor' },
            { medio: 'nequi', valor: ventasNequi },
            { medio: 'daviplata', valor: ventasDaviplata },
            { medio: 'tarjeta', valor: ventasTarjeta },
            { medio: 'credito', valor: ventasCredito },
          ].map(({ medio, valor, sub }) => {
            const est = MEDIO_ESTILO[medio]
            const Icono = est.icono
            return (
              <div key={medio} className={`rounded-xl border ${est.borde} ${est.fondo} p-3 text-center`}>
                <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${est.anillo} ${est.texto}`}>
                  <Icono className="size-4" />
                </span>
                <p className="text-xs font-medium text-steel-300">{est.label}</p>
                <p className={`mt-1 font-display font-bold ${est.texto}`}>${valor.toLocaleString('es-CO')}</p>
                {sub && <p className="mt-0.5 text-[11px] text-steel-500">{sub}</p>}
              </div>
            )
          })}
          <div className="rounded-xl border-2 border-brand-yellow/40 bg-brand-yellow/10 p-3 text-center">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-yellow">
              <Calculator className="size-4" />
            </span>
            <p className="text-xs font-medium text-steel-300">Gran Total</p>
            <p className="mt-1 font-display font-bold text-brand-yellow">${granTotalEntradasDia.toLocaleString('es-CO')}</p>
            <p className="mt-0.5 text-[11px] text-steel-500">Suma de los 5 medios</p>
          </div>
        </div>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-emerald-500 bg-[#111820] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ingresos totales</p>
          <p className="mt-1 font-display text-lg font-bold text-emerald-400 md:text-2xl">${totalIngresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-red bg-[#111820] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Egresos totales</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-red md:text-2xl">${totalEgresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Saldo total</p>
          <p className={`mt-1 font-display text-lg font-bold md:text-2xl ${saldoTotal >= 0 ? 'text-white' : 'text-brand-red'}`}>
            ${saldoTotal.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* Acciones: cada una abre su propia vista */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {[
          { href: '/dashboard/caja/gasto', titulo: 'Registrar gasto', icono: Receipt },
          { href: '/dashboard/caja/retiro', titulo: 'Registrar retiro', icono: ArrowUpFromLine },
          { href: '/dashboard/caja/pago-proveedor', titulo: 'Pago a proveedor', icono: Truck },
          { href: '/dashboard/caja/traslado', titulo: 'Traslado entre medios', icono: ArrowLeftRight },
          { href: '/dashboard/empleados/nomina', titulo: nominaAlDia ? 'Nómina del día' : 'Pagar nómina del día', icono: Users },
        ].map(a => {
          const Icono = a.icono
          return (
            <Link key={a.href} href={a.href}
              className="flex min-h-14 items-center gap-2.5 rounded-xl border border-white/10 bg-[#1a2430] px-3 text-sm font-semibold text-white hover:border-brand-yellow/50">
              <Icono className="h-4 w-4 shrink-0 text-brand-yellow" aria-hidden />
              {a.titulo}
            </Link>
          )
        })}
      </div>

      {/* Movimientos del día */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Movimientos del día
        </h2>
        <div className="flex flex-wrap gap-3">
          <Select items={[{ value: 'todos', label: 'Todos los tipos' }, ...Object.entries(TIPO_MOV_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
            onValueChange={v => v && setFiltroTipo(v)} value={filtroTipo}>
            <SelectTrigger className="w-48 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="ingreso">Ingresos</SelectItem>
              <SelectItem value="egreso">Egresos</SelectItem>
              <SelectItem value="transferencia_caja_mayor">Transferencias</SelectItem>
            </SelectContent>
          </Select>
          <Select items={[{ value: 'todos', label: 'Todos los medios' }, ...Object.entries(ORIGEN_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
            onValueChange={v => v && setFiltroOrigen(v)} value={filtroOrigen}>
            <SelectTrigger className="w-44 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los medios</SelectItem>
              <SelectItem value="efectivo">Efectivo (Caja Menor)</SelectItem>
              <SelectItem value="caja_mayor">Caja Mayor</SelectItem>
              <SelectItem value="nequi">Nequi</SelectItem>
              <SelectItem value="daviplata">Daviplata</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
              <TableHead>Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosFiltrados.map(m => {
              const esIngreso = m.tipo_movimiento === 'ingreso'
              return (
                <TableRow key={m.id} className="border-white/8 hover:bg-white/5">
                  <TableCell className="text-xs text-steel-300">{m.hora?.slice(0, 5)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${esIngreso ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
                      {TIPO_MOV_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-steel-300">{ORIGEN_LABEL[m.origen_destino] ?? m.origen_destino}</TableCell>
                  <TableCell className={`text-right font-display font-bold ${esIngreso ? 'text-emerald-400' : 'text-brand-red'}`}>
                    {esIngreso ? '+' : '-'}${Number(m.monto).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-xs text-steel-300">{m.observaciones ?? '—'}</TableCell>
                </TableRow>
              )
            })}
            {movimientosFiltrados.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin movimientos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Fondos de denominaciones */}
      <DenominacionesPanel fondos={fondos} config={config} />

      {/* Saldos acumulados — estado real de cada fondo */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Saldos acumulados por fondo
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {(['nequi', 'daviplata', 'tarjeta', 'credito', 'caja_mayor'] as const).map(medio => {
            const est = MEDIO_ESTILO[medio]
            const Icono = est.icono
            const saldo = saldosPorMedio[medio] ?? 0
            return (
              <div key={medio} className={`rounded-xl border ${est.borde} ${est.fondo} p-3 text-center`}>
                <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${est.anillo} ${est.texto}`}>
                  <Icono className="size-4" />
                </span>
                <p className="text-xs font-medium text-steel-300">{est.label}</p>
                <p className={`mt-1 font-display font-bold ${est.texto}`}>${Number(saldo).toLocaleString('es-CO')}</p>
                <p className="mt-0.5 text-[11px] text-steel-500">Saldo actual</p>
              </div>
            )
          })}
          <div className="rounded-xl border-2 border-brand-yellow/40 bg-brand-yellow/10 p-3 text-center">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-yellow">
              <Calculator className="size-4" />
            </span>
            <p className="text-xs font-medium text-steel-300">Gran Total</p>
            <p className="mt-1 font-display font-bold text-brand-yellow">${granTotalSaldosFondo.toLocaleString('es-CO')}</p>
            <p className="mt-0.5 text-[11px] text-steel-500">Suma de los 5 fondos</p>
          </div>
        </div>
      </div>
    </div>
  )
}