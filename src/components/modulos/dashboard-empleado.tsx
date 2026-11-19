'use client'

import Link from 'next/link'
import { fechaLarga } from '@/lib/permisos'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Package, Receipt, Calendar, AlertCircle, ClipboardCheck, Users, ListChecks } from 'lucide-react'
import { Input } from '@/components/ui/input'

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}
const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }

interface Props {
  /** Tareas pendientes suyas y libres (null si la hoja de tareas aún no está activa) */
  tareasPendientes: number | null
  profile: {
    nombre_completo: string; rol: string; telefono: string | null
    salario_base: number | null; foto_url: string | null; email: string | null
  }
  config: { nombre: string; logo_url: string | null } | null
  fechaHoy: string
  ventas: any[]
  nominas: any[]
  turnos: any[]
  kpis: { totalVentas: number; numVentas: number; ventaPromedio: number }
  filtros: { ventaDesde: string; ventaHasta: string; nominaDesde: string; nominaHasta: string }
}

export function DashboardEmpleado({ profile, config, fechaHoy, ventas, nominas, turnos, kpis, filtros, tareasPendientes }: Props) {
  if (!profile) {
    return (
      <div className="rounded-2xl bg-superficie p-6 text-center text-sm text-steel-300">
        No se pudo cargar tu perfil. Por favor cierra sesión y vuelve a entrar.
      </div>
    )
  }
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const actualizar = (params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  const turnosOrdenados = [...turnos].sort((a, b) =>
    DIAS_ORDEN.indexOf(a.dia_semana) - DIAS_ORDEN.indexOf(b.dia_semana)
  )

  const totalNominas = nominas.reduce((s, n) => s + Number(n.total_pago), 0)
  const primerNombre = profile.nombre_completo.split(' ')[0]
  const TITULO = 'text-lg font-bold text-tinta'
  const FECHA = 'h-11 rounded-xl border-linea bg-superficie text-[15px] text-tinta'

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-[18px] bg-superficie p-5">
            <p className="text-[15px] font-semibold text-suave">Lo que has vendido en el periodo</p>
            <p className="cifra text-[48px] font-bold leading-none text-tinta">{fmt(kpis.totalVentas)}</p>
            <p className="mt-1 text-[15px] text-suave">
              {kpis.numVentas} {kpis.numVentas === 1 ? 'venta' : 'ventas'}{kpis.numVentas > 0 ? `, de ${fmt(kpis.ventaPromedio)} en promedio` : ''}
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className={TITULO}>Ir a</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: '/dashboard/inventario', icon: Package, label: 'Inventario' },
                { href: '/dashboard/tareas', icon: ListChecks, label: tareasPendientes ? `Tareas (${tareasPendientes})` : 'Tareas' },
                { href: '/dashboard/recepcion', icon: ClipboardCheck, label: 'Recepción' },
                { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
                { href: '/dashboard/empleados/horario', icon: Calendar, label: 'Horario y permisos' },
                { href: '/dashboard/ventas', icon: Receipt, label: 'Mis ventas' },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}
                  className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-superficie px-1 text-center text-sm font-semibold leading-tight text-tinta hover:bg-superficie-2">
                  <Icon className="size-6 text-enlace" strokeWidth={1.75} aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className={TITULO}>Mi horario</h2>
            {turnosOrdenados.length === 0 ? (
              <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-[15px] text-suave">Aún no tienes turnos asignados.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {turnosOrdenados.map((t: any) => (
                  <li key={t.dia_semana} className="rounded-[14px] bg-superficie px-3.5 py-2.5">
                    <p className="text-[15px] font-semibold text-tinta">{DIAS_LABEL[t.dia_semana] ?? t.dia_semana}</p>
                    <p className="cifra text-lg text-suave">{t.hora_inicio?.slice(0, 5)} a {t.hora_fin?.slice(0, 5)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-2.5">
            <h2 className={TITULO}>Mis ventas</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="venta-desde" className="text-sm font-semibold text-suave">Desde</label>
                <Input id="venta-desde" type="date" value={filtros.ventaDesde} onChange={e => actualizar({ venta_desde: e.target.value })} className={FECHA} />
              </div>
              <div className="space-y-1">
                <label htmlFor="venta-hasta" className="text-sm font-semibold text-suave">Hasta</label>
                <Input id="venta-hasta" type="date" value={filtros.ventaHasta} onChange={e => actualizar({ venta_hasta: e.target.value })} className={FECHA} />
              </div>
            </div>
            <ul className="overflow-hidden rounded-2xl bg-superficie">
              {ventas.slice(0, 10).map((v: any) => (
                <li key={v.id} className="border-b border-linea last:border-0">
                  <Link href={`/dashboard/ventas/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-velo/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-tinta">{v.clientes?.nombre ?? 'Mostrador'}</p>
                      <p className="text-sm text-suave">Ticket {v.numero_ticket}, {v.fecha}</p>
                    </div>
                    {v.estado === 'anulada' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] px-2.5 py-1 text-sm font-semibold text-sale">
                        <AlertCircle className="size-3.5" aria-hidden />Anulada
                      </span>
                    ) : <span className="cifra text-xl font-bold text-tinta">{fmt(v.total)}</span>}
                  </Link>
                </li>
              ))}
              {ventas.length === 0 && <li className="px-4 py-8 text-center text-[15px] text-suave">No tienes ventas en estas fechas.</li>}
            </ul>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className={TITULO}>Mi nómina</h2>
              <p className="text-[15px] text-suave">Total <span className="cifra text-xl font-bold text-tinta">{fmt(totalNominas)}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="nomina-desde" className="text-sm font-semibold text-suave">Desde</label>
                <Input id="nomina-desde" type="date" value={filtros.nominaDesde} onChange={e => actualizar({ nomina_desde: e.target.value })} className={FECHA} />
              </div>
              <div className="space-y-1">
                <label htmlFor="nomina-hasta" className="text-sm font-semibold text-suave">Hasta</label>
                <Input id="nomina-hasta" type="date" value={filtros.nominaHasta} onChange={e => actualizar({ nomina_hasta: e.target.value })} className={FECHA} />
              </div>
            </div>
            <ul className="overflow-hidden rounded-2xl bg-superficie">
              {nominas.map((n: any) => (
                <li key={n.id} className="flex items-center gap-3 border-b border-linea px-4 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-tinta">{n.periodo_inicio}</p>
                    <p className="text-sm text-suave">
                      {n.horas_trabajadas != null ? `${n.horas_trabajadas} h, ` : ''}base {fmt(n.salario_base)}
                      {Number(n.bonificaciones) > 0 ? `, +${fmt(n.bonificaciones)} de bonificación` : ''}
                      {Number(n.deducciones) > 0 ? `, −${fmt(n.deducciones)} de descuentos` : ''}
                    </p>
                  </div>
                  <span className="cifra text-xl font-bold text-tinta">{fmt(n.total_pago)}</span>
                </li>
              ))}
              {nominas.length === 0 && <li className="px-4 py-8 text-center text-[15px] text-suave">No hay pagos de nómina en estas fechas.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
