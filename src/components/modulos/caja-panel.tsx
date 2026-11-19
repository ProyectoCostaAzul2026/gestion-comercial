'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'
import { DenominacionesPanel } from './denominaciones-panel'
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpFromLine, ArrowUpRight, Lock, Receipt, Share2, Truck, Users } from 'lucide-react'
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
  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  const efectivoSobreBase = saldosPorMedio.efectivo ?? 0
  const ventasPorMedio = [
    { medio: 'efectivo', nombre: 'Efectivo', valor: ventasEfectivo },
    { medio: 'nequi', nombre: 'Nequi', valor: ventasNequi },
    { medio: 'daviplata', nombre: 'Daviplata', valor: ventasDaviplata },
    { medio: 'tarjeta', nombre: 'Tarjeta', valor: ventasTarjeta },
    { medio: 'credito', nombre: 'A crédito', valor: ventasCredito },
  ]
  const fondos5 = [
    { medio: 'nequi', nombre: 'Nequi' },
    { medio: 'daviplata', nombre: 'Daviplata' },
    { medio: 'tarjeta', nombre: 'Tarjeta' },
    { medio: 'caja_mayor', nombre: 'Caja mayor' },
    { medio: 'credito', nombre: 'Por cobrar (créditos)' },
  ]
  const acciones = [
    { href: '/dashboard/caja/gasto', titulo: 'Gasto', icono: Receipt },
    { href: '/dashboard/caja/retiro', titulo: 'Retiro', icono: ArrowUpFromLine },
    { href: '/dashboard/caja/traslado', titulo: 'Traslado', icono: ArrowLeftRight },
    { href: '/dashboard/caja/pago-proveedor', titulo: 'Pago a proveedor', icono: Truck },
    { href: '/dashboard/empleados/nomina', titulo: 'Nómina', icono: Users },
  ]
  const TITULO = 'text-lg font-bold text-tinta'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-tinta">Caja</h1>
          <p className="text-[15px] text-suave">{fechaLarga(fechaHoy)}{esFestivoHoy ? ', domingo o festivo' : ''}</p>
        </div>
        <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${
          arqueoHoy ? 'bg-realce text-suave' : 'bg-[color-mix(in_oklab,var(--entra)_14%,transparent)] text-entra'}`}>
          <span className={`size-2 rounded-full ${arqueoHoy ? 'bg-tenue' : 'bg-entra'}`} aria-hidden />
          {arqueoHoy ? 'Cerrada hoy' : 'Abierta'}
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Lo principal: cuánto efectivo debe haber */}
          <section className="space-y-4 rounded-[18px] bg-superficie p-5">
            <div>
              <p className="text-[15px] font-semibold text-suave">Efectivo que debe haber sobre la base</p>
              <p className="cifra text-[52px] font-bold leading-none text-tinta">{pesos(efectivoSobreBase)}</p>
              <p className="mt-1 text-sm text-suave">
                Además de la base de {pesos(config.monto_base_caja_menor ?? 0)}. Es lo que entró y salió en efectivo desde el último cierre.
              </p>
            </div>
            {!arqueoHoy ? (
              <Link href="/dashboard/caja/cierre"
                className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-accion text-[17px] font-bold text-sobre-accion hover:brightness-105">
                <Lock className="size-5" strokeWidth={2} aria-hidden />Contar y cerrar la caja
              </Link>
            ) : (
              <p className="rounded-xl bg-superficie-2 px-4 py-3 text-[15px] text-suave">La caja de hoy ya se cerró con arqueo.</p>
            )}
          </section>

          {!nominaAlDia && (
            <div className="flex items-center gap-3 rounded-[14px] bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)] px-4 py-3.5">
              <AlertTriangle className="size-[22px] shrink-0 text-aviso" strokeWidth={2} aria-hidden />
              <p className="flex-1 text-[15px] leading-snug text-tinta">
                Falta pagar la nómina de hoy a {empleadosActivos - nominasPagadasHoy} {empleadosActivos - nominasPagadasHoy === 1 ? 'persona' : 'personas'}. Págala antes de cerrar para que el efectivo cuadre.
              </p>
              <Link href="/dashboard/empleados/nomina" className="py-2 pl-2 text-[15px] font-bold text-enlace">Pagar</Link>
            </div>
          )}

          {/* Registrar: cada acción abre su vista */}
          <section className="space-y-2.5">
            <h2 className={TITULO}>Registrar</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {acciones.map(a => {
                const Icono = a.icono
                return (
                  <Link key={a.href} href={a.href}
                    className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-superficie px-1 text-center text-sm font-semibold leading-tight text-tinta hover:bg-superficie-2">
                    <Icono className="size-6 text-enlace" strokeWidth={1.75} aria-hidden />
                    {a.titulo}
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Ventas de hoy por medio */}
          <section className="space-y-2.5">
            <h2 className={TITULO}>Ventas de hoy</h2>
            <ul className="overflow-hidden rounded-2xl bg-superficie">
              {ventasPorMedio.map(v => (
                <li key={v.medio} className="flex items-center gap-3 border-b border-linea px-4 py-2.5">
                  <MedioPagoIcono medio={v.medio} className="h-7 w-[42px] shrink-0" />
                  <span className="flex-1 text-[15px] text-tinta">{v.nombre}</span>
                  <span className="cifra text-xl font-bold text-tinta">{pesos(v.valor)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-superficie-2 px-4 py-3">
                <span className="text-[15px] font-bold text-tinta">Total vendido</span>
                <span className="cifra text-2xl font-bold text-tinta">{pesos(granTotalEntradasDia)}</span>
              </li>
            </ul>
          </section>

          {/* Otros medios */}
          <section className="space-y-2.5">
            <h2 className={TITULO}>Saldos de los otros medios</h2>
            <div className="grid grid-cols-2 gap-2">
              {fondos5.map(f => (
                <div key={f.medio} className="flex items-center gap-3 rounded-[14px] bg-superficie px-3.5 py-3">
                  <MedioPagoIcono medio={f.medio} className="h-7 w-[42px] shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-suave">{f.nombre}</p>
                    <p className="cifra text-[22px] font-bold leading-tight text-tinta">{pesos(saldosPorMedio[f.medio] ?? 0)}</p>
                  </div>
                </div>
              ))}
              <div className="flex flex-col justify-center rounded-[14px] bg-superficie-2 px-3.5 py-3">
                <p className="text-sm text-suave">Suma de los cinco</p>
                <p className="cifra text-[22px] font-bold leading-tight text-tinta">{pesos(granTotalSaldosFondo)}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {/* Movimientos de hoy */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={TITULO}>Movimientos de hoy</h2>
              <p className="text-sm text-suave">
                Entró <span className="cifra text-base font-bold text-entra">{pesos(totalIngresos)}</span>, salió <span className="cifra text-base font-bold text-sale">{pesos(totalEgresos)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[['todos', 'Todos'], ['ingreso', 'Entradas'], ['egreso', 'Salidas'], ['transferencia_caja_mayor', 'Traslados']].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={filtroTipo === v} onClick={() => setFiltroTipo(v)}
                  className={`h-9 rounded-full px-3.5 text-sm font-semibold transition-colors ${filtroTipo === v ? 'bg-tinta text-fondo' : 'bg-superficie text-suave hover:text-tinta'}`}>
                  {l}
                </button>
              ))}
              <Select items={[{ value: 'todos', label: 'Todos los medios' }, ...Object.entries(ORIGEN_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
                onValueChange={v => v && setFiltroOrigen(v)} value={filtroOrigen}>
                <SelectTrigger aria-label="Medio" className="h-9 w-auto rounded-full border-linea bg-superficie text-sm text-tinta"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los medios</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="caja_mayor">Caja mayor</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="daviplata">Daviplata</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ul className="max-h-[32rem] overflow-y-auto rounded-2xl bg-superficie">
              {movimientosFiltrados.map(m => {
                const esIngreso = m.tipo_movimiento === 'ingreso'
                const Flecha = esIngreso ? ArrowDownLeft : ArrowUpRight
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-linea px-3.5 py-3 last:border-0">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${esIngreso
                      ? 'bg-[color-mix(in_oklab,var(--entra)_14%,transparent)] text-entra'
                      : 'bg-[color-mix(in_oklab,var(--sale)_13%,transparent)] text-sale'}`}>
                      <Flecha className="size-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-tinta">{m.observaciones || (TIPO_MOV_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento)}</p>
                      <p className="text-sm text-suave">{TIPO_MOV_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}, {ORIGEN_LABEL[m.origen_destino] ?? m.origen_destino}, {m.hora?.slice(0, 5)}</p>
                    </div>
                    <span className={`cifra shrink-0 text-xl font-bold ${esIngreso ? 'text-entra' : 'text-sale'}`}>
                      {esIngreso ? '+' : '−'}{pesos(Number(m.monto))}
                    </span>
                  </li>
                )
              })}
              {movimientosFiltrados.length === 0 && (
                <li className="px-4 py-8 text-center text-[15px] text-suave">No hay movimientos con ese filtro.</li>
              )}
            </ul>
          </section>

          <button type="button" onClick={compartirResumen}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-linea bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2">
            <Share2 className="size-[18px]" strokeWidth={1.75} aria-hidden />Enviar el resumen del día por WhatsApp
          </button>

          <DenominacionesPanel fondos={fondos} config={config} />
        </div>
      </div>
    </div>
  )
}

/** "2026-11-19" → "jueves 19 de noviembre" */
function fechaLarga(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  const txt = new Date(Date.UTC(a, m - 1, d, 12)).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}
