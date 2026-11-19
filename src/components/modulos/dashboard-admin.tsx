'use client'

import Link from 'next/link'
import {
  AlertTriangle, Package, Wallet, BarChart3, Truck, BookOpen, Users, PackageX, CalendarClock,
  AlertCircle, CalendarOff, ClipboardList, ClipboardCheck, DollarSign, ListChecks, ShieldCheck,
} from 'lucide-react'
import { Aviso } from '@/components/ui/aviso'
import { EnlaceA, ProductoConFoto } from '@/components/ui/producto-miniatura'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'
import { fechaLarga } from '@/lib/permisos'

const PAGO_LABEL: Record<string, string> = { efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', tarjeta: 'Tarjeta', mixto: 'Varios medios' }

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
    /** Permisos de hoy a 7 días: el empleado no asiste ese día */
    permisos: { id: string; fecha: string; motivo: string | null; nombre: string }[]
    /** Productos de alta rápida que faltan por completar (hasta 50) */
    porCompletar: { id: string; nombre: string; imagen_url?: string | null }[]
  }
  /** Fecha de hoy en Bogotá, para marcar los permisos de hoy */
  fechaHoyBogota: string
  /** Tareas pendientes de todo el equipo (null si la hoja de tareas aún no está activa) */
  tareasPendientes: number | null
}

export function DashboardAdmin({ profile, config, fechaHoy, kpisHoy, ultimasVentas, alertas, fechaHoyBogota, tareasPendientes }: Props) {
  if (!profile) {
    return (
      <div className="rounded-2xl bg-superficie p-6 text-center text-sm text-steel-300">
        No se pudo cargar tu perfil. Por favor cierra sesión y vuelve a entrar.
      </div>
    )
  }
  const nominaAlDia = kpisHoy.nominasPagadas >= kpisHoy.empleadosActivos
  const primerNombre = profile.nombre_completo.split(' ')[0]
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
  const TITULO = 'text-lg font-bold text-tinta'
  const medios = ['efectivo', 'nequi', 'daviplata', 'tarjeta', 'mixto'].filter(m => (kpisHoy.desglosePago[m] ?? 0) > 0)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight text-tinta">Hola, {primerNombre}</h1>
          <p className="truncate text-[15px] text-suave first-letter:uppercase">{/^\d{4}-\d{2}-\d{2}$/.test(fechaHoy) ? fechaLarga(fechaHoy) : fechaHoy}</p>
        </div>
        {profile.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.foto_url} alt="" className="size-12 shrink-0 rounded-full object-cover" />
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Lo vendido hoy */}
          <section className="rounded-[18px] bg-superficie p-5">
            <p className="text-[15px] font-semibold text-suave">Vendido hoy</p>
            <p className="cifra text-[52px] font-bold leading-none text-tinta">{fmt(kpisHoy.totalVentas)}</p>
            <p className="mt-1 text-[15px] text-suave">
              {plural(kpisHoy.numTickets, 'venta', 'ventas')}{kpisHoy.numTickets > 0 ? `, de ${fmt(kpisHoy.ticketPromedio)} en promedio` : ''}
            </p>
            {medios.length > 0 && (
              <ul className="mt-4 divide-y divide-linea border-t border-linea">
                {medios.map(m => (
                  <li key={m} className="flex items-center gap-3 py-2.5">
                    <MedioPagoIcono medio={m === 'mixto' ? 'varios' : m} className="h-7 w-[42px] shrink-0" />
                    <span className="flex-1 text-[15px] text-tinta">{PAGO_LABEL[m]}</span>
                    <span className="cifra text-xl font-bold text-tinta">{fmt(kpisHoy.desglosePago[m] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/empleados/nomina" className="rounded-[14px] bg-superficie p-4 hover:bg-superficie-2">
              <p className="text-sm text-suave">Nómina de hoy</p>
              <p className={`cifra text-[28px] font-bold leading-tight ${nominaAlDia ? 'text-entra' : 'text-tinta'}`}>
                {kpisHoy.nominasPagadas} de {kpisHoy.empleadosActivos}
              </p>
              <p className="text-sm text-suave">{nominaAlDia ? 'Pagada' : 'Falta pagar'}</p>
            </Link>
            <Link href="/dashboard/caja" className="rounded-[14px] bg-superficie p-4 hover:bg-superficie-2">
              <p className="text-sm text-suave">Caja mayor</p>
              <p className="cifra text-[28px] font-bold leading-tight text-tinta">{fmt(kpisHoy.cajaMayor)}</p>
              <p className="text-sm text-suave">Saldo actual</p>
            </Link>
          </div>

          {/* Accesos */}
          <section className="space-y-2.5">
            <h2 className={TITULO}>Ir a</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                { href: '/dashboard/caja', icon: Wallet, label: 'Caja' },
                { href: '/dashboard/inventario', icon: Package, label: 'Inventario' },
                { href: '/dashboard/recepcion', icon: ClipboardCheck, label: 'Recepción' },
                { href: '/dashboard/proveedores', icon: Truck, label: 'Proveedores' },
                { href: '/dashboard/reportes', icon: BarChart3, label: 'Reportes' },
                { href: '/dashboard/contabilidad', icon: BookOpen, label: 'Contabilidad' },
                { href: '/dashboard/empleados/nomina', icon: DollarSign, label: 'Nómina' },
                { href: '/dashboard/tareas', icon: ListChecks, label: tareasPendientes ? `Tareas (${tareasPendientes})` : 'Tareas' },
                { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
                { href: '/dashboard/bitacora', icon: ShieldCheck, label: 'Bitácora' },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}
                  className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-superficie px-1 text-center text-sm font-semibold leading-tight text-tinta hover:bg-superficie-2">
                  <Icon className="size-6 text-enlace" strokeWidth={1.75} aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Avisos */}
          {(alertas.permisos.length + alertas.porCompletar.length + alertas.productosAgotados.length
            + alertas.facturasPendientes.length + alertas.pagosProgramados.length) > 0 && (
            <section className="space-y-2.5">
              <h2 className={TITULO}>Para tener en cuenta</h2>
              {alertas.permisos.length > 0 && (
                <Aviso tono="info" icono={CalendarOff} accion={{ href: '/dashboard/empleados/horario', texto: 'Horario' }}
                  titulo={`${plural(alertas.permisos.length, 'permiso', 'permisos')} en los próximos días`}>
                  <ul className="space-y-0.5">
                    {alertas.permisos.map(p => (
                      <li key={p.id}><span className="font-semibold text-tinta">{p.nombre}</span> no viene {p.fecha === fechaHoyBogota ? 'hoy' : `el ${fechaLarga(p.fecha)}`}{p.motivo ? `: ${p.motivo}` : ''}</li>
                    ))}
                  </ul>
                </Aviso>
              )}
              {alertas.productosAgotados.length > 0 && (
                <Aviso tono="sale" icono={PackageX} accion={{ href: '/dashboard/inventario/agotados', texto: 'Ver' }}
                  titulo={`${plural(alertas.productosAgotados.length, 'producto agotado', 'productos agotados')}`}>
                  <ul className="space-y-1.5">
                    {alertas.productosAgotados.slice(0, 3).map((p: any) => (
                      <li key={p.id}><ProductoConFoto id={p.id} nombre={p.nombre} url={p.imagen_url} tam="xs" className="text-[15px]" /></li>
                    ))}
                  </ul>
                  {alertas.productosAgotados.length > 3 && <p className="mt-1.5">Y {alertas.productosAgotados.length - 3} más.</p>}
                </Aviso>
              )}
              {alertas.porCompletar.length > 0 && (
                <Aviso icono={ClipboardList} accion={{ href: '/dashboard/inventario/por-completar', texto: 'Completar' }}
                  titulo={`${alertas.porCompletar.length}${alertas.porCompletar.length === 50 ? ' o más' : ''} ${alertas.porCompletar.length === 1 ? 'producto creado' : 'productos creados'} en la venta sin datos completos`}>
                  <ul className="space-y-1.5">
                    {alertas.porCompletar.slice(0, 3).map(p => (
                      <li key={p.id}><ProductoConFoto id={p.id} nombre={p.nombre} url={p.imagen_url} tam="xs" className="text-[15px]" /></li>
                    ))}
                  </ul>
                  {alertas.porCompletar.length > 3 && <p className="mt-1.5">Y {alertas.porCompletar.length - 3} más.</p>}
                </Aviso>
              )}
              {alertas.facturasPendientes.length > 0 && (
                <Aviso icono={AlertTriangle} accion={{ href: '/dashboard/proveedores', texto: 'Ver' }}
                  titulo={`${plural(alertas.facturasPendientes.length, 'factura vence pronto', 'facturas vencen pronto')}`}>
                  <ul className="space-y-0.5">
                    {alertas.facturasPendientes.map((f: any) => (
                      <li key={f.id} className="flex justify-between gap-2">
                        <span><EnlaceA href={f.proveedores?.id ? `/dashboard/proveedores/${f.proveedores.id}` : null}>{f.proveedores?.nombre}</EnlaceA>, vence {fechaLarga(f.fecha_vencimiento)}</span>
                        <span className="cifra text-base font-bold text-tinta">{fmt(f.saldo_pendiente)}</span>
                      </li>
                    ))}
                  </ul>
                </Aviso>
              )}
              {alertas.pagosProgramados.length > 0 && (
                <Aviso tono="info" icono={CalendarClock} accion={{ href: '/dashboard/proveedores', texto: 'Ver' }}
                  titulo={`${plural(alertas.pagosProgramados.length, 'pago programado', 'pagos programados')} a proveedores`}>
                  <ul className="space-y-0.5">
                    {alertas.pagosProgramados.map((p: any) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <span><EnlaceA href={p.facturas_proveedor?.proveedores?.id ? `/dashboard/proveedores/${p.facturas_proveedor.proveedores.id}` : null}>{p.facturas_proveedor?.proveedores?.nombre ?? 'Proveedor'}</EnlaceA>, {fechaLarga(p.fecha_programada)}</span>
                        <span className="cifra text-base font-bold text-tinta">{fmt(p.monto)}</span>
                      </li>
                    ))}
                  </ul>
                </Aviso>
              )}
            </section>
          )}

          {/* Últimas ventas */}
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className={TITULO}>Últimas ventas de hoy</h2>
              <Link href="/dashboard/ventas" className="text-[15px] font-semibold text-enlace">Ver todas</Link>
            </div>
            <ul className="overflow-hidden rounded-2xl bg-superficie">
              {ultimasVentas.map((v: any) => (
                <li key={v.id} className="border-b border-linea last:border-0">
                  <Link href={`/dashboard/ventas/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-velo/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-tinta">{v.clientes?.nombre ?? 'Mostrador'}</p>
                      <p className="truncate text-sm text-suave">Ticket {v.numero_ticket}, {v.hora?.slice(0, 5)}{v.profiles?.nombre_completo ? `, ${v.profiles.nombre_completo.split(' ')[0]}` : ''}</p>
                    </div>
                    {v.estado === 'anulada' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] px-2.5 py-1 text-sm font-semibold text-sale">
                        <AlertCircle className="size-3.5" aria-hidden />Anulada
                      </span>
                    ) : (
                      <span className="cifra text-xl font-bold text-tinta">{fmt(v.total)}</span>
                    )}
                  </Link>
                </li>
              ))}
              {ultimasVentas.length === 0 && (
                <li className="px-4 py-8 text-center text-[15px] text-suave">Aún no hay ventas hoy.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
