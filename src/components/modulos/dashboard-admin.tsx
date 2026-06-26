'use client'

import Link from 'next/link'
import { AlertTriangle, ShoppingCart, Package, Wallet, BarChart3, Truck, BookOpen } from 'lucide-react'
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
          <img src={config.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bienvenido, {profile.nombre_completo.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500">{fechaHoy} · {config?.nombre ?? ''}</p>
        </div>
      </div>

      {/* Datos personales */}
      <div className="rounded-lg border bg-white p-4 flex items-center gap-4">
        {profile.foto_url ? (
          <img src={profile.foto_url} alt="Foto" className="h-14 w-14 rounded-full object-cover border" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xl font-bold">
            {profile.nombre_completo.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-semibold text-slate-900">{profile.nombre_completo}</p>
          <Badge variant="secondary" className="capitalize mt-0.5">{profile.rol}</Badge>
        </div>
      </div>

      {/* KPIs hoy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Ventas hoy</p>
          <p className="mt-1 text-xl font-bold text-green-700">{fmt(kpisHoy.totalVentas)}</p>
          <p className="text-xs text-slate-400">{kpisHoy.numTickets} tickets</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Ticket promedio</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{fmt(kpisHoy.ticketPromedio)}</p>
        </div>
        <div className={`rounded-lg border p-4 ${nominaAlDia ? 'bg-white' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs text-slate-500">Nómina hoy</p>
          <p className={`mt-1 text-xl font-bold ${nominaAlDia ? 'text-green-700' : 'text-amber-600'}`}>
            {kpisHoy.nominasPagadas}/{kpisHoy.empleadosActivos}
          </p>
          <p className="text-xs text-slate-400">{nominaAlDia ? 'Al día' : 'Pendientes'}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Caja Mayor</p>
          <p className="mt-1 text-xl font-bold text-blue-700">{fmt(kpisHoy.cajaMayor)}</p>
        </div>
      </div>

      {/* Desglose medios de pago */}
      {Object.keys(kpisHoy.desglosePago).length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-slate-600 mb-3">Por medio de pago — hoy</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['efectivo', 'nequi', 'daviplata', 'tarjeta', 'mixto'].map(m => (
              <div key={m} className="text-center">
                <p className="text-xs text-slate-500">{METODO_LABEL[m]}</p>
                <p className="font-bold text-slate-900 mt-0.5">{fmt(kpisHoy.desglosePago[m] ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {totalAlertas > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas ({totalAlertas})
          </h2>

          {alertas.productosAgotados.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-800">
                  🚫 {alertas.productosAgotados.length} producto{alertas.productosAgotados.length !== 1 ? 's' : ''} agotado{alertas.productosAgotados.length !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/inventario/agotados"
                  className="text-xs text-red-700 hover:underline font-medium">
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-1">
                {alertas.productosAgotados.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs text-red-700">
                    <span>{p.nombre}</span>
                    <span className="text-slate-500">{p.codigo ?? '—'}</span>
                  </div>
                ))}
                {alertas.productosAgotados.length > 3 && (
                  <p className="text-xs text-red-500">+{alertas.productosAgotados.length - 3} más</p>
                )}
              </div>
            </div>
          )}

          {alertas.facturasPendientes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-800">
                  ⚠ {alertas.facturasPendientes.length} factura{alertas.facturasPendientes.length !== 1 ? 's' : ''} próxima{alertas.facturasPendientes.length !== 1 ? 's' : ''} a vencer
                </p>
                <Link href="/dashboard/proveedores"
                  className="text-xs text-amber-700 hover:underline font-medium">
                  Ver proveedores →
                </Link>
              </div>
              {alertas.facturasPendientes.map((f: any) => (
                <div key={f.id} className="flex justify-between text-xs rounded bg-white border px-2 py-1">
                  <span className="text-slate-700">{f.proveedores?.nombre} · {f.numero_factura ? `#${f.numero_factura}` : 'S/N'}</span>
                  <span className="text-red-600 font-medium">{fmt(f.saldo_pendiente)} · vence {f.fecha_vencimiento}</span>
                </div>
              ))}
            </div>
          )}

          {alertas.pagosProgramados.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-800">
                  📅 {alertas.pagosProgramados.length} pago{alertas.pagosProgramados.length !== 1 ? 's' : ''} programado{alertas.pagosProgramados.length !== 1 ? 's' : ''} próximo{alertas.pagosProgramados.length !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/proveedores"
                  className="text-xs text-blue-700 hover:underline font-medium">
                  Ver proveedores →
                </Link>
              </div>
              {alertas.pagosProgramados.map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs rounded bg-white border px-2 py-1">
                  <span className="text-slate-700">
                    {p.facturas_proveedor?.proveedores?.nombre ?? '—'}
                    {p.nota ? ` · ${p.nota}` : ''}
                  </span>
                  <span className="text-blue-700 font-medium">{fmt(p.monto)} · {p.fecha_programada}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: '/dashboard/ventas/nueva', icon: ShoppingCart, label: 'Nueva Venta', color: 'bg-slate-900 text-white' },
            { href: '/dashboard/caja', icon: Wallet, label: 'Caja', color: 'bg-white border' },
            { href: '/dashboard/reportes', icon: BarChart3, label: 'Reportes', color: 'bg-white border' },
            { href: '/dashboard/contabilidad', icon: BookOpen, label: 'Contabilidad', color: 'bg-white border' },
            { href: '/dashboard/proveedores', icon: Truck, label: 'Proveedores', color: 'bg-white border' },
            { href: '/dashboard/inventario', icon: Package, label: 'Inventario', color: 'bg-white border' },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-lg p-4 font-medium text-sm hover:opacity-90 transition-opacity ${color}`}>
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Últimas ventas hoy */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Últimas ventas hoy</h2>
          <Link href="/dashboard/ventas" className="text-xs text-slate-500 hover:underline">Ver todas →</Link>
        </div>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
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
                    <Link href={`/dashboard/ventas/${v.id}`} className="font-medium hover:underline">
                      #{v.numero_ticket}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{v.hora?.slice(0, 5)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{v.clientes?.nombre ?? 'General'}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{v.profiles?.nombre_completo ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(v.total)}</TableCell>
                  <TableCell>
                    <Badge variant={v.estado === 'anulada' ? 'destructive' : 'default'} className="text-xs">
                      {v.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ultimasVentas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-6">
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