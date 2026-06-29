'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  ShoppingCart, Package, TrendingUp, Receipt, BarChart3,
  Phone, Mail, Banknote, Calendar, AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
}
const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }

interface Props {
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

export function DashboardEmpleado({ profile, config, fechaHoy, ventas, nominas, turnos, kpis, filtros }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const actualizar = (params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    router.push(`${pathname}?${p.toString()}`)
  }

  const turnosOrdenados = [...turnos].sort((a, b) =>
    DIAS_ORDEN.indexOf(a.dia_semana) - DIAS_ORDEN.indexOf(b.dia_semana)
  )

  const totalNominas = nominas.reduce((s, n) => s + Number(n.total_pago), 0)
  const esAdmin = profile.rol === 'administrador'

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Perfil + header diagonal ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="relative z-10 flex items-start gap-4">
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
            <p className="mt-1 text-xs text-steel-300">{fechaHoy}{config?.nombre ? ` · ${config.nombre}` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel-300">
              {profile.telefono && (
                <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-steel-500" /> {profile.telefono}</span>
              )}
              {profile.email && (
                <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-steel-500" /> {profile.email}</span>
              )}
              {profile.salario_base && (
                <span className="flex items-center gap-1.5"><Banknote className="size-3.5 text-steel-500" /> Salario base: {fmt(profile.salario_base)}/día</span>
              )}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-yellow bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Total ventas</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-yellow/15 p-2 text-brand-yellow">
              <TrendingUp className="size-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-emerald-400 md:text-3xl">{fmt(kpis.totalVentas)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">N° ventas</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-blue/15 p-2 text-brand-blue">
              <Receipt className="size-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-white md:text-3xl">{kpis.numVentas}</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Venta promedio</p>
            <span className="flex items-center justify-center rounded-xl bg-brand-blue/15 p-2 text-brand-blue">
              <BarChart3 className="size-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-white md:text-3xl">{fmt(kpis.ventaPromedio)}</p>
        </div>
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/ventas/nueva"
          className="flex h-16 items-center gap-3 rounded-2xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 transition hover:brightness-105">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-steel-900/10">
            <ShoppingCart className="size-6" />
          </span>
          Nueva Venta
        </Link>
        <Link href="/dashboard/inventario"
          className="flex h-16 items-center gap-3 rounded-2xl border border-white/10 bg-[#111820] px-4 text-sm font-bold text-white transition hover:border-brand-blue/40">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
            <Package className="size-6" />
          </span>
          Inventario
        </Link>
      </div>

      {/* ── Mis ventas con filtro ── */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Mis ventas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-steel-300">Desde</label>
            <Input type="date" value={filtros.ventaDesde}
              onChange={e => actualizar({ venta_desde: e.target.value })}
              className="h-11 rounded-xl border-white/10 bg-[#1a2430] text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-steel-300">Hasta</label>
            <Input type="date" value={filtros.ventaHasta}
              onChange={e => actualizar({ venta_hasta: e.target.value })}
              className="h-11 rounded-xl border-white/10 bg-[#1a2430] text-sm text-white" />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead>Ticket</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.slice(0, 10).map((v: any) => (
                  <TableRow key={v.id} className="border-white/8 hover:bg-white/5">
                    <TableCell>
                      <Link href={`/dashboard/ventas/${v.id}`} className="font-mono text-xs font-medium text-brand-blue hover:underline">
                        #{v.numero_ticket}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-steel-300">{v.fecha}</TableCell>
                    <TableCell className="text-xs text-steel-300">{v.clientes?.nombre ?? 'General'}</TableCell>
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
                {ventas.length === 0 && (
                  <TableRow className="border-white/8">
                    <TableCell colSpan={5} className="py-6 text-center text-steel-500">
                      Sin ventas en este período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ── Horario ── */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Mi horario
        </h2>
        {turnosOrdenados.length === 0 ? (
          <p className="text-sm text-steel-300">Sin turnos asignados</p>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {turnosOrdenados.map((t: any) => (
                <div key={t.dia_semana} className="rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-white">
                    <Calendar className="size-3.5 text-brand-blue" />
                    {DIAS_LABEL[t.dia_semana] ?? t.dia_semana}
                  </p>
                  <p className="mt-0.5 text-xs text-steel-300">
                    {t.hora_inicio?.slice(0, 5)} – {t.hora_fin?.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Nóminas ── */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Mi nómina
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-steel-300">Desde</label>
              <Input type="date" value={filtros.nominaDesde}
                onChange={e => actualizar({ nomina_desde: e.target.value })}
                className="h-11 rounded-xl border-white/10 bg-[#1a2430] text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-steel-300">Hasta</label>
              <Input type="date" value={filtros.nominaHasta}
                onChange={e => actualizar({ nomina_hasta: e.target.value })}
                className="h-11 rounded-xl border-white/10 bg-[#1a2430] text-sm text-white" />
            </div>
          </div>
          <div className="pb-1">
            <span className="text-sm text-steel-300">
              Total: <span className="font-display font-bold text-emerald-400">{fmt(totalNominas)}</span>
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Salario base</TableHead>
                  <TableHead className="text-right">Bonif.</TableHead>
                  <TableHead className="text-right">Deduc.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nominas.map((n: any) => (
                  <TableRow key={n.id} className="border-white/8 hover:bg-white/5">
                    <TableCell className="text-xs text-steel-300">{n.periodo_inicio}</TableCell>
                    <TableCell className="text-right text-xs text-steel-300">
                      {n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-white">{fmt(n.salario_base)}</TableCell>
                    <TableCell className="text-right text-xs text-emerald-400">
                      {Number(n.bonificaciones) > 0 ? `+${fmt(n.bonificaciones)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-brand-red">
                      {Number(n.deducciones) > 0 ? `-${fmt(n.deducciones)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-display text-sm font-bold text-white">{fmt(n.total_pago)}</TableCell>
                  </TableRow>
                ))}
                {nominas.length === 0 && (
                  <TableRow className="border-white/8">
                    <TableCell colSpan={6} className="py-6 text-center text-steel-500">
                      Sin nóminas en este período
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