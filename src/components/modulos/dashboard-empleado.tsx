'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  ShoppingCart, Package, TrendingUp, Receipt, BarChart3,
  Phone, Mail, Banknote, Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-4">
          {profile.foto_url ? (
            <img src={profile.foto_url} alt="Foto"
              className="h-16 w-16 shrink-0 rounded-full border object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-2xl font-bold text-brand-blue">
              {profile.nombre_completo.charAt(0)}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-lg font-semibold text-steel-900">{profile.nombre_completo}</p>
            <Badge variant="secondary" className="capitalize">{profile.rol}</Badge>
            <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-steel-700 sm:grid-cols-2">
              {profile.telefono && (
                <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-steel-300" /> {profile.telefono}</span>
              )}
              {profile.email && (
                <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-steel-300" /> {profile.email}</span>
              )}
              {profile.salario_base && (
                <span className="flex items-center gap-2"><Banknote className="h-4 w-4 text-steel-300" /> Salario base: {fmt(profile.salario_base)}/día</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-steel-900 bg-steel-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-300">Total ventas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-yellow">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold md:text-3xl">{fmt(kpis.totalVentas)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">N° ventas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-steel-500">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-steel-900 md:text-3xl">{kpis.numVentas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Venta promedio</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
              <BarChart3 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-steel-900 md:text-3xl">{fmt(kpis.ventaPromedio)}</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/ventas/nueva"
          className="flex items-center gap-3 rounded-xl bg-brand-yellow p-4 text-sm font-semibold text-steel-900 shadow-lg shadow-brand-yellow/30 transition hover:brightness-105">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-steel-900/10">
            <ShoppingCart className="h-5 w-5" />
          </span>
          Nueva Venta
        </Link>
        <Link href="/dashboard/inventario"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-steel-900 transition hover:border-brand-blue/40 hover:shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
            <Package className="h-5 w-5" />
          </span>
          Inventario
        </Link>
      </div>

      {/* Últimas ventas con filtro */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
          <span className="h-4 w-1 rounded-full bg-brand-yellow" />
          Mis ventas
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs text-steel-500">Desde</label>
            <Input type="date" value={filtros.ventaDesde}
              onChange={e => actualizar({ venta_desde: e.target.value })} className="h-8 w-36 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500">Hasta</label>
            <Input type="date" value={filtros.ventaHasta}
              onChange={e => actualizar({ venta_hasta: e.target.value })} className="h-8 w-36 text-xs" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Ticket</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.slice(0, 10).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link href={`/dashboard/ventas/${v.id}`} className="font-medium text-brand-blue hover:underline">
                      #{v.numero_ticket}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-steel-500">{v.fecha}</TableCell>
                  <TableCell className="text-sm text-steel-500">{v.clientes?.nombre ?? 'General'}</TableCell>
                  <TableCell className="text-right font-semibold text-steel-900">{fmt(v.total)}</TableCell>
                  <TableCell>
                    <Badge variant={v.estado === 'anulada' ? 'destructive' : 'default'} className="text-xs">
                      {v.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ventas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-steel-300">
                    Sin ventas en este período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Horario */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
          <span className="h-4 w-1 rounded-full bg-brand-yellow" />
          Mi horario
        </h2>
        {turnosOrdenados.length === 0 ? (
          <p className="text-sm text-steel-300">Sin turnos asignados</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {turnosOrdenados.map((t: any) => (
                <div key={t.dia_semana} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-steel-700">
                    <Calendar className="h-3.5 w-3.5 text-brand-blue" />
                    {DIAS_LABEL[t.dia_semana] ?? t.dia_semana}
                  </p>
                  <p className="mt-0.5 text-xs text-steel-500">
                    {t.hora_inicio?.slice(0, 5)} – {t.hora_fin?.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nóminas */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-steel-500">
          <span className="h-4 w-1 rounded-full bg-brand-yellow" />
          Mi nómina
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs text-steel-500">Desde</label>
            <Input type="date" value={filtros.nominaDesde}
              onChange={e => actualizar({ nomina_desde: e.target.value })} className="h-8 w-36 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500">Hasta</label>
            <Input type="date" value={filtros.nominaHasta}
              onChange={e => actualizar({ nomina_hasta: e.target.value })} className="h-8 w-36 text-xs" />
          </div>
          <div className="self-end pb-1">
            <span className="text-sm font-medium text-steel-700">
              Total: <span className="font-bold text-green-700">{fmt(totalNominas)}</span>
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
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
                <TableRow key={n.id}>
                  <TableCell className="text-sm text-steel-500">{n.periodo_inicio}</TableCell>
                  <TableCell className="text-right text-sm text-steel-500">
                    {n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmt(n.salario_base)}</TableCell>
                  <TableCell className="text-right text-sm text-green-700">
                    {Number(n.bonificaciones) > 0 ? `+${fmt(n.bonificaciones)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-brand-red">
                    {Number(n.deducciones) > 0 ? `-${fmt(n.deducciones)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-steel-900">{fmt(n.total_pago)}</TableCell>
                </TableRow>
              ))}
              {nominas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-steel-300">
                    Sin nóminas en este período
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