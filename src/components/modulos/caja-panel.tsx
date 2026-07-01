'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DenominacionesPanel } from './denominaciones-panel'
import { ArqueoPanel } from './arqueo-panel'
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, Check, Banknote, Smartphone, CreditCard, Coins, Wallet, Calculator } from 'lucide-react'
import { calcularPagoDia, horasPagarPorFecha, esDomingoOFestivo } from '@/lib/festivos-colombia'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Movimiento {
  id: string; hora: string; tipo_movimiento: string
  origen_destino: string; monto: number
  observaciones: string | null; referencia_tipo: string | null
}

interface FondoDenominacion {
  tipo: string; denominacion: number; cantidad: number; billetes_acumulados: number
}

interface Proveedor { id: string; nombre: string }

interface SaldoMedio { medio: string; saldo_acumulado: number }

interface Empleado {
  id: string; nombre_completo: string; salario_base: number | null
}

interface NominaItem {
  empleado_id: string
  nombre: string
  salario_base: number
  horas: number
  bonificaciones: number
  deducciones: number
  metodo_pago: string
  expandido: boolean
  pagado: boolean
}

interface FuentePago { key: string; fuente: string; monto: number }

interface CajaPanelProps {
  cajaMayorSaldo: number
  ventasEfectivo: number; ventasNequi: number
  ventasDaviplata: number; ventasTarjeta: number; ventasCredito: number
  totalIngresos: number; totalEgresos: number; egresosEfectivo: number
  movimientos: Movimiento[]
  fondos: FondoDenominacion[]
  saldos: SaldoMedio[]
  config: { monto_base_caja_menor: number; monto_inicial_monedas: number; monto_inicial_sencillo: number }
  proveedores: Proveedor[]
  fechaHoy: string
  nominasPagadasHoy: number; empleadosActivos: number
  arqueoHoy: any
  categoriasGasto: { id: string; nombre: string }[]
  empleados: Empleado[]
  empleadosPagadosHoy: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_MOV_LABEL: Record<string, string> = {
  ingreso: 'Ingreso', egreso: 'Egreso', gasto: 'Gasto',
  retiro: 'Retiro', pago_proveedor: 'Pago proveedor',
  nomina: 'Nómina', transferencia_caja_mayor: 'Transfer. Caja Mayor',
}

const ORIGEN_LABEL: Record<string, string> = {
  efectivo: 'Efectivo (Caja Menor)',
  caja_menor: 'Efectivo (Caja Menor)',
  caja_mayor: 'Caja Mayor',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  credito: 'Crédito',
  abono_credito: 'Abono crédito',
}

const FUENTES_DISPONIBLES = [
  { value: 'caja_menor', label: 'Caja menor' },
  { value: 'caja_mayor', label: 'Caja mayor' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

const METODOS_NOMINA = [
  { value: 'efectivo', label: 'Efectivo (Caja Menor)' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

// ─── FuentesPagoEditor ───────────────────────────────────────────────────────

function FuentesPagoEditor({ fuentes, setFuentes, montoTotal }: {
  fuentes: FuentePago[]; setFuentes: (f: FuentePago[]) => void; montoTotal: number
}) {
  const sumaFuentes = fuentes.reduce((s, f) => s + f.monto, 0)
  const diferencia = montoTotal - sumaFuentes
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Fuentes de pago</Label>
        <button type="button"
          onClick={() => setFuentes([...fuentes, { key: Date.now().toString(), fuente: 'caja_menor', monto: 0 }])}
          className="flex items-center gap-1 text-xs text-steel-300 hover:text-white">
          <Plus className="h-3 w-3" />Agregar fuente
        </button>
      </div>
      {fuentes.map((f, idx) => (
        <div key={f.key} className="flex items-center gap-2">
          <Select items={FUENTES_DISPONIBLES}
            onValueChange={v => v && setFuentes(fuentes.map((it, i) => i === idx ? { ...it, fuente: v } : it))}
            value={f.fuente}>
            <SelectTrigger className="h-8 w-36 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FUENTES_DISPONIBLES.map(fd => <SelectItem key={fd.value} value={fd.value}>{fd.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" value={f.monto || ''}
            onFocus={e => e.target.select()}
            onChange={e => setFuentes(fuentes.map((it, i) => i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it))}
            className="h-8 border-white/10 bg-[#111820] text-xs text-white" placeholder="Monto" />
          {fuentes.length > 1 && (
            <button type="button" onClick={() => setFuentes(fuentes.filter((_, i) => i !== idx))}
              className="text-steel-300 hover:text-brand-red">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {montoTotal > 0 && Math.abs(diferencia) > 0 && (
        <p className={`text-xs ${diferencia > 0 ? 'text-brand-yellow' : 'text-brand-red'}`}>
          {diferencia > 0 ? `Falta asignar: $${diferencia.toLocaleString('es-CO')}` : `Excede en: $${Math.abs(diferencia).toLocaleString('es-CO')}`}
        </p>
      )}
    </div>
  )
}

const MEDIO_ESTILO: Record<string, { label: string; icono: any; texto: string; borde: string; fondo: string; anillo: string }> = {
  efectivo:   { label: 'Efectivo',   icono: Banknote,   texto: 'text-emerald-400', borde: 'border-emerald-500/30', fondo: 'bg-emerald-500/10', anillo: 'bg-emerald-500/20' },
  nequi:      { label: 'Nequi',      icono: Smartphone, texto: 'text-purple-400',  borde: 'border-purple-500/30',  fondo: 'bg-purple-500/10',  anillo: 'bg-purple-500/20' },
  daviplata:  { label: 'Daviplata',  icono: Smartphone, texto: 'text-red-400',     borde: 'border-red-500/30',     fondo: 'bg-red-500/10',     anillo: 'bg-red-500/20' },
  tarjeta:    { label: 'Tarjeta',    icono: CreditCard, texto: 'text-brand-blue',  borde: 'border-brand-blue/30',  fondo: 'bg-brand-blue/10',  anillo: 'bg-brand-blue/20' },
  credito:    { label: 'Crédito',    icono: Coins,      texto: 'text-amber-400',   borde: 'border-amber-500/30',   fondo: 'bg-amber-500/10',   anillo: 'bg-amber-500/20' },
  caja_mayor: { label: 'Caja Mayor', icono: Wallet,     texto: 'text-emerald-400', borde: 'border-emerald-500/30', fondo: 'bg-emerald-500/10', anillo: 'bg-emerald-500/20' },
}

// ─── CajaPanel ───────────────────────────────────────────────────────────────

export function CajaPanel({
  cajaMayorSaldo, ventasEfectivo, ventasNequi, ventasDaviplata, ventasTarjeta, ventasCredito,
  totalIngresos, totalEgresos, egresosEfectivo,
  movimientos, fondos, saldos, config, proveedores,
  fechaHoy, nominasPagadasHoy, empleadosActivos, arqueoHoy, categoriasGasto,
  empleados, empleadosPagadosHoy,
}: CajaPanelProps) {
  const supabase = createClient()
  const router = useRouter()

  const [panelTransferencia, setPanelTransferencia] = useState(false)
  const [transferencia, setTransferencia] = useState({ origen: 'efectivo', destino: 'nequi', monto: 0, observaciones: '' })
  const [transfiriendo, setTransfiriendo] = useState(false)

  // ── Filtros movimientos ──
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroOrigen, setFiltroOrigen] = useState('todos')
  const [panelActivo, setPanelActivo] = useState<'ninguno' | 'retiro' | 'gasto' | 'proveedor' | 'arqueo' | 'nomina'>('ninguno')

  // ── Retiro ──
  const [retiro, setRetiro] = useState({ monto: 0, observaciones: '' })
  const [fuentesRetiro, setFuentesRetiro] = useState<FuentePago[]>([{ key: '1', fuente: 'caja_menor', monto: 0 }])
  const [registrandoRetiro, setRegistrandoRetiro] = useState(false)
  const [confirmarRetiro, setConfirmarRetiro] = useState(false)

  // ── Gasto ──
  const [gasto, setGasto] = useState({ concepto: '', categoria: '', monto: 0, notas: '' })
  const [fuentesGasto, setFuentesGasto] = useState<FuentePago[]>([{ key: '1', fuente: 'caja_menor', monto: 0 }])
  const [registrandoGasto, setRegistrandoGasto] = useState(false)
  const [confirmarGasto, setConfirmarGasto] = useState(false)

  // ── Pago proveedor ──
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('')
  const [facturasProveedor, setFacturasProveedor] = useState<any[]>([])
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<any>(null)
  const [cargandoFacturas, setCargandoFacturas] = useState(false)
  const [pagoProveedor, setPagoProveedor] = useState({ monto: 0, observaciones: '' })
  const [fuentesPagoProveedor, setFuentesPagoProveedor] = useState<FuentePago[]>([{ key: '1', fuente: 'caja_menor', monto: 0 }])
  const [registrandoPago, setRegistrandoPago] = useState(false)
  const [confirmarPago, setConfirmarPago] = useState(false)

  // ── Nómina ──
  const [nominaItems, setNominaItems] = useState<NominaItem[]>([])
  const [pagandoNomina, setPagandoNomina] = useState<string | null>(null)
  const [pagandoTodos, setPagandoTodos] = useState(false)
  const [confirmarTodos, setConfirmarTodos] = useState(false)

  // ── Computed ──
  const saldoTotal = totalIngresos - totalEgresos
  const nominaAlDia = nominasPagadasHoy >= empleadosActivos
  const horasHoy = horasPagarPorFecha(fechaHoy)
  const esFestivoHoy = esDomingoOFestivo(fechaHoy)

  const saldosPorMedio = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of saldos) map[s.medio] = Number(s.saldo_acumulado)
    return map
  }, [saldos])

  const granTotalEntradasDia = ventasEfectivo + ventasNequi + ventasDaviplata + ventasTarjeta + ventasCredito
  const granTotalSaldosFondo = useMemo(() =>
    ['nequi', 'daviplata', 'tarjeta', 'credito', 'caja_mayor']
      .reduce((s, medio) => s + (saldosPorMedio[medio] ?? 0), 0),
    [saldosPorMedio])

  // ── Helpers ──
  const abrirPanel = (panel: typeof panelActivo) => {
    if (panel === 'nomina' && panelActivo !== 'nomina') {
      inicializarNomina()
    }
    setPanelActivo(prev => prev === panel ? 'ninguno' : panel)
    setConfirmarRetiro(false); setConfirmarGasto(false)
    setConfirmarPago(false); setConfirmarTodos(false)
  }

  const validarFuentes = (fuentes: FuentePago[], monto: number): string | null => {
    if (monto <= 0) return 'El monto debe ser mayor a 0'
    if (fuentes.some(f => f.monto < 0)) return 'Las fuentes no pueden tener montos negativos'
    if (fuentes.some(f => f.monto === 0)) return 'Todas las fuentes deben tener un monto mayor a 0'
    const suma = fuentes.reduce((s, f) => s + f.monto, 0)
    if (Math.abs(suma - monto) > 1) return 'La suma de fuentes no coincide con el monto total'

    // Validar saldo disponible por fondo
    for (const f of fuentes) {
      const medioNorm = (f.fuente === 'caja_menor' || f.fuente === 'efectivo') ? 'efectivo' : f.fuente
      const saldoDisponible = saldosPorMedio[medioNorm] ?? 0
      if (f.monto > saldoDisponible) {
        const nombreFondo = medioNorm === 'efectivo' ? 'Efectivo (Caja Menor)'
          : medioNorm === 'caja_mayor' ? 'Caja Mayor'
          : medioNorm.charAt(0).toUpperCase() + medioNorm.slice(1)
        return `Saldo insuficiente en ${nombreFondo}. Disponible: $${saldoDisponible.toLocaleString('es-CO')} — Solicitado: $${f.monto.toLocaleString('es-CO')}`
      }
    }

    return null
  }

  const TIPOS_EGRESO = ['gasto', 'retiro', 'pago_proveedor', 'nomina', 'egreso']
  const TIPOS_INGRESO = ['ingreso']

  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroTipo === 'egreso' && !TIPOS_EGRESO.includes(m.tipo_movimiento)) return false
    if (filtroTipo === 'ingreso' && !TIPOS_INGRESO.includes(m.tipo_movimiento)) return false
    if (filtroTipo !== 'todos' && filtroTipo !== 'egreso' && filtroTipo !== 'ingreso' && m.tipo_movimiento !== filtroTipo) return false
    const origenNorm = (m.origen_destino === 'caja_menor' || m.origen_destino === 'efectivo') ? 'efectivo' : m.origen_destino
    if (filtroOrigen !== 'todos' && origenNorm !== filtroOrigen) return false
    return true
  })
  const handleTransferencia = async () => {
    if (transferencia.monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (transferencia.origen === transferencia.destino) { toast.error('Origen y destino no pueden ser iguales'); return }
    setTransfiriendo(true)
    try {
      const { error } = await (supabase.rpc as any)('transferir_entre_fondos', {
        p_origen: transferencia.origen,
        p_destino: transferencia.destino,
        p_monto: transferencia.monto,
        p_observaciones: transferencia.observaciones || null,
      })
      if (error) throw error
      toast.success('Transferencia registrada')
      setPanelTransferencia(false)
      setTransferencia({ origen: 'efectivo', destino: 'nequi', monto: 0, observaciones: '' })
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setTransfiriendo(false)
    }
  }

  // ── Handlers retiro ──
  const handleRegistrarRetiro = async () => {
    if (!retiro.observaciones.trim()) { toast.error('Las observaciones son obligatorias'); return }
    const err = validarFuentes(fuentesRetiro, retiro.monto)
    if (err) { toast.error(err); return }
    setRegistrandoRetiro(true)
    try {
      const { error } = await supabase.rpc('registrar_retiro', {
        p_monto: retiro.monto,
        p_observaciones: retiro.observaciones,
        p_fuentes: fuentesRetiro.map(f => ({ fuente: f.fuente, monto: f.monto })) as any,
      })
      if (error) throw error
      toast.success('Retiro registrado')
      setPanelActivo('ninguno')
      setRetiro({ monto: 0, observaciones: '' })
      setFuentesRetiro([{ key: '1', fuente: 'caja_menor', monto: 0 }])
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setRegistrandoRetiro(false); setConfirmarRetiro(false)
    }
  }

  // ── Handlers gasto ──
  const handleRegistrarGasto = async () => {
    if (!gasto.concepto.trim()) { toast.error('El concepto es obligatorio'); return }
    const err = validarFuentes(fuentesGasto, gasto.monto)
    if (err) { toast.error(err); return }
    setRegistrandoGasto(true)
    try {
      const { error } = await supabase.rpc('registrar_gasto_caja', {
        p_concepto: gasto.concepto,
        p_categoria: gasto.categoria || 'General',
        p_monto: gasto.monto,
        p_fuentes: fuentesGasto.map(f => ({ fuente: f.fuente, monto: f.monto })) as any,
        p_proveedor_id: undefined,
        p_notas: gasto.notas || undefined,
      })
      if (error) throw error
      toast.success('Gasto registrado')
      setPanelActivo('ninguno')
      setGasto({ concepto: '', categoria: '', monto: 0, notas: '' })
      setFuentesGasto([{ key: '1', fuente: 'caja_menor', monto: 0 }])
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setRegistrandoGasto(false); setConfirmarGasto(false)
    }
  }

  // ── Handlers proveedor ──
  const handleCargarFacturas = async (provId: string) => {
    setProveedorSeleccionado(provId)
    setFacturaSeleccionada(null)
    setCargandoFacturas(true)
    const { data } = await supabase
      .from('facturas_proveedor')
      .select('id, numero_factura, saldo_pendiente, monto_total, estado')
      .eq('proveedor_id', provId)
      .in('estado', ['pendiente', 'parcial'])
      .order('created_at', { ascending: false })
    setFacturasProveedor(data ?? [])
    setCargandoFacturas(false)
  }

  const handleRegistrarPagoProveedor = async () => {
    if (!facturaSeleccionada) { toast.error('Selecciona una factura'); return }
    if (pagoProveedor.monto > Number(facturaSeleccionada.saldo_pendiente)) {
      toast.error(`El monto no puede superar el saldo pendiente: $${Number(facturaSeleccionada.saldo_pendiente).toLocaleString('es-CO')}`)
      return
    }
    const err = validarFuentes(fuentesPagoProveedor, pagoProveedor.monto)
    if (err) { toast.error(err); return }
    setRegistrandoPago(true)
    try {
      const { error } = await supabase.rpc('registrar_pago_factura', {
        p_factura_id: facturaSeleccionada.id,
        p_monto: pagoProveedor.monto,
        p_fuentes: fuentesPagoProveedor.map(f => ({ fuente: f.fuente, monto: f.monto })) as any,
        p_fecha_pago: fechaHoy,
        p_observaciones: pagoProveedor.observaciones || undefined,
      })
      if (error) throw error
      toast.success('Pago a proveedor registrado')
      setPanelActivo('ninguno')
      setProveedorSeleccionado(''); setFacturaSeleccionada(null)
      setFacturasProveedor([])
      setPagoProveedor({ monto: 0, observaciones: '' })
      setFuentesPagoProveedor([{ key: '1', fuente: 'caja_menor', monto: 0 }])
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setRegistrandoPago(false); setConfirmarPago(false)
    }
  }

  // ── Handlers nómina ──
  const inicializarNomina = () => {
    const items: NominaItem[] = empleados.map(e => ({
      empleado_id: e.id,
      nombre: e.nombre_completo,
      salario_base: Number(e.salario_base ?? 0),
      horas: horasHoy,
      bonificaciones: 0,
      deducciones: 0,
      metodo_pago: 'efectivo',
      expandido: false,
      pagado: empleadosPagadosHoy.includes(e.id),
    }))
    setNominaItems(items)
  }

  const handlePagarNomina = async (item: NominaItem) => {
    if (item.salario_base <= 0) { toast.error('Salario base inválido'); return }
    const pagoDia = calcularPagoDia(item.salario_base, fechaHoy, item.horas)
    const totalPago = pagoDia + item.bonificaciones - item.deducciones
    if (totalPago <= 0) { toast.error('El total a pagar debe ser mayor a 0'); return }
    setPagandoNomina(item.empleado_id)
    try {
      const { error } = await supabase.rpc('registrar_nomina', {
        p_empleado_id: item.empleado_id,
        p_fecha: fechaHoy,
        p_horas_trabajadas: item.horas,
        p_salario_base: pagoDia,
        p_bonificaciones: item.bonificaciones,
        p_concepto_bonificacion: undefined,
        p_deducciones: item.deducciones,
        p_concepto_deduccion: undefined,
        p_metodo_pago: item.metodo_pago,
        p_notas: undefined,
      })
      if (error) throw error
      setNominaItems(prev => prev.map(it => it.empleado_id === item.empleado_id ? { ...it, pagado: true, expandido: false } : it))
      toast.success(`Nómina pagada — ${item.nombre}`)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setPagandoNomina(null)
    }
  }

  const handlePagarTodos = async () => {
    const pendientes = nominaItems.filter(i => !i.pagado && i.salario_base > 0)
    if (pendientes.length === 0) { toast.error('No hay nóminas pendientes'); return }
    setPagandoTodos(true)
    let exitosos = 0
    for (const item of pendientes) {
      const pagoDia = calcularPagoDia(item.salario_base, fechaHoy, item.horas)
      const totalPago = pagoDia + item.bonificaciones - item.deducciones
      if (totalPago <= 0) continue
      try {
        const { error } = await supabase.rpc('registrar_nomina', {
          p_empleado_id: item.empleado_id,
          p_fecha: fechaHoy,
          p_horas_trabajadas: item.horas,
          p_salario_base: pagoDia,
          p_bonificaciones: item.bonificaciones,
          p_concepto_bonificacion: undefined,
          p_deducciones: item.deducciones,
          p_concepto_deduccion: undefined,
          p_metodo_pago: item.metodo_pago,
          p_notas: undefined,
        })
        if (!error) {
          setNominaItems(prev => prev.map(it => it.empleado_id === item.empleado_id ? { ...it, pagado: true, expandido: false } : it))
          exitosos++
        }
      } catch { /* continuar con el siguiente */ }
    }
    setPagandoTodos(false)
    setConfirmarTodos(false)
    toast.success(`${exitosos} nómina(s) pagada(s)`)
    router.refresh()
  }

  const agregarEmpleadoExtra = () => {
    setNominaItems(prev => [...prev, {
      empleado_id: `extra-${Date.now()}`,
      nombre: '',
      salario_base: 0,
      horas: horasHoy,
      bonificaciones: 0,
      deducciones: 0,
      metodo_pago: 'efectivo',
      expandido: true,
      pagado: false,
    }])
  }

  const updateNominaItem = (id: string, campo: Partial<NominaItem>) => {
    setNominaItems(prev => prev.map(it => it.empleado_id === id ? { ...it, ...campo } : it))
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Header diagonal */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-yellow">Caja</h1>
            <p className="mt-0.5 text-xs text-steel-300">{fechaHoy}{esFestivoHoy ? ' · Domingo/Festivo' : ''}</p>
          </div>
          {!arqueoHoy ? (
            <Button variant="outline" className="border-brand-red/30 bg-transparent text-brand-red hover:bg-brand-red/15 hover:text-brand-red"
              onClick={() => abrirPanel('arqueo')}>
              Arqueo y Cierre de Caja
            </Button>
          ) : (
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Caja cerrada hoy</span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {/* Advertencia nómina */}
      {!nominaAlDia && (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-3 text-sm text-brand-yellow">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{nominasPagadasHoy} de {empleadosActivos} empleados tienen nómina pagada hoy. Se recomienda pagar antes de cerrar caja.</span>
        </div>
      )}

      {/* Panel arqueo */}
      {panelActivo === 'arqueo' && !arqueoHoy && (
        <ArqueoPanel
          ventasEfectivo={ventasEfectivo}
          egresosEfectivo={egresosEfectivo}
          montoBase={config.monto_base_caja_menor}
          fechaHoy={fechaHoy}
          onCerrar={() => setPanelActivo('ninguno')}
        />
      )}

      {/* Entradas del día */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Entradas del día
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { medio: 'efectivo', valor: ventasEfectivo, sub: 'Caja menor' },
            { medio: 'nequi', valor: ventasNequi },
            { medio: 'daviplata', valor: ventasDaviplata },
            { medio: 'tarjeta', valor: ventasTarjeta },
            { medio: 'credito', valor: ventasCredito },
          ].map(({ medio, valor, sub }) => {
            const est = MEDIO_ESTILO[medio]
            const Icono = est.icono
            return (
              <div key={medio} className={`rounded-xl border ${est.borde} ${est.fondo} p-3 text-center`}>
                <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${est.anillo} ${est.texto}`}>
                  <Icono className="size-4" />
                </span>
                <p className="text-xs font-medium text-steel-300">{est.label}</p>
                <p className={`mt-1 font-display font-bold ${est.texto}`}>${valor.toLocaleString('es-CO')}</p>
                {sub && <p className="mt-0.5 text-[11px] text-steel-500">{sub}</p>}
              </div>
            )
          })}
          <div className="rounded-xl border-2 border-brand-yellow/40 bg-brand-yellow/10 p-3 text-center">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-yellow">
              <Calculator className="size-4" />
            </span>
            <p className="text-xs font-medium text-steel-300">Gran Total</p>
            <p className="mt-1 font-display font-bold text-brand-yellow">${granTotalEntradasDia.toLocaleString('es-CO')}</p>
            <p className="mt-0.5 text-[11px] text-steel-500">Suma de los 5 medios</p>
          </div>
        </div>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-emerald-500 bg-[#111820] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Ingresos totales</p>
          <p className="mt-1 font-display text-lg font-bold text-emerald-400 md:text-2xl">${totalIngresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-red bg-[#111820] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Egresos totales</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-red md:text-2xl">${totalEgresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 border-l-4 border-l-brand-blue bg-[#111820] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Saldo total</p>
          <p className={`mt-1 font-display text-lg font-bold md:text-2xl ${saldoTotal >= 0 ? 'text-white' : 'text-brand-red'}`}>
            ${saldoTotal.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {(['retiro', 'gasto', 'proveedor', 'nomina'] as const).map(p => (
          <Button key={p} variant="outline" onClick={() => abrirPanel(p)}
            className={`border-white/10 bg-[#1a2430] text-white hover:bg-white/5 hover:text-white ${panelActivo === p ? 'border-brand-yellow text-brand-yellow' : ''}`}>
            {p === 'retiro' ? 'Registrar Retiro'
              : p === 'gasto' ? 'Registrar Gasto'
              : p === 'proveedor' ? 'Pago a Proveedor'
              : 'Pagar Nómina'}
          </Button>
        ))}
      </div>

      {/* Panel retiro */}
      {panelActivo === 'retiro' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h3 className="font-display font-bold text-white">Registrar Retiro</h3>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Monto total</Label>
            <Input type="number" value={retiro.monto || ''} onFocus={e => e.target.select()}
              className="border-white/10 bg-[#1a2430] text-white"
              onChange={e => {
                const m = parseFloat(e.target.value) || 0
                setRetiro(p => ({ ...p, monto: m }))
                setFuentesRetiro([{ key: '1', fuente: 'caja_menor', monto: m }])
              }} />
          </div>
          <FuentesPagoEditor fuentes={fuentesRetiro} setFuentes={setFuentesRetiro} montoTotal={retiro.monto} />
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Observaciones *</Label>
            <Textarea value={retiro.observaciones} onChange={e => setRetiro(p => ({ ...p, observaciones: e.target.value }))} rows={2} className="border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500" />
          </div>
          {!confirmarRetiro ? (
            <div className="flex gap-2">
              <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => setConfirmarRetiro(true)}>Registrar retiro</Button>
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setPanelActivo('ninguno')}>Cancelar</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">¿Confirmas el retiro de ${retiro.monto.toLocaleString('es-CO')}?</p>
              <div className="flex gap-2">
                <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleRegistrarRetiro} disabled={registrandoRetiro}>
                  {registrandoRetiro ? 'Registrando…' : 'Sí, registrar'}
                </Button>
                <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmarRetiro(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel gasto */}
      {panelActivo === 'gasto' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h3 className="font-display font-bold text-white">Registrar Gasto</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Concepto *</Label>
              <Input value={gasto.concepto} onChange={e => setGasto(p => ({ ...p, concepto: e.target.value }))} className="border-white/10 bg-[#1a2430] text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Categoría</Label>
              <Select items={categoriasGasto.map(c => ({ value: c.nombre, label: c.nombre }))}
                onValueChange={v => v && setGasto(p => ({ ...p, categoria: v }))} value={gasto.categoria || ''}>
                <SelectTrigger className="border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Selecciona categoría…" /></SelectTrigger>
                <SelectContent>
                  {categoriasGasto.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Monto total</Label>
              <Input type="number" value={gasto.monto || ''} onFocus={e => e.target.select()}
                className="border-white/10 bg-[#1a2430] text-white"
                onChange={e => {
                  const m = parseFloat(e.target.value) || 0
                  setGasto(p => ({ ...p, monto: m }))
                  setFuentesGasto([{ key: '1', fuente: 'caja_menor', monto: m }])
                }} />
            </div>
          </div>
          <FuentesPagoEditor fuentes={fuentesGasto} setFuentes={setFuentesGasto} montoTotal={gasto.monto} />
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Notas</Label>
            <Textarea value={gasto.notas} onChange={e => setGasto(p => ({ ...p, notas: e.target.value }))} rows={2} className="border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500" />
          </div>
          {!confirmarGasto ? (
            <div className="flex gap-2">
              <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => setConfirmarGasto(true)}>Registrar gasto</Button>
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setPanelActivo('ninguno')}>Cancelar</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">¿Confirmas el gasto de ${gasto.monto.toLocaleString('es-CO')} — {gasto.concepto}?</p>
              <div className="flex gap-2">
                <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleRegistrarGasto} disabled={registrandoGasto}>
                  {registrandoGasto ? 'Registrando…' : 'Sí, registrar'}
                </Button>
                <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmarGasto(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel pago proveedor */}
      {panelActivo === 'proveedor' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h3 className="font-display font-bold text-white">Pago a Proveedor</h3>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Proveedor</Label>
            <Select items={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
              onValueChange={v => v && handleCargarFacturas(v)} value={proveedorSeleccionado}>
              <SelectTrigger className="border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
              <SelectContent>
                {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {cargandoFacturas && <p className="text-xs text-steel-500">Cargando facturas…</p>}

          {!cargandoFacturas && facturasProveedor.length > 0 && (
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {facturasProveedor.map(f => (
                <button key={f.id} type="button"
                  onClick={() => {
                    setFacturaSeleccionada(f)
                    const saldo = Number(f.saldo_pendiente)
                    setPagoProveedor(p => ({ ...p, monto: saldo }))
                    setFuentesPagoProveedor([{ key: '1', fuente: 'caja_menor', monto: saldo }])
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${facturaSeleccionada?.id === f.id ? 'border-brand-yellow bg-white/5' : 'border-white/10 hover:bg-white/5'}`}>
                  <span className="font-medium text-white">{f.numero_factura ? `#${f.numero_factura}` : 'Sin número'}</span>
                  <span className="ml-2 text-steel-300">Saldo: ${Number(f.saldo_pendiente).toLocaleString('es-CO')}</span>
                  <span className="ml-2 inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2 py-0.5 text-xs font-semibold text-brand-yellow">{f.estado}</span>
                </button>
              ))}
            </div>
          )}

          {!cargandoFacturas && proveedorSeleccionado && facturasProveedor.length === 0 && (
            <p className="text-xs text-steel-500">Sin facturas pendientes.</p>
          )}

          {facturaSeleccionada && (
            <div className="space-y-3 border-t border-white/8 pt-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">
                  Monto a pagar (máx ${Number(facturaSeleccionada.saldo_pendiente).toLocaleString('es-CO')})
                </Label>
                <Input type="number" min={1} max={Number(facturaSeleccionada.saldo_pendiente)}
                  value={pagoProveedor.monto || ''} onFocus={e => e.target.select()}
                  className="border-white/10 bg-[#1a2430] text-white"
                  onChange={e => {
                    const m = Math.min(parseFloat(e.target.value) || 0, Number(facturaSeleccionada.saldo_pendiente))
                    setPagoProveedor(p => ({ ...p, monto: m }))
                    setFuentesPagoProveedor([{ key: '1', fuente: 'caja_menor', monto: m }])
                  }} />
              </div>
              <FuentesPagoEditor fuentes={fuentesPagoProveedor} setFuentes={setFuentesPagoProveedor} montoTotal={pagoProveedor.monto} />
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Observaciones</Label>
                <Textarea value={pagoProveedor.observaciones} onChange={e => setPagoProveedor(p => ({ ...p, observaciones: e.target.value }))} rows={2} className="border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500" />
              </div>
              {!confirmarPago ? (
                <div className="flex gap-2">
                  <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => setConfirmarPago(true)}>Registrar pago</Button>
                  <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setPanelActivo('ninguno')}>Cancelar</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">¿Confirmas el pago de ${pagoProveedor.monto.toLocaleString('es-CO')} a {proveedores.find(p => p.id === proveedorSeleccionado)?.nombre}?</p>
                  <div className="flex gap-2">
                    <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleRegistrarPagoProveedor} disabled={registrandoPago}>
                      {registrandoPago ? 'Registrando…' : 'Sí, registrar'}
                    </Button>
                    <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmarPago(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Panel nómina */}
      {panelActivo === 'nomina' && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-white">Pagar Nómina — {fechaHoy}</h3>
              <p className="mt-0.5 text-xs text-steel-300">
                Jornada: {horasHoy}h{esFestivoHoy ? ' (domingo/festivo)' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={agregarEmpleadoExtra}>
                <Plus className="mr-1 h-4 w-4" />Otro empleado
              </Button>
              {!confirmarTodos ? (
                <Button size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105"
                  onClick={() => setConfirmarTodos(true)}
                  disabled={nominaItems.filter(i => !i.pagado).length === 0}>
                  Pagar a todos
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handlePagarTodos} disabled={pagandoTodos}>
                    {pagandoTodos ? 'Pagando…' : 'Confirmar todos'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmarTodos(false)}>Cancelar</Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {nominaItems.map(item => {
              const pagoDia = item.salario_base > 0 ? calcularPagoDia(item.salario_base, fechaHoy, item.horas) : 0
              const totalPago = pagoDia + item.bonificaciones - item.deducciones
              const esExtra = item.empleado_id.startsWith('extra-')

              return (
                <div key={item.empleado_id}
                  className={`space-y-2 rounded-xl border p-3 ${item.pagado ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-[#1a2430]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {esExtra ? (
                        <Input placeholder="Nombre del empleado"
                          value={item.nombre}
                          onChange={e => updateNominaItem(item.empleado_id, { nombre: e.target.value })}
                          className="h-7 border-white/10 bg-[#111820] text-sm text-white" />
                      ) : (
                        <p className="truncate text-sm font-medium text-white">{item.nombre}</p>
                      )}
                      {!item.expandido && !item.pagado && (
                        <p className="mt-0.5 text-xs text-steel-300">
                          {item.horas}h · ${pagoDia.toLocaleString('es-CO')}
                          {item.bonificaciones > 0 && ` +$${item.bonificaciones.toLocaleString('es-CO')}`}
                          {item.deducciones > 0 && ` -$${item.deducciones.toLocaleString('es-CO')}`}
                          {' → '}<strong className="text-white">${totalPago.toLocaleString('es-CO')}</strong>
                          {' · '}{METODOS_NOMINA.find(m => m.value === item.metodo_pago)?.label}
                        </p>
                      )}
                      {item.pagado && <p className="flex items-center gap-1 text-xs font-medium text-emerald-400"><Check className="h-3.5 w-3.5" /> Pagado — ${totalPago.toLocaleString('es-CO')}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!item.pagado && (
                        <>
                          <button type="button"
                            onClick={() => updateNominaItem(item.empleado_id, { expandido: !item.expandido })}
                            className="flex items-center gap-1 text-xs text-steel-300 hover:text-white">
                            {item.expandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {item.expandido ? 'Cerrar' : 'Modificar'}
                          </button>
                          <Button size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105"
                            disabled={pagandoNomina === item.empleado_id || totalPago <= 0}
                            onClick={() => handlePagarNomina(item)}>
                            {pagandoNomina === item.empleado_id ? 'Pagando…' : `Pagar $${totalPago.toLocaleString('es-CO')}`}
                          </Button>
                        </>
                      )}
                      {esExtra && !item.pagado && (
                        <button type="button"
                          onClick={() => setNominaItems(prev => prev.filter(it => it.empleado_id !== item.empleado_id))}
                          className="text-steel-300 hover:text-brand-red">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {item.expandido && !item.pagado && (
                    <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-1 md:grid-cols-4">
                      <div className="space-y-1">
                        <label className="text-xs text-steel-300">Salario base</label>
                        <Input type="number" value={item.salario_base || ''} onFocus={e => e.target.select()}
                          onChange={e => updateNominaItem(item.empleado_id, { salario_base: parseFloat(e.target.value) || 0 })}
                          className="h-7 border-white/10 bg-[#111820] text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-steel-300">Horas (máx {horasHoy})</label>
                        <Input type="number" min={0} max={horasHoy} step={0.5} value={item.horas || ''} onFocus={e => e.target.select()}
                          onChange={e => updateNominaItem(item.empleado_id, { horas: parseFloat(e.target.value) || 0 })}
                          className="h-7 border-white/10 bg-[#111820] text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-steel-300">Bonificación</label>
                        <Input type="number" value={item.bonificaciones || ''} onFocus={e => e.target.select()}
                          onChange={e => updateNominaItem(item.empleado_id, { bonificaciones: parseFloat(e.target.value) || 0 })}
                          className="h-7 border-white/10 bg-[#111820] text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-steel-300">Deducción</label>
                        <Input type="number" value={item.deducciones || ''} onFocus={e => e.target.select()}
                          onChange={e => updateNominaItem(item.empleado_id, { deducciones: parseFloat(e.target.value) || 0 })}
                          className="h-7 border-white/10 bg-[#111820] text-xs text-white" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-steel-300">Método de pago</label>
                        <Select items={METODOS_NOMINA}
                          onValueChange={v => v && updateNominaItem(item.empleado_id, { metodo_pago: v })}
                          value={item.metodo_pago}>
                          <SelectTrigger className="h-7 border-white/10 bg-[#111820] text-xs text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {METODOS_NOMINA.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex items-end">
                        <p className="text-xs text-steel-300">
                          Total: <strong className={totalPago > 0 ? 'text-white' : 'text-brand-red'}>${totalPago.toLocaleString('es-CO')}</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Button variant="outline" onClick={() => setPanelActivo('ninguno')} className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
            Cerrar panel de nómina
          </Button>
        </div>
      )}

      {/* Movimientos del día */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Movimientos del día
        </h2>
        <div className="flex flex-wrap gap-3">
          <Select items={[{ value: 'todos', label: 'Todos los tipos' }, ...Object.entries(TIPO_MOV_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
            onValueChange={v => v && setFiltroTipo(v)} value={filtroTipo}>
            <SelectTrigger className="w-48 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="ingreso">Ingresos</SelectItem>
              <SelectItem value="egreso">Egresos</SelectItem>
              <SelectItem value="transferencia_caja_mayor">Transferencias</SelectItem>
            </SelectContent>
          </Select>
          <Select items={[{ value: 'todos', label: 'Todos los medios' }, ...Object.entries(ORIGEN_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
            onValueChange={v => v && setFiltroOrigen(v)} value={filtroOrigen}>
            <SelectTrigger className="w-44 border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los medios</SelectItem>
              <SelectItem value="efectivo">Efectivo (Caja Menor)</SelectItem>
              <SelectItem value="caja_mayor">Caja Mayor</SelectItem>
              <SelectItem value="nequi">Nequi</SelectItem>
              <SelectItem value="daviplata">Daviplata</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
              <TableHead>Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosFiltrados.map(m => {
              const esIngreso = m.tipo_movimiento === 'ingreso'
              return (
                <TableRow key={m.id} className="border-white/8 hover:bg-white/5">
                  <TableCell className="text-xs text-steel-300">{m.hora?.slice(0, 5)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${esIngreso ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
                      {TIPO_MOV_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-steel-300">{ORIGEN_LABEL[m.origen_destino] ?? m.origen_destino}</TableCell>
                  <TableCell className={`text-right font-display font-bold ${esIngreso ? 'text-emerald-400' : 'text-brand-red'}`}>
                    {esIngreso ? '+' : '-'}${Number(m.monto).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-xs text-steel-300">{m.observaciones ?? '—'}</TableCell>
                </TableRow>
              )
            })}
            {movimientosFiltrados.length === 0 && (
              <TableRow className="border-white/8"><TableCell colSpan={5} className="py-6 text-center text-steel-500">Sin movimientos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Fondos de denominaciones */}
      <DenominacionesPanel fondos={fondos} config={config} />

      {/* Transferencia entre fondos */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Transferencia entre fondos
          </h2>
          <button type="button" onClick={() => setPanelTransferencia(v => !v)}
            className="text-sm text-brand-blue hover:underline">
            {panelTransferencia ? 'Cancelar' : 'Nueva transferencia'}
          </button>
        </div>
        {panelTransferencia && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-steel-300">Origen</label>
              <Select items={[
                { value: 'efectivo', label: 'Efectivo (Caja Menor)' },
                { value: 'caja_mayor', label: 'Caja Mayor' },
                { value: 'nequi', label: 'Nequi' },
                { value: 'daviplata', label: 'Daviplata' },
                { value: 'tarjeta', label: 'Tarjeta' },
              ]} value={transferencia.origen}
                onValueChange={v => v && setTransferencia(p => ({ ...p, origen: v }))}>
                <SelectTrigger className="h-8 border-white/10 bg-[#1a2430] text-xs text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo (Caja Menor)</SelectItem>
                  <SelectItem value="caja_mayor">Caja Mayor</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="daviplata">Daviplata</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-steel-300">Destino</label>
              <Select items={[
                { value: 'efectivo', label: 'Efectivo (Caja Menor)' },
                { value: 'caja_mayor', label: 'Caja Mayor' },
                { value: 'nequi', label: 'Nequi' },
                { value: 'daviplata', label: 'Daviplata' },
                { value: 'tarjeta', label: 'Tarjeta' },
              ]} value={transferencia.destino}
                onValueChange={v => v && setTransferencia(p => ({ ...p, destino: v }))}>
                <SelectTrigger className="h-8 border-white/10 bg-[#1a2430] text-xs text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo (Caja Menor)</SelectItem>
                  <SelectItem value="caja_mayor">Caja Mayor</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="daviplata">Daviplata</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-steel-300">Monto</label>
              <Input type="number" value={transferencia.monto || ''}
                onChange={e => setTransferencia(p => ({ ...p, monto: parseFloat(e.target.value) || 0 }))}
                className="h-8 border-white/10 bg-[#1a2430] text-xs text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-steel-300">Observaciones</label>
              <Input value={transferencia.observaciones}
                onChange={e => setTransferencia(p => ({ ...p, observaciones: e.target.value }))}
                className="h-8 border-white/10 bg-[#1a2430] text-xs text-white" placeholder="Opcional" />
            </div>
            <div className="col-span-2 md:col-span-4">
              <Button size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleTransferencia} disabled={transfiriendo}>
                {transfiriendo ? 'Transfiriendo…' : `Transferir $${transferencia.monto.toLocaleString('es-CO')}`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Saldos acumulados — estado real de cada fondo */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Saldos acumulados por fondo
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {(['nequi', 'daviplata', 'tarjeta', 'credito', 'caja_mayor'] as const).map(medio => {
            const est = MEDIO_ESTILO[medio]
            const Icono = est.icono
            const saldo = saldosPorMedio[medio] ?? 0
            return (
              <div key={medio} className={`rounded-xl border ${est.borde} ${est.fondo} p-3 text-center`}>
                <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${est.anillo} ${est.texto}`}>
                  <Icono className="size-4" />
                </span>
                <p className="text-xs font-medium text-steel-300">{est.label}</p>
                <p className={`mt-1 font-display font-bold ${est.texto}`}>${Number(saldo).toLocaleString('es-CO')}</p>
                <p className="mt-0.5 text-[11px] text-steel-500">Saldo actual</p>
              </div>
            )
          })}
          <div className="rounded-xl border-2 border-brand-yellow/40 bg-brand-yellow/10 p-3 text-center">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-yellow">
              <Calculator className="size-4" />
            </span>
            <p className="text-xs font-medium text-steel-300">Gran Total</p>
            <p className="mt-1 font-display font-bold text-brand-yellow">${granTotalSaldosFondo.toLocaleString('es-CO')}</p>
            <p className="mt-0.5 text-[11px] text-steel-500">Suma de los 5 fondos</p>
          </div>
        </div>
      </div>
    </div>
  )
}