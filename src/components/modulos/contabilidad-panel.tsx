'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'año', label: 'Este año' },
  { value: 'rango', label: 'Rango personalizado' },
]

const FUENTES = [
  { value: 'caja_menor', label: 'Caja menor' },
  { value: 'caja_mayor', label: 'Caja mayor' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

interface FuentePago {
  key: string
  fuente: string
  monto: number
}

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
  filas.push(['=== INGRESOS — SERVICIOS ==='])
  filas.push(['Servicio', 'Fecha', 'Ticket', 'Monto'])
  data.ventaServicios.forEach(s => filas.push([s.nombre_servicio, s.ventas?.fecha ?? '', `#${s.ventas?.numero_ticket ?? ''}`, String(s.precio_aplicado)]))
  filas.push(['', '', 'TOTAL', String(data.ventaServicios.reduce((s: number, v: any) => s + Number(v.precio_aplicado), 0))])
  filas.push([])
  filas.push(['=== COSTOS DE MERCANCÍA ==='])
  filas.push(['Producto', 'Cantidad', 'Costo unitario', 'Total costo', 'Proveedor'])
  data.ventaItems.forEach(i => {
    const cant = i.es_fraccionado ? Number(i.cantidad_fraccion ?? 1) : Number(i.cantidad)
    filas.push([i.nombre_producto, String(cant), String(i.costo_unitario), String(cant * Number(i.costo_unitario)), i.productos?.producto_proveedores?.[0]?.proveedores?.nombre ?? '—'])
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
      <button type="button" onClick={() => setAbierta(v => !v)}
        className={`flex w-full items-center justify-between px-4 py-3 transition-colors ${headerBg ?? 'bg-brand-blue text-white'}`}>
        <span className="font-display font-bold">{titulo}</span>
        <div className="flex items-center gap-3">
          <span className="font-display font-bold">${total.toLocaleString('es-CO')}</span>
          {abierta ? <ChevronUp className="h-4 w-4 opacity-70" /> : <ChevronDown className="h-4 w-4 opacity-70" />}
        </div>
      </button>
      {abierta && <div className="border-t border-white/10">{children}</div>}
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
  periodo: string
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [filtroTipoIngreso, setFiltroTipoIngreso] = useState('todos')
  const [filtroProveedorCosto, setFiltroProveedorCosto] = useState('todos')
  const [filtroCategoriaGasto, setFiltroCategoriaGasto] = useState('todas')
  const [filtroEmpleadoNomina, setFiltroEmpleadoNomina] = useState('todos')
  const [filtroEstadoCobrar, setFiltroEstadoCobrar] = useState('todos')
  const [filtroClienteCobrar, setFiltroClienteCobrar] = useState('todos')
  const [filtroEstadoPagar, setFiltroEstadoPagar] = useState('todos')
  const [filtroProveedorPagar, setFiltroProveedorPagar] = useState('todos')

  const [mostrarNuevoGasto, setMostrarNuevoGasto] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', categoria: '', monto: 0, proveedor_id: '', notas: '' })
  const [fuentesGasto, setFuentesGasto] = useState<FuentePago[]>([{ key: '1', fuente: 'caja_menor', monto: 0 }])
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [confirmarGasto, setConfirmarGasto] = useState(false)

  const actualizarURL = (params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    router.push(`${pathname}?${p.toString()}`)
  }

  const handlePeriodo = (v: string) => {
    if (!v) return
    if (v === 'rango') { actualizarURL({ periodo: v }); return }
    actualizarURL({ periodo: v, desde: '', hasta: '' })
  }

  const categoriasEnTabla = useMemo(() => categoriasGasto.map(c => c.nombre), [categoriasGasto])

  const ventasFiltradas = useMemo(() => filtroTipoIngreso === 'servicios' ? [] : ventas, [ventas, filtroTipoIngreso])
  const serviciosFiltrados = useMemo(() => filtroTipoIngreso === 'ventas' ? [] : ventaServicios, [ventaServicios, filtroTipoIngreso])
  const totalIngresosTabla = useMemo(() =>
    ventasFiltradas.reduce((s, v) => s + Number(v.total), 0) +
    serviciosFiltrados.reduce((s, vs) => s + Number(vs.precio_aplicado), 0),
    [ventasFiltradas, serviciosFiltrados])

  const costosFiltrados = useMemo(() =>
    filtroProveedorCosto === 'todos' ? ventaItems :
    ventaItems.filter(i => i.productos?.producto_proveedores?.[0]?.proveedor_id === filtroProveedorCosto),
    [ventaItems, filtroProveedorCosto])

  const totalCMVTabla = useMemo(() =>
    costosFiltrados.reduce((s, i) => {
      const cant = i.es_fraccionado ? Number(i.cantidad_fraccion ?? 1) : Number(i.cantidad)
      return s + cant * Number(i.costo_unitario ?? 0)
    }, 0), [costosFiltrados])

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

  const handleGuardarGasto = async () => {
    if (!nuevoGasto.concepto.trim()) { toast.error('El concepto es obligatorio'); return }
    if (nuevoGasto.monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    const suma = fuentesGasto.reduce((s, f) => s + f.monto, 0)
    if (Math.abs(suma - nuevoGasto.monto) > 1) { toast.error('La suma de fuentes no coincide con el monto'); return }
    setGuardandoGasto(true)
    try {
      const { error } = await supabase.rpc('registrar_gasto_caja', {
        p_concepto: nuevoGasto.concepto,
        p_categoria: nuevoGasto.categoria || 'Otros',
        p_monto: nuevoGasto.monto,
        p_fuentes: fuentesGasto.map(f => ({ fuente: f.fuente, monto: f.monto })) as any,
        p_proveedor_id: nuevoGasto.proveedor_id || null,
        p_notas: nuevoGasto.notas || null,
      })
      if (error) throw error
      toast.success('Gasto registrado')
      setMostrarNuevoGasto(false)
      setNuevoGasto({ concepto: '', categoria: '', monto: 0, proveedor_id: '', notas: '' })
      setFuentesGasto([{ key: '1', fuente: 'caja_menor', monto: 0 }])
      setConfirmarGasto(false)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setGuardandoGasto(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header diagonal */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-brand-yellow">Contabilidad</h1>
          <Button variant="outline" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => exportarCSVCompleto({ ventas, ventaServicios, ventaItems, gastos, nominas, desde, hasta })}>
            <Download className="mr-2 h-4 w-4" />Exportar todo CSV
          </Button>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {/* Selector período */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Período</label>
          <Select items={PERIODOS} onValueChange={v => v && handlePeriodo(v)} value={periodo}>
            <SelectTrigger className="w-48 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {periodo === 'rango' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Desde</label>
              <Input type="date" value={desde} onChange={e => actualizarURL({ desde: e.target.value, periodo: 'rango' })} className="w-36 border-white/10 bg-[#1a2430] text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Hasta</label>
              <Input type="date" value={hasta} onChange={e => actualizarURL({ hasta: e.target.value, periodo: 'rango' })} className="w-36 border-white/10 bg-[#1a2430] text-white" />
            </div>
          </>
        )}
        <p className="self-end pb-2 text-xs text-steel-500">{desde} — {hasta}</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ingresos</p>
          <p className="mt-1 font-display text-lg font-bold text-emerald-400">${balance.totalIngresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Costo mercancía</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-red">${balance.totalCMV.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Gastos</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-red">${balance.totalGastos.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Nóminas</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-red">${balance.totalNominas.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border-2 border-brand-yellow bg-[#111820] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Resultado</p>
          <p className={`mt-1 font-display text-xl font-bold ${balance.resultado >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
            ${balance.resultado.toLocaleString('es-CO')}
          </p>
          <p className="mt-0.5 text-xs text-steel-500">{balance.resultado >= 0 ? 'Utilidad' : 'Pérdida'}</p>
        </div>
      </div>

      {/* Ingresos */}
      <SeccionTabla titulo="Ingresos" total={totalIngresosTabla} color="text-emerald-400">
        <div className="border-b border-white/10 bg-[#1a2430] p-3">
          <Select items={[{ value: 'todos', label: 'Todos' }, { value: 'ventas', label: 'Solo ventas' }, { value: 'servicios', label: 'Solo servicios' }]}
            onValueChange={v => v && setFiltroTipoIngreso(v)} value={filtroTipoIngreso}>
            <SelectTrigger className="h-8 w-44 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
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
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtroTipoIngreso !== 'servicios' && ventasFiltradas.map(v => (
              <TableRow key={`v-${v.id}`} className="border-white/8 hover:bg-white/5">
                <TableCell className="text-xs text-steel-300">{v.fecha}</TableCell>
                <TableCell><span className="inline-flex items-center rounded-full bg-brand-blue/20 px-2 py-0.5 text-xs font-semibold text-brand-blue">Venta</span></TableCell>
                <TableCell className="text-xs text-white">Ticket #{v.numero_ticket}</TableCell>
                <TableCell className="text-xs text-steel-300">{v.clientes?.nombre ?? 'General'}</TableCell>
                <TableCell className="text-right font-display font-bold text-emerald-400">${Number(v.total).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {filtroTipoIngreso !== 'ventas' && serviciosFiltrados.map(s => (
              <TableRow key={`s-${s.id}`} className="border-white/8 hover:bg-white/5">
                <TableCell className="text-xs text-steel-300">{s.ventas?.fecha}</TableCell>
                <TableCell><span className="inline-flex items-center rounded-full bg-brand-yellow/20 px-2 py-0.5 text-xs font-semibold text-brand-yellow">Servicio</span></TableCell>
                <TableCell className="text-xs text-white">{s.nombre_servicio}</TableCell>
                <TableCell className="text-xs text-steel-300">Ticket #{s.ventas?.numero_ticket}</TableCell>
                <TableCell className="text-right font-display font-bold text-emerald-400">${Number(s.precio_aplicado).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {ventasFiltradas.length === 0 && serviciosFiltrados.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin ingresos en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Costos */}
      <SeccionTabla titulo="Costo de Mercancía Vendida" total={totalCMVTabla} color="text-brand-red" headerBg="bg-brand-yellow text-steel-900">
        <div className="border-b border-white/10 bg-[#1a2430] p-3">
          <Select items={[{ value: 'todos', label: 'Todos los proveedores' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
            onValueChange={v => v && setFiltroProveedorCosto(v)} value={filtroProveedorCosto}>
            <SelectTrigger className="h-8 w-52 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
              <TableHead>Producto</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead className="text-right">Total costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costosFiltrados.map(i => {
              const cant = i.es_fraccionado ? Number(i.cantidad_fraccion ?? 1) : Number(i.cantidad)
              const totalCosto = cant * Number(i.costo_unitario ?? 0)
              const proveedor = i.productos?.producto_proveedores?.[0]?.proveedores?.nombre ?? '—'
              return (
                <TableRow key={i.id} className="border-white/8 hover:bg-white/5">
                  <TableCell className="text-xs font-medium text-white">{i.nombre_producto}</TableCell>
                  <TableCell className="text-xs text-steel-300">{proveedor}</TableCell>
                  <TableCell className="text-right text-xs text-white">{cant}</TableCell>
                  <TableCell className="text-right text-xs text-white">${Number(i.costo_unitario ?? 0).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right font-display font-bold text-brand-red">${totalCosto.toLocaleString('es-CO')}</TableCell>
                </TableRow>
              )
            })}
            {costosFiltrados.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin costos en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Gastos */}
      <SeccionTabla titulo="Gastos Operativos" total={totalGastosTabla} color="text-brand-red">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#1a2430] p-3">
          <Select items={[{ value: 'todas', label: 'Todas las categorías' }, ...categoriasEnTabla.map(c => ({ value: c, label: c }))]}
            onValueChange={v => v && setFiltroCategoriaGasto(v)} value={filtroCategoriaGasto}>
            <SelectTrigger className="h-8 w-52 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categoriasEnTabla.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setMostrarNuevoGasto(v => !v)}>
            <Plus className="mr-1 h-4 w-4" />Registrar Gasto
          </Button>
        </div>

        {mostrarNuevoGasto && (
          <div className="space-y-3 border-b border-white/10 bg-[#1a2430] p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Concepto *</Label>
                <Input value={nuevoGasto.concepto} onChange={e => setNuevoGasto(p => ({ ...p, concepto: e.target.value }))} className="border-white/10 bg-[#111820] text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Categoría</Label>
                <Select items={categoriasGasto.map(c => ({ value: c.nombre, label: c.nombre }))}
                  onValueChange={v => v && setNuevoGasto(p => ({ ...p, categoria: v }))} value={nuevoGasto.categoria || ''}>
                  <SelectTrigger className="border-white/10 bg-[#111820] text-white"><SelectValue placeholder="Selecciona categoría…" /></SelectTrigger>
                  <SelectContent>
                    {categoriasGasto.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Monto *</Label>
                <Input type="number" value={nuevoGasto.monto || ''}
                  className="border-white/10 bg-[#111820] text-white"
                  onChange={e => {
                    const m = parseFloat(e.target.value) || 0
                    setNuevoGasto(p => ({ ...p, monto: m }))
                    setFuentesGasto([{ key: '1', fuente: 'caja_menor', monto: m }])
                  }} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Proveedor (opcional)</Label>
                <Select items={[{ value: 'ninguno', label: 'Ninguno' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                  onValueChange={v => setNuevoGasto(p => ({ ...p, proveedor_id: v === 'ninguno' ? '' : (v ?? '') }))}
                  value={nuevoGasto.proveedor_id || 'ninguno'}>
                  <SelectTrigger className="border-white/10 bg-[#111820] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Ninguno</SelectItem>
                    {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Fuentes de pago</Label>
                <button type="button" onClick={() => setFuentesGasto(prev => [...prev, { key: Date.now().toString(), fuente: 'caja_menor', monto: 0 }])}
                  className="flex items-center gap-1 text-xs text-steel-300 hover:text-white">
                  <Plus className="h-3 w-3" />Agregar fuente
                </button>
              </div>
              {fuentesGasto.map((f, idx) => (
                <div key={f.key} className="flex items-center gap-2">
                  <Select items={FUENTES} onValueChange={v => v && setFuentesGasto(prev => prev.map((it, i) => i === idx ? { ...it, fuente: v } : it))} value={f.fuente}>
                    <SelectTrigger className="h-8 w-36 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUENTES.map(fd => <SelectItem key={fd.value} value={fd.value}>{fd.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={f.monto || ''}
                    onChange={e => setFuentesGasto(prev => prev.map((it, i) => i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it))}
                    className="h-8 border-white/10 bg-[#111820] text-xs text-white" placeholder="Monto" />
                  {fuentesGasto.length > 1 && (
                    <button type="button" onClick={() => setFuentesGasto(prev => prev.filter((_, i) => i !== idx))} className="text-steel-300 hover:text-brand-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {nuevoGasto.monto > 0 && Math.abs(fuentesGasto.reduce((s, f) => s + f.monto, 0) - nuevoGasto.monto) > 0 && (
                <p className="text-xs text-brand-yellow">Falta: ${(nuevoGasto.monto - fuentesGasto.reduce((s, f) => s + f.monto, 0)).toLocaleString('es-CO')}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Notas</Label>
              <Textarea value={nuevoGasto.notas} onChange={e => setNuevoGasto(p => ({ ...p, notas: e.target.value }))} rows={2} className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" />
            </div>
            {!confirmarGasto ? (
              <div className="flex gap-2">
                <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => setConfirmarGasto(true)}>Registrar gasto</Button>
                <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => { setMostrarNuevoGasto(false); setConfirmarGasto(false) }}>Cancelar</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">¿Confirmas el gasto de ${nuevoGasto.monto.toLocaleString('es-CO')} — {nuevoGasto.concepto}?</p>
                <div className="flex gap-2">
                  <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleGuardarGasto} disabled={guardandoGasto}>{guardandoGasto ? 'Registrando…' : 'Sí, registrar'}</Button>
                  <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmarGasto(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
              <TableRow key={g.id} className="border-white/8 hover:bg-white/5">
                <TableCell className="text-xs text-steel-300">{g.fecha}</TableCell>
                <TableCell className="text-xs font-medium text-white">{g.concepto}</TableCell>
                <TableCell className="text-xs text-steel-300">{g.categoria_gasto ?? '—'}</TableCell>
                <TableCell className="text-xs text-steel-300">{g.proveedores?.nombre ?? '—'}</TableCell>
                <TableCell className="text-xs capitalize text-steel-300">{g.metodo_pago}</TableCell>
                <TableCell className="text-right font-display font-bold text-brand-red">${Number(g.monto).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {gastosFiltrados.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={6} className="py-6 text-center text-steel-500">Sin gastos en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Nóminas */}
      <SeccionTabla titulo="Nóminas" total={totalNominasTabla} color="text-brand-red">
        <div className="border-b border-white/10 bg-[#1a2430] p-3">
          <Select items={[{ value: 'todos', label: 'Todos los empleados' }, ...empleados.map(e => ({ value: e.id, label: e.nombre_completo }))]}
            onValueChange={v => v && setFiltroEmpleadoNomina(v)} value={filtroEmpleadoNomina}>
            <SelectTrigger className="h-8 w-52 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los empleados</SelectItem>
              {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
              <TableRow key={n.id} className="border-white/8 hover:bg-white/5">
                <TableCell className="text-xs text-steel-300">{n.periodo_inicio}</TableCell>
                <TableCell className="text-xs font-medium text-white">{n.profiles?.nombre_completo ?? '—'}</TableCell>
                <TableCell className="text-right text-xs text-steel-300">{n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}</TableCell>
                <TableCell className="text-right text-xs text-white">${Number(n.salario_base).toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-right text-xs text-emerald-400">{Number(n.bonificaciones) > 0 ? `+$${Number(n.bonificaciones).toLocaleString('es-CO')}` : '—'}</TableCell>
                <TableCell className="text-right text-xs text-brand-red">{Number(n.deducciones) > 0 ? `-$${Number(n.deducciones).toLocaleString('es-CO')}` : '—'}</TableCell>
                <TableCell className="text-right font-display font-bold text-white">${Number(n.total_pago).toLocaleString('es-CO')}</TableCell>
              </TableRow>
            ))}
            {nominasFiltradas.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={7} className="py-6 text-center text-steel-500">Sin nóminas en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Cuentas por cobrar */}
      <SeccionTabla titulo={`Cuentas por cobrar (${cuentasCobrarFiltradas.length})`} total={totalCobrarFiltrado} color="text-brand-blue">
        <div className="flex flex-wrap gap-3 border-b border-white/10 bg-[#1a2430] p-3">
          <Select items={[{ value: 'todos', label: 'Todos los estados' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'parcial', label: 'Parcial' }]}
            onValueChange={v => v && setFiltroEstadoCobrar(v)} value={filtroEstadoCobrar}>
            <SelectTrigger className="h-8 w-44 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Select
            items={[{ value: 'todos', label: 'Todos los clientes' }, ...nombresClientesCredito.map(n => ({ value: n, label: n }))]}
            onValueChange={v => v && setFiltroClienteCobrar(v)} value={filtroClienteCobrar}>
            <SelectTrigger className="h-8 w-52 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los clientes</SelectItem>
              {nombresClientesCredito.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
              const hoy = new Date().toISOString().slice(0, 10)
              const vencido = c.fecha_pago_programada && c.fecha_pago_programada < hoy
              return (
                <TableRow key={c.id} className="border-white/8 hover:bg-white/5">
                  <TableCell className="text-xs text-steel-300">{c.ventas?.fecha ?? '—'}</TableCell>
                  <TableCell className="text-xs text-white">#{c.ventas?.numero_ticket ?? '—'}</TableCell>
                  <TableCell className="text-xs font-medium text-white">{c.clientes?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs text-white">${Number(c.monto_original).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-400">{abonado > 0 ? `$${abonado.toLocaleString('es-CO')}` : '—'}</TableCell>
                  <TableCell className="text-right font-display font-bold text-brand-blue">${Number(c.saldo_pendiente).toLocaleString('es-CO')}</TableCell>
                  <TableCell className={`text-xs ${vencido ? 'font-medium text-brand-red' : 'text-steel-300'}`}>
                    {c.fecha_pago_programada ?? '—'}{vencido && ' ⚠'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${c.estado === 'parcial' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-brand-blue/30 bg-brand-blue/20 text-brand-blue'}`}>{c.estado}</span>
                  </TableCell>
                </TableRow>
              )
            })}
            {cuentasCobrarFiltradas.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={8} className="py-6 text-center text-steel-500">Sin cuentas por cobrar</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>

      {/* Cuentas por pagar */}
      <SeccionTabla titulo={`Cuentas por pagar (${cuentasPagarFiltradas.length})`} total={totalPagarFiltrado} color="text-brand-red">
        <div className="flex flex-wrap gap-3 border-b border-white/10 bg-[#1a2430] p-3">
          <Select items={[{ value: 'todos', label: 'Todos los estados' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'parcial', label: 'Parcial' }]}
            onValueChange={v => v && setFiltroEstadoPagar(v)} value={filtroEstadoPagar}>
            <SelectTrigger className="h-8 w-44 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Select items={[{ value: 'todos', label: 'Todos los proveedores' }, ...proveedores.map(p => ({ value: p.nombre, label: p.nombre }))]}
            onValueChange={v => v && setFiltroProveedorPagar(v)} value={filtroProveedorPagar}>
            <SelectTrigger className="h-8 w-52 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {proveedores.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
              const hoy = new Date().toISOString().slice(0, 10)
              const vencida = f.fecha_vencimiento && f.fecha_vencimiento < hoy
              return (
                <TableRow key={f.id} className={`border-white/8 hover:bg-white/5 ${vencida ? 'bg-brand-red/10' : ''}`}>
                  <TableCell className="text-xs font-medium text-white">{f.numero_factura ? `#${f.numero_factura}` : 'Sin número'}</TableCell>
                  <TableCell className="text-xs text-white">{f.proveedores?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-xs text-steel-300">{f.fecha_emision}</TableCell>
                  <TableCell className={`text-xs ${vencida ? 'font-medium text-brand-red' : 'text-steel-300'}`}>
                    {f.fecha_vencimiento ?? '—'}{vencida && ' ⚠'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-white">${Number(f.monto_total).toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right font-display font-bold text-brand-red">${Number(f.saldo_pendiente).toLocaleString('es-CO')}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${f.estado === 'parcial' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-brand-red/30 bg-brand-red/20 text-brand-red'}`}>{f.estado}</span>
                  </TableCell>
                </TableRow>
              )
            })}
            {cuentasPagarFiltradas.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={7} className="py-6 text-center text-steel-500">Sin cuentas por pagar</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </SeccionTabla>
    </div>
  )
}