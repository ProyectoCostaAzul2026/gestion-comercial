'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, ChevronDown, ChevronUp, FileSpreadsheet, Plus } from 'lucide-react'
import { toast } from '@/lib/avisos'
import { hoyBogota } from '@/lib/fechas'
import { cantidadVendida, costoLineaVenta, costoPorUnidadVendida } from '@/lib/costo-venta'
import type { Periodo } from '@/lib/periodos'
import { SelectorPeriodo } from './selector-periodo'

function exportarCSVCompleto(data: {
  ventas: any[]
  ventaServicios: any[]
  ventaItems: any[]
  gastos: any[]
  nominas: any[]
  desde: string
  hasta: string
}) {
  const filas: string[][] = []
  filas.push([`CONTABILIDAD — ${data.desde} al ${data.hasta}`])
  filas.push([])
  filas.push(['=== INGRESOS — VENTAS ==='])
  filas.push(['Ticket', 'Fecha', 'Cliente', 'Total', 'Tipo Pago'])
  data.ventas.forEach(v => filas.push([`#${v.numero_ticket}`, v.fecha, v.clientes?.nombre ?? 'General', String(v.total), v.tipo_pago]))
  filas.push(['', '', 'TOTAL', String(data.ventas.reduce((s: number, v: any) => s + Number(v.total), 0)), ''])
  filas.push([])
  filas.push(['=== SERVICIOS (ya incluidos en el total de las ventas) ==='])
  filas.push(['Servicio', 'Fecha', 'Ticket', 'Monto'])
  data.ventaServicios.forEach(s => filas.push([s.nombre_servicio, s.ventas?.fecha ?? '', `#${s.ventas?.numero_ticket ?? ''}`, String(s.precio_aplicado)]))
  filas.push(['', '', 'TOTAL', String(data.ventaServicios.reduce((s: number, v: any) => s + Number(v.precio_aplicado), 0))])
  filas.push([])
  filas.push(['=== COSTOS DE MERCANCÍA ==='])
  filas.push(['Producto', 'Cantidad', 'Costo unitario', 'Total costo', 'Proveedor'])
  data.ventaItems.forEach(i => {
    const cant = cantidadVendida(i)
    filas.push([i.nombre_producto, String(cant), String(Math.round(costoPorUnidadVendida(i) * 100) / 100), String(Math.round(costoLineaVenta(i))), i.productos?.producto_proveedores?.[0]?.proveedores?.nombre ?? '—'])
  })
  filas.push([])
  filas.push(['=== GASTOS ==='])
  filas.push(['Fecha', 'Concepto', 'Categoría', 'Monto', 'Método', 'Proveedor'])
  data.gastos.forEach(g => filas.push([g.fecha, g.concepto, g.categoria_gasto ?? '', String(g.monto), g.metodo_pago, g.proveedores?.nombre ?? '']))
  filas.push(['', '', 'TOTAL', String(data.gastos.reduce((s: number, g: any) => s + Number(g.monto), 0)), '', ''])
  filas.push([])
  filas.push(['=== NÓMINAS ==='])
  filas.push(['Fecha', 'Empleado', 'Horas', 'Salario base', 'Bonif.', 'Deduc.', 'Total'])
  data.nominas.forEach(n => filas.push([n.periodo_inicio, n.profiles?.nombre_completo ?? '—', String(n.horas_trabajadas ?? ''), String(n.salario_base), String(n.bonificaciones), String(n.deducciones), String(n.total_pago)]))
  filas.push(['', '', '', '', '', 'TOTAL', String(data.nominas.reduce((s: number, n: any) => s + Number(n.total_pago), 0))])
  const csv = filas.map(f => f.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contabilidad-${data.desde}-${data.hasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exportado')
}

function SeccionTabla({ titulo, total, color, headerBg, children }: {
  titulo: string; total: number; color: string; headerBg?: string; children: React.ReactNode
}) {
  const [abierta, setAbierta] = useState(true)
  return (
    <div className="overflow-hidden rounded-2xl bg-superficie">
      <button type="button" onClick={() => setAbierta(v => !v)}
        aria-expanded={abierta} data-encabezado={headerBg ? 'destacado' : undefined}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-tinta transition-colors hover:bg-velo/5">
        <span className="text-lg font-bold">{titulo}</span>
        <div className="flex items-center gap-3">
          <span className={`cifra text-xl font-bold ${color}`}>{pesosRedondos(total)}</span>
          {abierta ? <ChevronUp className="size-5 text-suave" /> : <ChevronDown className="size-5 text-suave" />}
        </div>
      </button>
      {abierta && <div className="border-t border-linea">{children}</div>}
    </div>
  )
}

interface ContabilidadPanelProps {
  ventas: any[]
  ventaServicios: any[]
  ventaItems: any[]
  gastos: any[]
  nominas: any[]
  proveedores: { id: string; nombre: string }[]
  empleados: { id: string; nombre_completo: string }[]
  categoriasGasto: { id: string; nombre: string }[]
  cuentasCobrar: any[]
  cuentasPagar: any[]
  nombresClientesCredito: string[]
  desde: string
  hasta: string
  periodo: Periodo
  balance: {
    totalIngresos: number
    totalServicios: number
    totalCMV: number
    totalGastos: number
    totalNominas: number
    resultado: number
    totalCobrar: number
    totalPagar: number
  }
}

export function ContabilidadPanel({
  ventas, ventaServicios, ventaItems, gastos, nominas,
  proveedores, empleados, categoriasGasto,
  cuentasCobrar, cuentasPagar, nombresClientesCredito,
  desde, hasta, periodo, balance,
}: ContabilidadPanelProps) {

  const [filtroTipoIngreso, setFiltroTipoIngreso] = useState('todos')
  const [filtroProveedorCosto, setFiltroProveedorCosto] = useState('todos')
  const [filtroCategoriaGasto, setFiltroCategoriaGasto] = useState('todas')
  const [filtroEmpleadoNomina, setFiltroEmpleadoNomina] = useState('todos')
  const [filtroEstadoCobrar, setFiltroEstadoCobrar] = useState('todos')
  const [filtroClienteCobrar, setFiltroClienteCobrar] = useState('todos')
  const [filtroEstadoPagar, setFiltroEstadoPagar] = useState('todos')
  const [filtroProveedorPagar, setFiltroProveedorPagar] = useState('todos')


  const categoriasEnTabla = useMemo(() => categoriasGasto.map(c => c.nombre), [categoriasGasto])

  const ventasFiltradas = useMemo(() => filtroTipoIngreso === 'servicios' ? [] : ventas, [ventas, filtroTipoIngreso])
  const serviciosFiltrados = useMemo(() => filtroTipoIngreso === 'ventas' ? [] : ventaServicios, [ventaServicios, filtroTipoIngreso])
  const totalIngresosTabla = useMemo(() =>
    // El total de la venta ya incluye sus servicios: con "Todos" solo se suman las ventas
    filtroTipoIngreso === 'servicios'
      ? serviciosFiltrados.reduce((s, vs) => s + Number(vs.precio_aplicado), 0)
      : ventasFiltradas.reduce((s, v) => s + Number(v.total), 0),
    [ventasFiltradas, serviciosFiltrados, filtroTipoIngreso])

  const costosFiltrados = useMemo(() =>
    filtroProveedorCosto === 'todos' ? ventaItems :
    ventaItems.filter(i => i.productos?.producto_proveedores?.[0]?.proveedor_id === filtroProveedorCosto),
    [ventaItems, filtroProveedorCosto])

  const totalCMVTabla = useMemo(() =>
    costosFiltrados.reduce((s, i) => s + costoLineaVenta(i), 0), [costosFiltrados])

  const gastosFiltrados = useMemo(() =>
    filtroCategoriaGasto === 'todas' ? gastos : gastos.filter(g => g.categoria_gasto === filtroCategoriaGasto),
    [gastos, filtroCategoriaGasto])

  const totalGastosTabla = useMemo(() =>
    gastosFiltrados.reduce((s, g) => s + Number(g.monto), 0), [gastosFiltrados])

  const nominasFiltradas = useMemo(() => {
    if (filtroEmpleadoNomina === 'todos') return nominas
    return nominas.filter(n => {
      const emp = empleados.find(e => e.nombre_completo === n.profiles?.nombre_completo)
      return emp?.id === filtroEmpleadoNomina
    })
  }, [nominas, filtroEmpleadoNomina, empleados])

  const totalNominasTabla = useMemo(() =>
    nominasFiltradas.reduce((s, n) => s + Number(n.total_pago), 0), [nominasFiltradas])

  const cuentasCobrarFiltradas = useMemo(() =>
    cuentasCobrar.filter((c: any) => {
      if (filtroEstadoCobrar !== 'todos' && c.estado !== filtroEstadoCobrar) return false
      if (filtroClienteCobrar !== 'todos' && c.clientes?.nombre !== filtroClienteCobrar) return false
      return true
    }), [cuentasCobrar, filtroEstadoCobrar, filtroClienteCobrar])

  const totalCobrarFiltrado = useMemo(() =>
    cuentasCobrarFiltradas.reduce((s: number, c: any) => s + Number(c.saldo_pendiente), 0),
    [cuentasCobrarFiltradas])

  const cuentasPagarFiltradas = useMemo(() =>
    cuentasPagar.filter((f: any) => {
      if (filtroEstadoPagar !== 'todos' && f.estado !== filtroEstadoPagar) return false
      if (filtroProveedorPagar !== 'todos' && f.proveedores?.nombre !== filtroProveedorPagar) return false
      return true
    }), [cuentasPagar, filtroEstadoPagar, filtroProveedorPagar])

  const totalPagarFiltrado = useMemo(() =>
    cuentasPagarFiltradas.reduce((s: number, f: any) => s + Number(f.saldo_pendiente), 0),
    [cuentasPagarFiltradas])


  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="text-[28px] font-bold leading-tight text-tinta">Contabilidad</h1>
          <div className="grid w-full grid-cols-[1fr_auto] gap-2 sm:flex sm:w-auto">
            {/* Libro de Excel con resumen, ventas, compras, gastos, nómina, caja y cartera (lo arma el servidor) */}
            <a href={`/dashboard/contabilidad/exportar?desde=${desde}&hasta=${hasta}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accion px-4 text-[15px] font-bold text-sobre-accion hover:brightness-105">
              <FileSpreadsheet className="h-4 w-4" />Excel para el contador
            </a>
            <Button variant="outline" className="h-11 border-linea bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2" onClick={() => exportarCSVCompleto({ ventas, ventaServicios, ventaItems, gastos, nominas, desde, hasta })}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Selector período */}
      <SelectorPeriodo periodo={periodo} hoy={hoyBogota()} />

      {/* Resultado del periodo: la cifra principal y cómo se llega a ella */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-[18px] bg-superficie p-5">
          <p className="text-[15px] font-semibold text-suave">{balance.resultado >= 0 ? 'Utilidad del periodo' : 'Pérdida del periodo'}</p>
          <p className={`cifra text-[48px] font-bold leading-none ${balance.resultado >= 0 ? 'text-entra' : 'text-sale'}`}>{pesosRedondos(balance.resultado)}</p>
          <p className="mt-1 text-[15px] text-suave">Lo que queda de las ventas después de la mercancía vendida, los gastos y la nómina.</p>
        </div>
        <dl className="overflow-hidden rounded-2xl bg-superficie">
          {([
            ['Ventas', balance.totalIngresos, 'entra'],
            ['Costo de la mercancía vendida', -balance.totalCMV, 'sale'],
            ['Gastos', -balance.totalGastos, 'sale'],
            ['Nómina', -balance.totalNominas, 'sale'],
          ] as const).map(([nombre, valor, tono]) => (
            <div key={nombre} className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3">
              <dt className="text-[15px] text-tinta">{nombre}</dt>
              <dd className={`cifra text-xl font-bold ${tono === 'entra' ? 'text-entra' : 'text-sale'}`}>{tono === 'sale' ? '−' : '+'}{pesosRedondos(Math.abs(valor))}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 bg-superficie-2 px-4 py-3">
            <dt className="text-[15px] font-bold text-tinta">Resultado</dt>
            <dd className={`cifra text-2xl font-bold ${balance.resultado >= 0 ? 'text-entra' : 'text-sale'}`}>{pesosRedondos(balance.resultado)}</dd>
          </div>
        </dl>
      </section>

      {/* Ingresos */}
      <SeccionTabla titulo="Ingresos" total={totalIngresosTabla} color="text-emerald-400">
        <div className="border-b border-linea bg-superficie-2 p-3">
          <Select items={[{ value: 'todos', label: 'Todos' }, { value: 'ventas', label: 'Solo ventas' }, { value: 'servicios', label: 'Solo servicios' }]}
            onValueChange={v => v && setFiltroTipoIngreso(v)} value={filtroTipoIngreso}>
            <SelectTrigger className="h-8 w-44 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ventas">Solo ventas</SelectItem>
              <SelectItem value="servicios">Solo servicios</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtroTipoIngreso !== 'servicios' && ventasFiltradas.map(v => (
              <TableRow key={`v-${v.id}`} className="border-linea hover:bg-velo/5">
                <TableCell className="text-xs text-steel-300">{v.fecha}</TableCell>
                <TableCell><span className="inline-flex items-center rounded-full bg-brand-blue/20 px-2 py-0.5 text-xs font-semibold text-enlace">Venta</span></TableCell>
                <TableCell className="text-sm text-tinta"><Link href={`/dashboard/ventas/${v.id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">Ticket #{v.numero_ticket}</Link></TableCell>
                <TableCell className="text-sm text-suave">{v.clientes?.id ? <Link href={`/dashboard/clientes/${v.clientes.id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{v.clientes.nombre}</Link> : 'Mostrador'}</TableCell>
                <TableCell className="text-right font-display font-bold text-emerald-400">${Number(v.total).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {filtroTipoIngreso !== 'ventas' && serviciosFiltrados.map(s => (
              <TableRow key={`s-${s.id}`} className="border-linea hover:bg-velo/5">
                <TableCell className="text-xs text-steel-300">{s.ventas?.fecha}</TableCell>
                <TableCell><span className="inline-flex items-center rounded-full bg-brand-yellow/20 px-2 py-0.5 text-xs font-semibold text-brand-yellow">Servicio</span></TableCell>
                <TableCell className="text-xs text-tinta">{s.nombre_servicio}</TableCell>
                <TableCell className="text-sm text-suave"><Link href={`/dashboard/ventas/${s.ventas?.id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">Ticket #{s.ventas?.numero_ticket}</Link></TableCell>
                <TableCell className={`text-right font-display font-bold ${filtroTipoIngreso === 'servicios' ? 'text-emerald-400' : 'text-steel-300'}`}>
                  ${Number(s.precio_aplicado).toLocaleString('es-CO')}
                  {filtroTipoIngreso !== 'servicios' && <span className="block text-xs font-normal text-steel-500">incluido en el ticket</span>}
                </TableCell>
              </TableRow>
            ))}
            {ventasFiltradas.length === 0 && serviciosFiltrados.length === 0 && (
              <TableRow className="border-linea"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin ingresos en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Costos */}
      <SeccionTabla titulo="Costo de la mercancía vendida" total={totalCMVTabla} color="text-sale" headerBg="bg-brand-yellow text-steel-900">
        <div className="border-b border-linea bg-superficie-2 p-3">
          <Select items={[{ value: 'todos', label: 'Todos los proveedores' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
            onValueChange={v => v && setFiltroProveedorCosto(v)} value={filtroProveedorCosto}>
            <SelectTrigger className="h-8 w-52 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
              <TableHead>Producto</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead className="text-right">Total costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costosFiltrados.map(i => {
              const cant = cantidadVendida(i)
              const totalCosto = Math.round(costoLineaVenta(i))
              const proveedor = i.productos?.producto_proveedores?.[0]?.proveedores?.nombre ?? '—'
              const proveedorId = i.productos?.producto_proveedores?.[0]?.proveedor_id as string | undefined
              return (
                <TableRow key={i.id} className="border-linea hover:bg-velo/5">
                  <TableCell className="text-sm font-medium text-tinta">{i.productos?.id ? <Link href={`/dashboard/inventario/${i.productos.id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{i.nombre_producto}</Link> : i.nombre_producto}</TableCell>
                  <TableCell className="text-sm text-suave">{proveedorId ? <Link href={`/dashboard/proveedores/${proveedorId}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{proveedor}</Link> : proveedor}</TableCell>
                  <TableCell className="text-right text-xs text-tinta">{cant}</TableCell>
                  <TableCell className="text-right text-xs text-tinta">${costoPorUnidadVendida(i).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-display font-bold text-sale">${totalCosto.toLocaleString('es-CO')}</TableCell>
                </TableRow>
              )
            })}
            {costosFiltrados.length === 0 && (
              <TableRow className="border-linea"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin costos en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Gastos */}
      <SeccionTabla titulo="Gastos operativos" total={totalGastosTabla} color="text-sale">
        <div className="flex items-center justify-between gap-3 border-b border-linea bg-superficie-2 p-3">
          <Select items={[{ value: 'todas', label: 'Todas las categorías' }, ...categoriasEnTabla.map(c => ({ value: c, label: c }))]}
            onValueChange={v => v && setFiltroCategoriaGasto(v)} value={filtroCategoriaGasto}>
            <SelectTrigger className="h-8 w-52 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categoriasEnTabla.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link href="/dashboard/caja/gasto?desde=contabilidad"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-brand-yellow/60 px-3 text-sm font-semibold text-brand-yellow hover:bg-brand-yellow/10">
            <Plus className="h-4 w-4" />Registrar gasto
          </Link>
        </div>

        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastosFiltrados.map(g => (
              <TableRow key={g.id} className="border-linea hover:bg-velo/5">
                <TableCell className="text-xs text-steel-300">{g.fecha}</TableCell>
                <TableCell className="text-xs font-medium text-tinta">{g.concepto}</TableCell>
                <TableCell className="text-xs text-steel-300">{g.categoria_gasto ?? '—'}</TableCell>
                <TableCell className="text-sm text-suave">{g.proveedores?.id ? <Link href={`/dashboard/proveedores/${g.proveedores.id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{g.proveedores.nombre}</Link> : '—'}</TableCell>
                <TableCell className="text-xs capitalize text-steel-300">{g.metodo_pago}</TableCell>
                <TableCell className="text-right font-display font-bold text-sale">${Number(g.monto).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {gastosFiltrados.length === 0 && (
              <TableRow className="border-linea"><TableCell colSpan={6} className="py-6 text-center text-steel-500">Sin gastos en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Nóminas */}
      <SeccionTabla titulo="Nóminas" total={totalNominasTabla} color="text-sale">
        <div className="border-b border-linea bg-superficie-2 p-3">
          <Select items={[{ value: 'todos', label: 'Todos los empleados' }, ...empleados.map(e => ({ value: e.id, label: e.nombre_completo }))]}
            onValueChange={v => v && setFiltroEmpleadoNomina(v)} value={filtroEmpleadoNomina}>
            <SelectTrigger className="h-8 w-52 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los empleados</SelectItem>
              {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right">Salario base</TableHead>
              <TableHead className="text-right">Bonif.</TableHead>
              <TableHead className="text-right">Deduc.</TableHead>
              <TableHead className="text-right">Total pagado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nominasFiltradas.map(n => (
              <TableRow key={n.id} className="border-linea hover:bg-velo/5">
                <TableCell className="text-xs text-steel-300">{n.periodo_inicio}</TableCell>
                <TableCell className="text-sm font-medium text-tinta">{n.empleado_id ? <Link href={`/dashboard/empleados/${n.empleado_id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{n.profiles?.nombre_completo ?? 'Empleado'}</Link> : (n.profiles?.nombre_completo ?? '—')}</TableCell>
                <TableCell className="text-right text-xs text-steel-300">{n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}</TableCell>
                <TableCell className="text-right text-xs text-tinta">${Number(n.salario_base).toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-right text-xs text-emerald-400">{Number(n.bonificaciones) > 0 ? `+$${Number(n.bonificaciones).toLocaleString('es-CO')}` : '—'}</TableCell>
                <TableCell className="text-right text-xs text-sale">{Number(n.deducciones) > 0 ? `-$${Number(n.deducciones).toLocaleString('es-CO')}` : '—'}</TableCell>
                <TableCell className="text-right font-display font-bold text-tinta">${Number(n.total_pago).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {nominasFiltradas.length === 0 && (
              <TableRow className="border-linea"><TableCell colSpan={7} className="py-6 text-center text-steel-500">Sin nóminas en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Cuentas por cobrar */}
      <SeccionTabla titulo={`Cuentas por cobrar (${cuentasCobrarFiltradas.length})`} total={totalCobrarFiltrado} color="text-enlace">
        <div className="flex flex-wrap gap-3 border-b border-linea bg-superficie-2 p-3">
          <Select items={[{ value: 'todos', label: 'Todos los estados' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'parcial', label: 'Parcial' }]}
            onValueChange={v => v && setFiltroEstadoCobrar(v)} value={filtroEstadoCobrar}>
            <SelectTrigger className="h-8 w-44 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Select
            items={[{ value: 'todos', label: 'Todos los clientes' }, ...nombresClientesCredito.map(n => ({ value: n, label: n }))]}
            onValueChange={v => v && setFiltroClienteCobrar(v)} value={filtroClienteCobrar}>
            <SelectTrigger className="h-8 w-52 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los clientes</SelectItem>
              {nombresClientesCredito.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
              <TableHead>Fecha</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Monto original</TableHead>
              <TableHead className="text-right">Abonado</TableHead>
              <TableHead className="text-right">Saldo pendiente</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuentasCobrarFiltradas.map((c: any) => {
              const abonado = Number(c.monto_original) - Number(c.saldo_pendiente)
              const hoy = hoyBogota()
              const vencido = c.fecha_pago_programada && c.fecha_pago_programada < hoy
              return (
                <TableRow key={c.id} className="border-linea hover:bg-velo/5">
                  <TableCell className="text-xs text-steel-300">{c.ventas?.fecha ?? '—'}</TableCell>
                  <TableCell className="text-sm text-tinta">{c.ventas?.id ? <Link href={`/dashboard/ventas/${c.ventas.id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">#{c.ventas.numero_ticket}</Link> : '—'}</TableCell>
                  <TableCell className="text-sm font-medium text-tinta">{c.cliente_id ? <Link href={`/dashboard/clientes/${c.cliente_id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{c.clientes?.nombre ?? 'Cliente'}</Link> : '—'}</TableCell>
                  <TableCell className="text-right text-xs text-tinta">${Number(c.monto_original).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-400">{abonado > 0 ? `$${abonado.toLocaleString('es-CO')}` : '—'}</TableCell>
                  <TableCell className="text-right font-display font-bold text-enlace">${Number(c.saldo_pendiente).toLocaleString('es-CO')}</TableCell>
                  <TableCell className={`text-xs ${vencido ? 'font-medium text-sale' : 'text-steel-300'}`}>
                    {c.fecha_pago_programada ?? '—'}{vencido && ' ⚠'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${c.estado === 'parcial' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-brand-blue/30 bg-brand-blue/20 text-enlace'}`}>{c.estado}</span>
                  </TableCell>
                </TableRow>
              )
            })}
            {cuentasCobrarFiltradas.length === 0 && (
              <TableRow className="border-linea"><TableCell colSpan={8} className="py-6 text-center text-steel-500">Sin cuentas por cobrar</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Cuentas por pagar */}
      <SeccionTabla titulo={`Cuentas por pagar (${cuentasPagarFiltradas.length})`} total={totalPagarFiltrado} color="text-sale">
        <div className="flex flex-wrap gap-3 border-b border-linea bg-superficie-2 p-3">
          <Select items={[{ value: 'todos', label: 'Todos los estados' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'parcial', label: 'Parcial' }]}
            onValueChange={v => v && setFiltroEstadoPagar(v)} value={filtroEstadoPagar}>
            <SelectTrigger className="h-8 w-44 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Select items={[{ value: 'todos', label: 'Todos los proveedores' }, ...proveedores.map(p => ({ value: p.nombre, label: p.nombre }))]}
            onValueChange={v => v && setFiltroProveedorPagar(v)} value={filtroProveedorPagar}>
            <SelectTrigger className="h-8 w-52 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedores.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
              <TableHead>Factura</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Emitida</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Total factura</TableHead>
              <TableHead className="text-right">Saldo pendiente</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuentasPagarFiltradas.map((f: any) => {
              const hoy = hoyBogota()
              const vencida = f.fecha_vencimiento && f.fecha_vencimiento < hoy
              return (
                <TableRow key={f.id} className={`border-linea hover:bg-velo/5 ${vencida ? 'bg-brand-red/10' : ''}`}>
                  <TableCell className="text-xs font-medium text-tinta">{f.numero_factura ? `#${f.numero_factura}` : 'Sin número'}</TableCell>
                  <TableCell className="text-sm text-tinta">{f.proveedor_id ? <Link href={`/dashboard/proveedores/${f.proveedor_id}`} prefetch={false} className="underline-offset-2 hover:text-enlace hover:underline">{f.proveedores?.nombre ?? 'Proveedor'}</Link> : '—'}</TableCell>
                  <TableCell className="text-xs text-steel-300">{f.fecha_emision}</TableCell>
                  <TableCell className={`text-xs ${vencida ? 'font-medium text-sale' : 'text-steel-300'}`}>
                    {f.fecha_vencimiento ?? '—'}{vencida && ' ⚠'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-tinta">${Number(f.monto_total).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right font-display font-bold text-sale">${Number(f.saldo_pendiente).toLocaleString('es-CO')}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${f.estado === 'parcial' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-brand-red/30 bg-brand-red/20 text-sale'}`}>{f.estado}</span>
                  </TableCell>
                </TableRow>
              )
            })}
            {cuentasPagarFiltradas.length === 0 && (
              <TableRow className="border-linea"><TableCell colSpan={7} className="py-6 text-center text-steel-500">Sin cuentas por pagar</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>
    </div>
  )
}

/** Pesos sin centavos (el costo de la mercancía puede traer decimales por las fracciones) */
function pesosRedondos(n: number) {
  return `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('es-CO')}`
}
