'use client'

import Link from 'next/link'
import {
  AlertTriangle, ShoppingCart, Package, Wallet, BarChart3, Truck, BookOpen,
  TrendingUp, Receipt, Users, PackageX, CalendarClock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', nequi: 'Nequi',
  daviplata: 'Daviplata', tarjeta: 'Tarjeta', mixto: 'Mixto',
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

  return (
    <div className="space-y-6">
      {/* Header con logo */}
      <div className="flex items-center gap-4">
        {config?.logo_url && (
          <img src={config.logo_url} alt="Logo" className="h-14 w-auto rounded-lg object-contain shadow-sm" />
        )}
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">
            Bienvenido, {profile.nombre_completo.split(' ')[0]}
          </h1>
          <p className="text-sm text-steel-500">{fechaHoy} · {config?.nombre ?? ''}</p>
        </div>
      </div>

      {/* Datos personales */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        {profile.foto_url ? (
          <img src={profile.foto_url} alt="Foto" className="h-14 w-14 rounded-full border object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-soft text-xl font-bold text-brand-blue">
            {profile.nombre_completo.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-semibold text-steel-900">{profile.nombre_completo}</p>
          <Badge variant="secondary" className="mt-0.5 capitalize">{profile.rol}</Badge>
        </div>
      </div>

      {/* KPIs hoy */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Ventas hoy — destacado */}
        <div className="rounded-xl border border-steel-900 bg-steel-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-300">Ventas hoy</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-yellow">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold">{fmt(kpisHoy.totalVentas)}</p>
          <p className="text-xs text-steel-300">{kpisHoy.numTickets} tickets</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Ticket promedio</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-steel-500">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-steel-900">{fmt(kpisHoy.ticketPromedio)}</p>
        </div>

        <div className={`rounded-xl border p-5 ${nominaAlDia ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Nómina hoy</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${nominaAlDia ? 'bg-green-50 text-green-700' : 'bg-amber-100 text-amber-600'}`}>
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className={`mt-2 font-display text-3xl font-bold ${nominaAlDia ? 'text-green-700' : 'text-amber-600'}`}>
            {kpisHoy.nominasPagadas}/{kpisHoy.empleadosActivos}
          </p>
          <p className="text-xs text-steel-300">{nominaAlDia ? 'Al día' : 'Pendientes'}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Caja Mayor</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-brand-blue">{fmt(kpisHoy.cajaMayor)}</p>
        </div>
      </div>

      {/* Desglose medios de pago */}
      {Object.keys(kpisHoy.desglosePago).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
            <span className="h-4 w-1 rounded-full bg-brand-yellow" />
            Por medio de pago — hoy
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {['efectivo', 'nequi', 'daviplata', 'tarjeta', 'mixto'].map(m => (
              <div key={m} className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xs text-steel-500">{METODO_LABEL[m]}</p>
                <p className="mt-0.5 font-display text-lg font-bold text-steel-900">{fmt(kpisHoy.desglosePago[m] ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {totalAlertas > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas ({totalAlertas})
          </h2>

          {alertas.productosAgotados.length > 0 && (
            <div className="space-y-2 rounded-xl border border-brand-red/20 bg-brand-red-soft p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-red">
                  <PackageX className="h-4 w-4" />
                  {alertas.productosAgotados.length} producto{alertas.productosAgotados.length !== 1 ? 's' : ''} agotado{alertas.productosAgotados.length !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/inventario/agotados"
                  className="text-xs font-medium text-brand-red hover:underline">
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-1">
                {alertas.productosAgotados.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex justify-between rounded bg-white/60 px-2 py-1 text-xs text-steel-700">
                    <span>{p.nombre}</span>
                    <span className="text-steel-500">{p.codigo ?? '—'}</span>
                  </div>
                ))}
                {alertas.productosAgotados.length > 3 && (
                  <p className="text-xs text-brand-red">+{alertas.productosAgotados.length - 3} más</p>
                )}
              </div>
            </div>
          )}

          {alertas.facturasPendientes.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  {alertas.facturasPendientes.length} factura{alertas.facturasPendientes.length !== 1 ? 's' : ''} próxima{alertas.facturasPendientes.length !== 1 ? 's' : ''} a vencer
                </p>
                <Link href="/dashboard/proveedores"
                  className="text-xs font-medium text-amber-700 hover:underline">
                  Ver proveedores →
                </Link>
              </div>
              {alertas.facturasPendientes.map((f: any) => (
                <div key={f.id} className="flex justify-between rounded border bg-white px-2 py-1 text-xs">
                  <span className="text-steel-700">{f.proveedores?.nombre} · {f.numero_factura ? `#${f.numero_factura}` : 'S/N'}</span>
                  <span className="font-medium text-brand-red">{fmt(f.saldo_pendiente)} · vence {f.fecha_vencimiento}</span>
                </div>
              ))}
            </div>
          )}

          {alertas.pagosProgramados.length > 0 && (
            <div className="space-y-2 rounded-xl border border-brand-blue/20 bg-brand-blue-soft p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-blue-dark">
                  <CalendarClock className="h-4 w-4" />
                  {alertas.pagosProgramados.length} pago{alertas.pagosProgramados.length !== 1 ? 's' : ''} programado{alertas.pagosProgramados.length !== 1 ? 's' : ''} próximo{alertas.pagosProgramados.length !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/proveedores"
                  className="text-xs font-medium text-brand-blue hover:underline">
                  Ver proveedores →
                </Link>
              </div>
              {alertas.pagosProgramados.map((p: any) => (
                <div key={p.id} className="flex justify-between rounded border bg-white px-2 py-1 text-xs">
                  <span className="text-steel-700">
                    {p.facturas_proveedor?.proveedores?.nombre ?? '—'}
                    {p.nota ? ` · ${p.nota}` : ''}
                  </span>
                  <span className="font-medium text-brand-blue">{fmt(p.monto)} · {p.fecha_programada}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
          <span className="h-4 w-1 rounded-full bg-brand-yellow" />
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            { href: '/dashboard/ventas/nueva', icon: ShoppingCart, label: 'Nueva Venta', primary: true },
            { href: '/dashboard/caja', icon: Wallet, label: 'Caja', primary: false },
            { href: '/dashboard/reportes', icon: BarChart3, label: 'Reportes', primary: false },
            { href: '/dashboard/contabilidad', icon: BookOpen, label: 'Contabilidad', primary: false },
            { href: '/dashboard/proveedores', icon: Truck, label: 'Proveedores', primary: false },
            { href: '/dashboard/inventario', icon: Package, label: 'Inventario', primary: false },
          ].map(({ href, icon: Icon, label, primary }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl p-4 text-sm font-semibold transition ${
                primary
                  ? 'bg-brand-yellow text-steel-900 shadow-lg shadow-brand-yellow/30 hover:brightness-105'
                  : 'border border-slate-200 bg-white text-steel-900 hover:border-brand-blue/40 hover:shadow-sm'
              }`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${primary ? 'bg-steel-900/10' : 'bg-brand-blue-soft text-brand-blue'}`}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Últimas ventas hoy */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
            <span className="h-4 w-1 rounded-full bg-brand-yellow" />
            Últimas ventas hoy
          </h2>
          <Link href="/dashboard/ventas" className="text-xs text-brand-blue hover:underline">Ver todas →</Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
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
                <TableRow key={v.id} className="cursor-pointer hover:bg-slate-50">
                  <TableCell>
                    <Link href={`/dashboard/ventas/${v.id}`} className="font-medium text-brand-blue hover:underline">
                      #{v.numero_ticket}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-steel-500">{v.hora?.slice(0, 5)}</TableCell>
                  <TableCell className="text-sm text-steel-500">{v.clientes?.nombre ?? 'General'}</TableCell>
                  <TableCell className="text-sm text-steel-500">{v.profiles?.nombre_completo ?? '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-steel-900">{fmt(v.total)}</TableCell>
                  <TableCell>
                    <Badge variant={v.estado === 'anulada' ? 'destructive' : 'default'} className="text-xs">
                      {v.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ultimasVentas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-steel-300">
                    Sin ventas registradas hoy
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}