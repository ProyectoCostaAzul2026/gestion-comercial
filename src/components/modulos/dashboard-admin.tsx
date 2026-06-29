'use client'

import Link from 'next/link'
import {
  AlertTriangle, ShoppingCart, Package, Wallet, BarChart3, Truck, BookOpen,
  TrendingUp, Receipt, Users, PackageX, CalendarClock,
  Banknote, Smartphone, CreditCard, ArrowLeftRight, AlertCircle,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGO_UI: Record<string, { label: string; Icon: React.ElementType; ring: string; color: string }> = {
  efectivo:  { label: 'Efectivo',  Icon: Banknote,       ring: 'bg-emerald-500/20', color: 'text-emerald-400' },
  nequi:     { label: 'Nequi',     Icon: Smartphone,     ring: 'bg-purple-500/20',  color: 'text-purple-400' },
  daviplata: { label: 'Daviplata', Icon: Smartphone,     ring: 'bg-red-500/20',     color: 'text-red-400' },
  tarjeta:   { label: 'Tarjeta',   Icon: CreditCard,     ring: 'bg-brand-blue/20',  color: 'text-brand-blue' },
  mixto:     { label: 'Mixto',     Icon: ArrowLeftRight, ring: 'bg-brand-yellow/20', color: 'text-brand-yellow' },
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }

interface Props {
  profile: { nombre_completo: string; rol: string; foto_url: string | null }
  config: { nombre: string; logo_url: string | null } | null
  fechaHoy: string
  kpisHoy: {
    totalVentas: number; numTickets: number; ticketPromedio: number
    desglosePago: Record<string, number>
    nominasPagadas: number; empleadosActivos: number; cajaMayor: number
  }
  ultimasVentas: any[]
  alertas: {
    productosAgotados: any[]
    facturasPendientes: any[]
    pagosProgramados: any[]
  }
}

export function DashboardAdmin({ profile, config, fechaHoy, kpisHoy, ultimasVentas, alertas }: Props) {
  const nominaAlDia = kpisHoy.nominasPagadas >= kpisHoy.empleadosActivos
  const totalAlertas = alertas.productosAgotados.length + alertas.facturasPendientes.length + alertas.pagosProgramados.length
  const esAdmin = profile.rol === 'administrador'

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Perfil + header diagonal ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="relative z-10 flex items-center gap-4">
          {profile.foto_url ? (
            <img src={profile.foto_url} alt="Foto" className="h-20 w-20 shrink-0 rounded-full border-2 border-brand-yellow object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-yellow font-display text-2xl font-black text-steel-900">
              {profile.nombre_completo.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-white">{profile.nombre_completo}</h1>
            <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide capitalize ${esAdmin ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
              {profile.rol}
            </span>
            <p className="mt-1 truncate text-xs text-steel-300">{fechaHoy}{config?.nombre ? ` · ${config.nombre}` : ''}</p>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {/* ── KPIs hoy ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Ventas hoy */}
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-yellow bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ventas hoy</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-yellow/15 p-2 text-brand-yellow">
              <TrendingUp className="size-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-black text-white">{fmt(kpisHoy.totalVentas)}</p>
          <p className="mt-0.5 text-xs text-steel-300">{kpisHoy.numTickets} tickets</p>
        </div>

        {/* Ticket promedio */}
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ticket promedio</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-blue/15 p-2 text-brand-blue">
              <Receipt className="size-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-black text-white">{fmt(kpisHoy.ticketPromedio)}</p>
        </div>

        {/* Nómina hoy */}
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-yellow bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Nómina hoy</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-yellow/15 p-2 text-brand-yellow">
              <Users className="size-5" />
            </span>
          </div>
          <p className={`mt-3 font-display text-3xl font-black ${nominaAlDia ? 'text-emerald-400' : 'text-brand-yellow'}`}>
            {kpisHoy.nominasPagadas}/{kpisHoy.empleadosActivos}
          </p>
          <p className="mt-0.5 text-xs text-steel-300">{nominaAlDia ? 'Al día' : 'Pendientes'}</p>
        </div>

        {/* Caja mayor */}
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Caja Mayor</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-blue/15 p-2 text-brand-blue">
              <Wallet className="size-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-black text-brand-blue">{fmt(kpisHoy.cajaMayor)}</p>
        </div>
      </div>

      {/* ── Desglose medios de pago ── */}
      {Object.keys(kpisHoy.desglosePago).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Por medio de pago — hoy
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {['efectivo', 'nequi', 'daviplata', 'tarjeta', 'mixto'].map(m => {
              const ui = PAGO_UI[m]
              const Icon = ui.Icon
              return (
                <div key={m} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2430] p-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${ui.ring} ${ui.color}`}>
                    <Icon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-steel-300">{ui.label}</p>
                    <p className="font-display text-lg font-bold text-white">{fmt(kpisHoy.desglosePago[m] ?? 0)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Alertas ── */}
      {totalAlertas > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <AlertTriangle className="size-5 text-brand-yellow" />
            Alertas ({totalAlertas})
          </h2>

          {alertas.productosAgotados.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-brand-red">
                  <PackageX className="size-4" />
                  {alertas.productosAgotados.length} producto{alertas.productosAgotados.length !== 1 ? 's' : ''} agotado{alertas.productosAgotados.length !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/inventario/agotados" className="text-xs font-medium text-brand-red hover:underline">
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-1">
                {alertas.productosAgotados.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-sm text-steel-300">
                    <span>{p.nombre}</span>
                    <span className="font-mono text-xs text-steel-500">{p.codigo ?? '—'}</span>
                  </div>
                ))}
                {alertas.productosAgotados.length > 3 && (
                  <p className="text-xs text-brand-red">+{alertas.productosAgotados.length - 3} más</p>
                )}
              </div>
            </div>
          )}

          {alertas.facturasPendientes.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-brand-yellow">
                  <AlertTriangle className="size-4" />
                  {alertas.facturasPendientes.length} factura{alertas.facturasPendientes.length !== 1 ? 's' : ''} próxima{alertas.facturasPendientes.length !== 1 ? 's' : ''} a vencer
                </p>
                <Link href="/dashboard/proveedores" className="text-xs font-medium text-brand-yellow hover:underline">
                  Ver proveedores →
                </Link>
              </div>
              {alertas.facturasPendientes.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
                  <span className="text-steel-300">{f.proveedores?.nombre} · {f.numero_factura ? `#${f.numero_factura}` : 'S/N'}</span>
                  <span className="font-bold text-brand-red">{fmt(f.saldo_pendiente)} · vence {f.fecha_vencimiento}</span>
                </div>
              ))}
            </div>
          )}

          {alertas.pagosProgramados.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-brand-blue">
                  <CalendarClock className="size-4" />
                  {alertas.pagosProgramados.length} pago{alertas.pagosProgramados.length !== 1 ? 's' : ''} programado{alertas.pagosProgramados.length !== 1 ? 's' : ''} próximo{alertas.pagosProgramados.length !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/proveedores" className="text-xs font-medium text-brand-blue hover:underline">
                  Ver proveedores →
                </Link>
              </div>
              {alertas.pagosProgramados.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
                  <span className="text-steel-300">
                    {p.facturas_proveedor?.proveedores?.nombre ?? '—'}
                    {p.nota ? ` · ${p.nota}` : ''}
                  </span>
                  <span className="font-bold text-brand-blue">{fmt(p.monto)} · {p.fecha_programada}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Accesos rápidos ── */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/dashboard/ventas/nueva', icon: ShoppingCart, label: 'Nueva Venta', primary: true },
            { href: '/dashboard/caja', icon: Wallet, label: 'Caja', primary: false },
            { href: '/dashboard/reportes', icon: BarChart3, label: 'Reportes', primary: false },
            { href: '/dashboard/contabilidad', icon: BookOpen, label: 'Contabilidad', primary: false },
            { href: '/dashboard/proveedores', icon: Truck, label: 'Proveedores', primary: false },
            { href: '/dashboard/inventario', icon: Package, label: 'Inventario', primary: false },
          ].map(({ href, icon: Icon, label, primary }) => (
            <Link key={href} href={href}
              className={`flex h-16 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                primary
                  ? 'bg-brand-yellow text-steel-900 hover:brightness-105'
                  : 'border border-white/10 bg-[#111820] text-white hover:border-brand-blue/40'
              }`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-steel-900/10 text-steel-900' : 'bg-brand-blue/15 text-brand-blue'}`}>
                <Icon className="size-6" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Últimas ventas hoy ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Últimas ventas hoy
          </h2>
          <Link href="/dashboard/ventas" className="text-xs text-brand-blue hover:underline">Ver todas →</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead>Ticket</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimasVentas.map((v: any) => (
                  <TableRow key={v.id} className="border-white/8 hover:bg-white/5">
                    <TableCell>
                      <Link href={`/dashboard/ventas/${v.id}`} className="font-mono text-xs font-medium text-brand-blue hover:underline">
                        #{v.numero_ticket}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-steel-300">{v.hora?.slice(0, 5)}</TableCell>
                    <TableCell className="text-xs text-steel-300">{v.clientes?.nombre ?? 'General'}</TableCell>
                    <TableCell className="text-xs text-steel-300">{v.profiles?.nombre_completo ?? '—'}</TableCell>
                    <TableCell className="text-right font-display text-sm font-bold text-white">{fmt(v.total)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        v.estado === 'anulada'
                          ? 'border-brand-red/30 bg-brand-red/20 text-brand-red'
                          : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {v.estado === 'anulada' && <AlertCircle className="size-3" />}
                        {v.estado}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {ultimasVentas.length === 0 && (
                  <TableRow className="border-white/8">
                    <TableCell colSpan={6} className="py-6 text-center text-steel-500">
                      Sin ventas registradas hoy
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}