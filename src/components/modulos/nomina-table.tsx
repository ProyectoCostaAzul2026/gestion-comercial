'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { confirmar } from '@/components/ui/confirmar'
import { DetalleDialogo, Dialogo, PieDialogo } from '@/components/ui/dialogo'
import { calcularPagoDia, horasPagarPorFecha, turnoEnFecha } from '@/lib/festivos-colombia'
import { toast } from '@/lib/avisos'
import { useRouter } from 'next/navigation'
import { Minus, Plus, SlidersHorizontal, Trophy } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { bonoEquipoDelDia, bonosIndividualesDelDia, leerBonos, type BonoSugerido } from '@/lib/bonos-ventas'

interface TurnoSemana {
  dia_semana: string
  hora_inicio: string
  hora_fin: string
}

interface NominaHoy {
  id: string
  total_pago: number
  estado: string
  horas_trabajadas: number | null
  bonificaciones?: number | null
  deducciones?: number | null
}

/** Bono y deducción de un empleado para el pago de hoy (se mandan a registrar_nomina) */
interface Ajuste {
  bono: number
  conceptoBono: string
  deduccion: number
  conceptoDeduccion: string
}
const SIN_AJUSTE: Ajuste = { bono: 0, conceptoBono: '', deduccion: 0, conceptoDeduccion: '' }
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

interface EmpleadoNomina {
  id: string
  nombre_completo: string
  salario_base: number
  nominaHoy: NominaHoy | null
  turnosSemana: TurnoSemana[]
}

interface HistorialNomina {
  id: string
  empleado_id?: string
  periodo_inicio: string
  periodo_fin: string
  total_pago: number
  estado: string
  salario_base: number
  horas_trabajadas: number | null
  bonificaciones: number
  deducciones: number
  concepto_bonificacion?: string | null
  concepto_deduccion?: string | null
  notas: string | null
  profiles: { nombre_completo: string } | null
}

const DIAS_A_NUM: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
}

const METODOS_NOMINA = [
  { value: 'efectivo', label: 'Efectivo (Caja Menor)' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
]

function calcularHorasTurno(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return Math.max(0, ((hf * 60 + mf) - (hi * 60 + mi) - 60) / 60)
}

export function NominaTable({
  empleados, historial, fechaHoy, permisosHoy = [], bonosVentas, ventasHoy = [],
}: {
  empleados: EmpleadoNomina[]
  historial: HistorialNomina[]
  fechaHoy: string
  /** Empleados con permiso hoy (no asisten): no entran en el pago del día */
  permisosHoy?: string[]
  /** configuracion_negocio.bonos_ventas */
  bonosVentas?: unknown
  /** Ventas de hoy (netas, sin anuladas) con su vendedor, para los bonos por ventas */
  ventasHoy?: { empleado_id: string; neto: number }[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [tabActiva, setTabActiva] = useState<'hoy' | 'historial'>('hoy')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [pagandoTodos, setPagandoTodos] = useState(false)
  const [pagando, setPagando] = useState<string | null>(null)
  const [metodosPago, setMetodosPago] = useState<Record<string, string>>({})
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>({})
  const [ajustando, setAjustando] = useState<string | null>(null)
  // Bonos por ventas que el administrador quitó (por empleado); los demás quedan aprobados
  const [quitados, setQuitados] = useState<Record<string, string[]>>({})

  const diaHoy = new Date(fechaHoy + 'T12:00:00').getDay()
  const horasEstandarHoy = horasPagarPorFecha(fechaHoy)

  const empleadosConCalculo = useMemo(() => {
    return empleados.map(e => {
      const turnoHoy = e.turnosSemana.find(t => DIAS_A_NUM[t.dia_semana] === diaHoy)
      // En festivo el turno habitual se recorta a la jornada de festivo
      const real = turnoHoy ? turnoEnFecha(fechaHoy, turnoHoy.hora_inicio, turnoHoy.hora_fin) : null
      const horasTurno = real ? calcularHorasTurno(real.inicio, real.fin) : null
      const pagoSugerido = turnoHoy
        ? calcularPagoDia(e.salario_base, fechaHoy, horasTurno ?? undefined)
        : 0
      return { ...e, horasTurno, pagoSugerido, tieneHorario: !!turnoHoy, conPermiso: permisosHoy.includes(e.id) }
    })
  }, [empleados, fechaHoy, diaHoy, permisosHoy])

  // ✅ Solo empleados con turno hoy
  const empleadosEnTurno = useMemo(() =>
    empleadosConCalculo.filter(e => e.tieneHorario && !e.conPermiso),
    [empleadosConCalculo])

  // Bonos por ventas sugeridos: para todos (ventas del día) e individuales (cada venta del vendedor)
  const bonos = useMemo(() => leerBonos(bonosVentas), [bonosVentas])
  const ventasDelDia = useMemo(() => ventasHoy.reduce((s, v) => s + v.neto, 0), [ventasHoy])
  const sugeridosDe = useMemo(() => {
    const equipo = bonoEquipoDelDia(ventasDelDia, bonos)
    return (id: string): BonoSugerido[] => [
      ...(equipo ? [equipo] : []),
      ...bonosIndividualesDelDia(ventasHoy.filter(v => v.empleado_id === id).map(v => v.neto), bonos),
    ]
  }, [bonos, ventasDelDia, ventasHoy])
  const aprobadosDe = (id: string) => sugeridosDe(id).filter(b => !(quitados[id] ?? []).includes(b.clave))
  const bonoVentasDe = (id: string) => aprobadosDe(id).reduce((s, b) => s + b.monto, 0)
  const alternarBono = (id: string, clave: string) =>
    setQuitados(prev => {
      const l = prev[id] ?? []
      return { ...prev, [id]: l.includes(clave) ? l.filter(c => c !== clave) : [...l, clave] }
    })

  const pendientes = empleadosEnTurno.filter(e => !e.nominaHoy)
  const getMetodo = (id: string) => metodosPago[id] ?? 'efectivo'
  const nombreMetodo = (id: string) => METODOS_NOMINA.find(m => m.value === getMetodo(id))?.label ?? getMetodo(id)
  const ajusteDe = (id: string) => ajustes[id] ?? SIN_AJUSTE
  const totalDe = (e: { id: string; pagoSugerido: number }) => e.pagoSugerido + ajusteDe(e.id).bono + bonoVentasDe(e.id) - ajusteDe(e.id).deduccion
  const totalPagarTodos = pendientes.reduce((s, e) => s + totalDe(e), 0)

  /** Filas del resumen de un pago: día, bono, deducción y total */
  const filasPago = (e: typeof empleadosConCalculo[0]) => {
    const a = ajusteDe(e.id)
    return [
      { etiqueta: `Pago del día${e.horasTurno != null ? ` (${e.horasTurno.toFixed(1)} h)` : ''}`, valor: pesos(e.pagoSugerido) },
      ...aprobadosDe(e.id).map(b => ({ etiqueta: `Bono por ventas: ${b.concepto}`, valor: <span className="text-entra">+{pesos(b.monto)}</span> })),
      ...(a.bono > 0 ? [{ etiqueta: `Bono: ${a.conceptoBono}`, valor: <span className="text-entra">+{pesos(a.bono)}</span> }] : []),
      ...(a.deduccion > 0 ? [{ etiqueta: `Deducción: ${a.conceptoDeduccion}`, valor: <span className="text-sale">−{pesos(a.deduccion)}</span> }] : []),
      { etiqueta: 'Sale de', valor: nombreMetodo(e.id) },
      { etiqueta: 'Total a pagar', valor: pesos(totalDe(e)), fuerte: true },
    ]
  }

  const pagarEmpleado = async (e: typeof empleadosConCalculo[0], metodo: string) => {
    const a = ajusteDe(e.id)
    const porVentas = aprobadosDe(e.id)
    const bonoTotal = a.bono + porVentas.reduce((s, b) => s + b.monto, 0)
    const concepto = [...porVentas.map(b => `Bono por ventas: ${b.concepto}`), ...(a.bono > 0 ? [a.conceptoBono.trim()] : [])].join('; ')
    const { error } = await supabase.rpc('registrar_nomina', {
      p_empleado_id: e.id,
      p_fecha: fechaHoy,
      p_horas_trabajadas: e.horasTurno ?? horasEstandarHoy,
      p_salario_base: e.pagoSugerido,
      p_bonificaciones: bonoTotal,
      p_concepto_bonificacion: bonoTotal > 0 ? concepto : undefined,
      p_deducciones: a.deduccion,
      p_concepto_deduccion: a.deduccion > 0 ? a.conceptoDeduccion.trim() : undefined,
      p_metodo_pago: metodo,
    })
    if (error) throw new Error(error.message)
  }

  const handlePagarUno = async (empleadoId: string) => {
    const emp = empleadosConCalculo.find(e => e.id === empleadoId)
    if (!emp) return
    const ok = await confirmar({
      titulo: `¿Pagar la nómina de ${emp.nombre_completo}?`,
      mensaje: 'El pago queda registrado en la nómina de hoy y sale del medio elegido.',
      detalle: filasPago(emp),
      textoConfirmar: `Pagar ${pesos(totalDe(emp))}`,
    })
    if (!ok) return
    setPagando(emp.id)
    try {
      await pagarEmpleado(emp, getMetodo(empleadoId))
      toast.success(`Nómina de ${emp.nombre_completo} pagada`, { description: `${pesos(totalDe(emp))} desde ${nombreMetodo(emp.id)}.` })
      setAjustes(prev => { const { [emp.id]: _, ...resto } = prev; return resto })
      setQuitados(prev => { const { [emp.id]: _, ...resto } = prev; return resto })
      router.refresh()
    } catch (err: any) {
      toast.error('No se pudo registrar la nómina', { description: err.message })
    } finally {
      setPagando(null)
    }
  }

  const handlePagarTodos = async () => {
    if (pendientes.length === 0) {
      toast.info('Todos los empleados en turno ya tienen la nómina de hoy')
      return
    }
    const ok = await confirmar({
      titulo: `¿Pagar la nómina a ${pendientes.length} empleado${pendientes.length === 1 ? '' : 's'}?`,
      mensaje: 'Cada pago sale del medio elegido para ese empleado, con sus bonos y deducciones.',
      detalle: [
        ...pendientes.map(e => {
          const a = ajusteDe(e.id)
          const bonoT = a.bono + bonoVentasDe(e.id)
          const extra = [bonoT > 0 ? `+${pesos(bonoT)}` : '', a.deduccion > 0 ? `−${pesos(a.deduccion)}` : ''].filter(Boolean).join(' ')
          return { etiqueta: <span>{e.nombre_completo}<span className="block text-xs text-tenue">{nombreMetodo(e.id)}{extra ? ` · ${extra}` : ''}</span></span>, valor: pesos(totalDe(e)) }
        }),
        { etiqueta: 'Total', valor: pesos(totalPagarTodos), fuerte: true },
      ],
      textoConfirmar: `Pagar ${pesos(totalPagarTodos)}`,
    })
    if (!ok) return
    setPagandoTodos(true)
    const fallos: string[] = []
    for (const emp of pendientes) {
      try {
        await pagarEmpleado(emp, getMetodo(emp.id))
      } catch (err: any) {
        fallos.push(`${emp.nombre_completo}: ${err.message}`)
      }
    }
    setPagandoTodos(false)
    if (fallos.length === 0) {
      toast.success(`Nómina pagada a ${pendientes.length} empleado${pendientes.length === 1 ? '' : 's'}`, { description: `Total ${pesos(totalPagarTodos)}.` })
      setAjustes({})
    } else {
      toast.error(`No se pudo pagar a ${fallos.length} empleado${fallos.length === 1 ? '' : 's'}`, { description: fallos.join(' · ') })
    }
    router.refresh()
  }

  const empleadoAjustando = empleadosConCalculo.find(e => e.id === ajustando) ?? null

  const historialFiltrado = useMemo(() => {
    return historial.filter(n => {
      if (filtroFechaDesde && n.periodo_inicio < filtroFechaDesde) return false
      if (filtroFechaHasta && n.periodo_inicio > filtroFechaHasta) return false
      if (filtroEmpleado && !n.profiles?.nombre_completo.toLowerCase().includes(filtroEmpleado.toLowerCase())) return false
      return true
    })
  }, [historial, filtroFechaDesde, filtroFechaHasta, filtroEmpleado])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['hoy', 'historial'] as const).map(tab => (
          <button key={tab} onClick={() => setTabActiva(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tabActiva === tab ? 'bg-brand-yellow text-steel-900' : 'border border-linea bg-superficie-2 text-steel-300 hover:bg-velo/5 hover:text-tinta'
            }`}>
            {tab === 'hoy' ? 'Pago de hoy' : 'Historial'}
          </button>
        ))}
      </div>

      {tabActiva === 'hoy' && (
        <div className="space-y-3">
          {empleadosConCalculo.some(e => e.conPermiso && e.tieneHorario) && (
            <p className="rounded-2xl border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-xs text-tinta">
              Con permiso hoy (no asisten y no entran en el pago):{' '}
              <span className="font-semibold">{empleadosConCalculo.filter(e => e.conPermiso && e.tieneHorario).map(e => e.nombre_completo).join(', ')}</span>.
              Si alguno sí vino, quita el permiso en Horario o págale con «Registrar pago».
            </p>
          )}
          {empleadosEnTurno.length === 0 && (
            <div className="rounded-2xl bg-superficie p-6 text-center text-sm text-steel-500">
              No hay empleados con turno asignado para hoy ({fechaHoy})
            </div>
          )}

          {pendientes.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-tinta">
                  {pendientes.length} empleado{pendientes.length !== 1 ? 's' : ''} en turno pendiente{pendientes.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-suave">Total con ajustes: <span className="cifra font-bold text-tinta">{pesos(totalPagarTodos)}</span></p>
              </div>
              <Button className="h-12 w-full bg-brand-yellow px-5 font-bold text-steel-900 hover:brightness-105 sm:w-auto" onClick={handlePagarTodos} disabled={pagandoTodos}>
                {pagandoTodos ? 'Pagando…' : 'Pagar a todos'}
              </Button>
            </div>
          )}

          {empleadosEnTurno.length > 0 && (
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {empleadosEnTurno.map(e => {
                const a = ajusteDe(e.id)
                const pagado = e.nominaHoy
                return (
                  <li key={e.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/dashboard/empleados/${e.id}`} className="font-semibold text-tinta underline-offset-2 hover:text-enlace hover:underline">{e.nombre_completo}</Link>
                        <p className="text-sm text-suave">
                          {e.horasTurno != null ? `${e.horasTurno.toFixed(1)} h de ${horasEstandarHoy} h` : 'Sin turno'} · base {pesos(e.salario_base)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="cifra text-xl font-bold text-tinta">{pesos(pagado ? Number(pagado.total_pago) : totalDe(e))}</p>
                        {pagado
                          ? <span className="inline-flex items-center rounded-full bg-entra/15 px-2.5 py-0.5 text-xs font-semibold text-entra">Pagado</span>
                          : <span className="inline-flex items-center rounded-full bg-aviso/15 px-2.5 py-0.5 text-xs font-semibold text-aviso">Pendiente</span>}
                      </div>
                    </div>

                    {/* Bonos por ventas: se sugieren solos; el administrador los aprueba o los quita */}
                    {!pagado && sugeridosDe(e.id).length > 0 && (
                      <div className="space-y-1.5 rounded-xl border border-entra/30 bg-entra/8 p-3">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-entra"><Trophy className="size-4" aria-hidden />Bonos por ventas</p>
                        {sugeridosDe(e.id).map(b => {
                          const aprobado = !(quitados[e.id] ?? []).includes(b.clave)
                          return (
                            <label key={b.clave} className="flex items-center justify-between gap-3 text-sm">
                              <span className={aprobado ? 'text-tinta' : 'text-tenue line-through'}>{b.concepto}</span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className={`cifra font-bold ${aprobado ? 'text-entra' : 'text-tenue'}`}>+{pesos(b.monto)}</span>
                                <Switch checked={aprobado} onCheckedChange={() => alternarBono(e.id, b.clave)} aria-label={`Aprobar el bono: ${b.concepto}`} />
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* Ajustes del pago */}
                    {!pagado && (a.bono > 0 || a.deduccion > 0) && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {a.bono > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-entra/12 px-2.5 py-1 text-entra"><Plus className="size-3.5" aria-hidden />{pesos(a.bono)} · {a.conceptoBono}</span>}
                        {a.deduccion > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-sale/12 px-2.5 py-1 text-sale"><Minus className="size-3.5" aria-hidden />{pesos(a.deduccion)} · {a.conceptoDeduccion}</span>}
                      </div>
                    )}
                    {pagado && (Number(pagado.bonificaciones) > 0 || Number(pagado.deducciones) > 0) && (
                      <p className="text-sm text-suave">
                        {Number(pagado.bonificaciones) > 0 && <span className="text-entra">+{pesos(Number(pagado.bonificaciones))} bono </span>}
                        {Number(pagado.deducciones) > 0 && <span className="text-sale">−{pesos(Number(pagado.deducciones))} deducción</span>}
                      </p>
                    )}

                    {!pagado && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <Select
                          items={METODOS_NOMINA}
                          value={getMetodo(e.id)}
                          onValueChange={v => v && setMetodosPago(prev => ({ ...prev, [e.id]: v }))}>
                          <SelectTrigger className="col-span-2 h-11 w-full border-linea bg-superficie-2 text-sm text-tinta sm:col-span-1" aria-label={`Medio de pago de ${e.nombre_completo}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {METODOS_NOMINA.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" className="h-11 border-linea bg-superficie-2 px-4 text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => setAjustando(e.id)}>
                          <SlidersHorizontal className="size-4" aria-hidden />Bono o deducción
                        </Button>
                        <Button type="button" className="h-11 bg-brand-yellow px-5 font-bold text-steel-900 hover:brightness-105" onClick={() => handlePagarUno(e.id)} disabled={pagando === e.id || pagandoTodos}>
                          {pagando === e.id ? 'Pagando…' : 'Pagar'}
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {empleadoAjustando && (
        <AjusteDialogo
          key={empleadoAjustando.id}
          nombre={empleadoAjustando.nombre_completo}
          pagoDia={empleadoAjustando.pagoSugerido}
          inicial={ajusteDe(empleadoAjustando.id)}
          alCerrar={() => setAjustando(null)}
          alGuardar={a => {
            setAjustes(prev => ({ ...prev, [empleadoAjustando.id]: a }))
            setAjustando(null)
            toast.success(`Ajuste guardado para ${empleadoAjustando.nombre_completo}`, { description: `Total a pagar: ${pesos(empleadoAjustando.pagoSugerido + a.bono - a.deduccion)}. Se aplica al pagar.` })
          }}
        />
      )}

      {tabActiva === 'historial' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]">
            <div className="space-y-1">
              <label htmlFor="nomina-desde" className="text-sm font-semibold text-suave">Desde</label>
              <Input id="nomina-desde" type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} className="h-11 w-full border-linea bg-superficie-2 text-tinta" />
            </div>
            <div className="space-y-1">
              <label htmlFor="nomina-hasta" className="text-sm font-semibold text-suave">Hasta</label>
              <Input id="nomina-hasta" type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} className="h-11 w-full border-linea bg-superficie-2 text-tinta" />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <label htmlFor="nomina-empleado" className="text-sm font-semibold text-suave">Empleado</label>
              <Input id="nomina-empleado" placeholder="Buscar…" value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)} className="h-11 w-full border-linea bg-superficie-2 text-tinta placeholder:text-tenue" />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-superficie">
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Salario base</TableHead>
                    <TableHead className="text-right">Bonif.</TableHead>
                    <TableHead className="text-right">Deduc.</TableHead>
                    <TableHead className="text-right">Total pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialFiltrado.map(n => (
                    <TableRow key={n.id} className="border-linea hover:bg-velo/5">
                      <TableCell className="text-sm font-medium text-tinta">{n.empleado_id ? <Link href={`/dashboard/empleados/${n.empleado_id}`} className="underline-offset-2 hover:text-enlace hover:underline">{n.profiles?.nombre_completo ?? 'Empleado'}</Link> : (n.profiles?.nombre_completo ?? '—')}</TableCell>
                      <TableCell className="text-xs text-steel-300">{n.periodo_inicio}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">{n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-tinta">${Number(n.salario_base).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-400">{Number(n.bonificaciones) > 0 ? <>+${Number(n.bonificaciones).toLocaleString('es-CO')}{n.concepto_bonificacion && <span className="block text-tenue">{n.concepto_bonificacion}</span>}</> : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-sale">{Number(n.deducciones) > 0 ? <>−${Number(n.deducciones).toLocaleString('es-CO')}{n.concepto_deduccion && <span className="block text-tenue">{n.concepto_deduccion}</span>}</> : '—'}</TableCell>
                      <TableCell className="text-right font-display font-bold text-tinta">${Number(n.total_pago).toLocaleString('es-CO')}</TableCell>
                    </TableRow>
                  ))}
                  {historialFiltrado.length === 0 && (
                    <TableRow className="border-linea"><TableCell colSpan={7} className="py-8 text-center text-steel-500">Sin registros</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
/** Ventana para poner bono y deducción al pago de hoy de un empleado */
function AjusteDialogo({ nombre, pagoDia, inicial, alCerrar, alGuardar }: {
  nombre: string
  pagoDia: number
  inicial: Ajuste
  alCerrar: () => void
  alGuardar: (a: Ajuste) => void
}) {
  const [a, setA] = useState<Ajuste>(inicial)
  const total = pagoDia + a.bono - a.deduccion
  const errores = [
    a.bono < 0 || a.deduccion < 0 ? 'Los montos no pueden ser negativos.' : '',
    a.bono > 0 && !a.conceptoBono.trim() ? 'Escribe el motivo del bono.' : '',
    a.deduccion > 0 && !a.conceptoDeduccion.trim() ? 'Escribe el motivo de la deducción.' : '',
    total < 0 ? 'La deducción no puede ser mayor que el pago del día más el bono.' : '',
  ].filter(Boolean)
  const num = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^0-9]/g, '')) || 0))
  const campo = 'h-11 border-linea bg-superficie-2 text-tinta placeholder:text-tenue'

  return (
    <Dialogo abierto alCambiar={ab => { if (!ab) alCerrar() }} titulo={`Bono o deducción de ${nombre}`} descripcion="Se suma o se resta al pago de hoy. El motivo queda en el historial de nómina.">
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-entra">Bono</legend>
          <div className="grid grid-cols-[8.5rem_1fr] gap-2">
            <div>
              <Label htmlFor="ajuste-bono" className="sr-only">Monto del bono</Label>
              <Input id="ajuste-bono" inputMode="numeric" placeholder="$0" value={a.bono ? a.bono.toLocaleString('es-CO') : ''} onChange={ev => setA({ ...a, bono: num(ev.target.value) })} className={`${campo} cifra text-right`} />
            </div>
            <div>
              <Label htmlFor="ajuste-concepto-bono" className="sr-only">Motivo del bono</Label>
              <Input id="ajuste-concepto-bono" placeholder="Motivo (ej.: horas extra)" value={a.conceptoBono} onChange={ev => setA({ ...a, conceptoBono: ev.target.value })} className={campo} />
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-sale">Deducción</legend>
          <div className="grid grid-cols-[8.5rem_1fr] gap-2">
            <div>
              <Label htmlFor="ajuste-deduccion" className="sr-only">Monto de la deducción</Label>
              <Input id="ajuste-deduccion" inputMode="numeric" placeholder="$0" value={a.deduccion ? a.deduccion.toLocaleString('es-CO') : ''} onChange={ev => setA({ ...a, deduccion: num(ev.target.value) })} className={`${campo} cifra text-right`} />
            </div>
            <div>
              <Label htmlFor="ajuste-concepto-deduccion" className="sr-only">Motivo de la deducción</Label>
              <Input id="ajuste-concepto-deduccion" placeholder="Motivo (ej.: adelanto)" value={a.conceptoDeduccion} onChange={ev => setA({ ...a, conceptoDeduccion: ev.target.value })} className={campo} />
            </div>
          </div>
        </fieldset>
        <DetalleDialogo filas={[
          { etiqueta: 'Pago del día', valor: pesos(pagoDia) },
          { etiqueta: 'Bono', valor: <span className="text-entra">+{pesos(a.bono)}</span> },
          { etiqueta: 'Deducción', valor: <span className="text-sale">−{pesos(a.deduccion)}</span> },
          { etiqueta: 'Total a pagar', valor: pesos(total), fuerte: true },
        ]} />
        {errores.length > 0 && <p role="alert" className="rounded-xl bg-sale/10 px-3.5 py-2.5 text-sm text-sale">{errores[0]}</p>}
      </div>
      <PieDialogo>
        <Button type="button" variant="outline" className="border-linea bg-superficie-2 text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => setA(SIN_AJUSTE)}>Quitar ajustes</Button>
        <Button type="button" className="bg-accion font-bold text-sobre-accion hover:brightness-105" disabled={errores.length > 0} onClick={() => alGuardar({ ...a, conceptoBono: a.conceptoBono.trim(), conceptoDeduccion: a.conceptoDeduccion.trim() })}>Guardar</Button>
      </PieDialogo>
    </Dialogo>
  )
}
