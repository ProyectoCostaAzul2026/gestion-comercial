'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShoppingCart, Package } from 'lucide-react'
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
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-start gap-4">
          {profile.foto_url ? (
            <img src={profile.foto_url} alt="Foto"
              className="h-16 w-16 rounded-full object-cover border shrink-0" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-bold shrink-0">
              {profile.nombre_completo.charAt(0)}
            </div>
          )}
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 text-lg">{profile.nombre_completo}</p>
            <Badge variant="secondary" className="capitalize">{profile.rol}</Badge>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-2 text-sm text-slate-600">
              {profile.telefono && <span>📞 {profile.telefono}</span>}
              {profile.email && <span>✉ {profile.email}</span>}
              {profile.salario_base && (
                <span>💰 Salario base: {fmt(profile.salario_base)}/día</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-xs text-slate-500">Total ventas</p>
          <p className="mt-1 text-xl font-bold text-green-700">{fmt(kpis.totalVentas)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-xs text-slate-500">N° ventas</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{kpis.numVentas}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-xs text-slate-500">Venta promedio</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{fmt(kpis.ventaPromedio)}</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/ventas/nueva"
          className="flex items-center gap-3 rounded-lg bg-slate-900 text-white p-4 font-medium text-sm hover:bg-slate-800">
          <ShoppingCart className="h-5 w-5" />
          Nueva Venta
        </Link>
        <Link href="/dashboard/inventario"
          className="flex items-center gap-3 rounded-lg border bg-white p-4 font-medium text-sm hover:bg-slate-50">
          <Package className="h-5 w-5" />
          Inventario
        </Link>
      </div>

      {/* Últimas ventas con filtro */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Mis ventas</h2>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Desde</label>
            <Input type="date" value={filtros.ventaDesde}
              onChange={e => actualizar({ venta_desde: e.target.value })} className="w-36 h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Hasta</label>
            <Input type="date" value={filtros.ventaHasta}
              onChange={e => actualizar({ venta_hasta: e.target.value })} className="w-36 h-8 text-xs" />
          </div>
        </div>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
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
                    <Link href={`/dashboard/ventas/${v.id}`} className="font-medium hover:underline">
                      #{v.numero_ticket}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{v.fecha}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{v.clientes?.nombre ?? 'General'}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(v.total)}</TableCell>
                  <TableCell>
                    <Badge variant={v.estado === 'anulada' ? 'destructive' : 'default'} className="text-xs">
                      {v.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ventas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-6">
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
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Mi horario</h2>
        {turnosOrdenados.length === 0 ? (
          <p className="text-sm text-slate-400">Sin turnos asignados</p>
        ) : (
          <div className="rounded-lg border bg-white p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {turnosOrdenados.map((t: any) => (
                <div key={t.dia_semana} className="rounded-md bg-slate-50 border px-3 py-2 text-sm">
                  <p className="font-medium text-slate-700">{DIAS_LABEL[t.dia_semana] ?? t.dia_semana}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
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
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Mi nómina</h2>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Desde</label>
            <Input type="date" value={filtros.nominaDesde}
              onChange={e => actualizar({ nomina_desde: e.target.value })} className="w-36 h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Hasta</label>
            <Input type="date" value={filtros.nominaHasta}
              onChange={e => actualizar({ nomina_hasta: e.target.value })} className="w-36 h-8 text-xs" />
          </div>
          <div className="self-end pb-1">
            <span className="text-sm font-medium text-slate-700">
              Total: <span className="text-green-700 font-bold">{fmt(totalNominas)}</span>
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell className="text-slate-500 text-sm">{n.periodo_inicio}</TableCell>
                  <TableCell className="text-right text-sm text-slate-500">
                    {n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmt(n.salario_base)}</TableCell>
                  <TableCell className="text-right text-sm text-green-700">
                    {Number(n.bonificaciones) > 0 ? `+${fmt(n.bonificaciones)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-red-600">
                    {Number(n.deducciones) > 0 ? `-${fmt(n.deducciones)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-bold">{fmt(n.total_pago)}</TableCell>
                </TableRow>
              ))}
              {nominas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-6">
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