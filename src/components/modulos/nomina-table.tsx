'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { calcularPagoDia, horasPagarPorFecha } from '@/lib/festivos-colombia'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
}

interface EmpleadoNomina {
  id: string
  nombre_completo: string
  salario_base: number
  nominaHoy: NominaHoy | null
  turnosSemana: TurnoSemana[]
}

interface HistorialNomina {
  id: string
  periodo_inicio: string
  periodo_fin: string
  total_pago: number
  estado: string
  salario_base: number
  horas_trabajadas: number | null
  bonificaciones: number
  deducciones: number
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
  empleados, historial, fechaHoy,
}: {
  empleados: EmpleadoNomina[]
  historial: HistorialNomina[]
  fechaHoy: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [tabActiva, setTabActiva] = useState<'hoy' | 'historial'>('hoy')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [pagandoTodos, setPagandoTodos] = useState(false)
  const [confirmandoTodos, setConfirmandoTodos] = useState(false)
  const [confirmandoEmpleado, setConfirmandoEmpleado] = useState<string | null>(null)
  const [metodosPago, setMetodosPago] = useState<Record<string, string>>({})

  const diaHoy = new Date(fechaHoy + 'T12:00:00').getDay()
  const horasEstandarHoy = horasPagarPorFecha(fechaHoy)

  const empleadosConCalculo = useMemo(() => {
    return empleados.map(e => {
      const turnoHoy = e.turnosSemana.find(t => DIAS_A_NUM[t.dia_semana] === diaHoy)
      const horasTurno = turnoHoy ? calcularHorasTurno(turnoHoy.hora_inicio, turnoHoy.hora_fin) : null
      const pagoSugerido = turnoHoy
        ? calcularPagoDia(e.salario_base, fechaHoy, horasTurno ?? undefined)
        : 0
      return { ...e, horasTurno, pagoSugerido, tieneHorario: !!turnoHoy }
    })
  }, [empleados, fechaHoy, diaHoy])

  // ✅ Solo empleados con turno hoy
  const empleadosEnTurno = useMemo(() =>
    empleadosConCalculo.filter(e => e.tieneHorario),
    [empleadosConCalculo])

  const pendientes = empleadosEnTurno.filter(e => !e.nominaHoy)
  const totalPagarTodos = pendientes.reduce((s, e) => s + e.pagoSugerido, 0)

  const getMetodo = (id: string) => metodosPago[id] ?? 'efectivo'

  const pagarEmpleado = async (e: typeof empleadosConCalculo[0], metodo: string) => {
    const { error } = await supabase.rpc('registrar_nomina', {
      p_empleado_id: e.id,
      p_fecha: fechaHoy,
      p_horas_trabajadas: e.horasTurno ?? horasEstandarHoy,
      p_salario_base: e.pagoSugerido,
      p_metodo_pago: metodo,
    })
    if (error) throw new Error(error.message)
  }

  const handlePagarUno = async (empleadoId: string) => {
    const emp = empleadosConCalculo.find(e => e.id === empleadoId)
    if (!emp) return
    try {
      await pagarEmpleado(emp, getMetodo(empleadoId))
      toast.success(`Nómina de ${emp.nombre_completo} registrada`)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setConfirmandoEmpleado(null)
    }
  }

  const handlePagarTodos = async () => {
    if (pendientes.length === 0) {
      toast.info('Todos los empleados en turno ya tienen nómina registrada hoy')
      setConfirmandoTodos(false)
      return
    }
    setPagandoTodos(true)
    let errores = 0
    for (const emp of pendientes) {
      try {
        await pagarEmpleado(emp, getMetodo(emp.id))
      } catch {
        errores++
        toast.error(`Error al pagar a ${emp.nombre_completo}`)
      }
    }
    setPagandoTodos(false)
    setConfirmandoTodos(false)
    if (errores === 0) toast.success(`Nómina registrada para ${pendientes.length} empleados`)
    router.refresh()
  }

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
              tabActiva === tab ? 'bg-brand-yellow text-steel-900' : 'border border-white/10 bg-[#1a2430] text-steel-300 hover:bg-white/5 hover:text-white'
            }`}>
            {tab === 'hoy' ? 'Pago de hoy' : 'Historial'}
          </button>
        ))}
      </div>

      {tabActiva === 'hoy' && (
        <div className="space-y-3">
          {empleadosEnTurno.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#111820] p-6 text-center text-sm text-steel-500">
              No hay empleados con turno asignado para hoy ({fechaHoy})
            </div>
          )}

          {pendientes.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
              {!confirmandoTodos ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {pendientes.length} empleado{pendientes.length !== 1 ? 's' : ''} en turno pendiente{pendientes.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-steel-300">Total: ${totalPagarTodos.toLocaleString('es-CO')}</p>
                  </div>
                  <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => setConfirmandoTodos(true)} disabled={pagandoTodos}>
                    Pagar a todos
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white">¿Confirmas el pago para {pendientes.length} empleados en turno?</p>
                  <ul className="space-y-0.5 text-xs text-steel-300">
                    {pendientes.map(e => (
                      <li key={e.id} className="flex justify-between">
                        <span>{e.nombre_completo} · {getMetodo(e.id)}</span>
                        <span>${e.pagoSugerido.toLocaleString('es-CO')}</span>
                      </li>
                    ))}
                    <li className="mt-1 flex justify-between border-t border-white/8 pt-1 font-bold text-white">
                      <span>Total</span><span>${totalPagarTodos.toLocaleString('es-CO')}</span>
                    </li>
                  </ul>
                  <div className="flex gap-2">
                    <Button className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handlePagarTodos} disabled={pagandoTodos}>
                      {pagandoTodos ? 'Pagando…' : 'Sí, pagar a todos'}
                    </Button>
                    <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmandoTodos(false)} disabled={pagandoTodos}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Salario base</TableHead>
                    <TableHead className="text-right">Horas hoy</TableHead>
                    <TableHead className="text-right">Pago sugerido</TableHead>
                    <TableHead>Método pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleadosEnTurno.map(e => (
                    <TableRow key={e.id} className="border-white/8 hover:bg-white/5">
                      <TableCell className="text-xs font-medium text-white">{e.nombre_completo}</TableCell>
                      <TableCell className="text-right text-xs text-white">${e.salario_base.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">
                        {e.horasTurno != null ? `${e.horasTurno.toFixed(1)}h / ${horasEstandarHoy}h` : 'Sin turno'}
                      </TableCell>
                      <TableCell className="text-right font-display text-sm font-bold text-white">${e.pagoSugerido.toLocaleString('es-CO')}</TableCell>
                      <TableCell>
                        {!e.nominaHoy && (
                          <Select
                            items={METODOS_NOMINA}
                            value={getMetodo(e.id)}
                            onValueChange={v => v && setMetodosPago(prev => ({ ...prev, [e.id]: v }))}>
                            <SelectTrigger className="h-8 w-40 border-white/10 bg-[#1a2430] text-xs text-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {METODOS_NOMINA.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.nominaHoy
                          ? <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Pagado</span>
                          : <span className="inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">Pendiente</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.nominaHoy ? (
                          <span className="text-xs text-steel-500">${Number(e.nominaHoy.total_pago).toLocaleString('es-CO')}</span>
                        ) : confirmandoEmpleado === e.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-steel-300">¿Confirmar ${e.pagoSugerido.toLocaleString('es-CO')}?</span>
                            <button onClick={() => handlePagarUno(e.id)} className="text-xs font-medium text-emerald-400 hover:underline">Sí</button>
                            <button onClick={() => setConfirmandoEmpleado(null)} className="text-xs text-steel-300 hover:underline">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmandoEmpleado(e.id)}
                            className="text-sm text-brand-blue hover:underline">
                            Pagar
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {empleadosEnTurno.length === 0 && (
                    <TableRow className="border-white/8">
                      <TableCell colSpan={7} className="py-8 text-center text-steel-500">Sin empleados en turno hoy</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {tabActiva === 'historial' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Desde</label>
              <Input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} className="w-36 border-white/10 bg-[#1a2430] text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Hasta</label>
              <Input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} className="w-36 border-white/10 bg-[#1a2430] text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Empleado</label>
              <Input placeholder="Buscar…" value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)} className="w-48 border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500" />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-steel-700 hover:bg-steel-700 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-brand-yellow">
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
                    <TableRow key={n.id} className="border-white/8 hover:bg-white/5">
                      <TableCell className="text-xs font-medium text-white">{n.profiles?.nombre_completo ?? '—'}</TableCell>
                      <TableCell className="text-xs text-steel-300">{n.periodo_inicio}</TableCell>
                      <TableCell className="text-right text-xs text-steel-300">{n.horas_trabajadas != null ? `${n.horas_trabajadas}h` : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-white">${Number(n.salario_base).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-400">{Number(n.bonificaciones) > 0 ? `+$${Number(n.bonificaciones).toLocaleString('es-CO')}` : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-brand-red">{Number(n.deducciones) > 0 ? `-$${Number(n.deducciones).toLocaleString('es-CO')}` : '—'}</TableCell>
                      <TableCell className="text-right font-display font-bold text-white">${Number(n.total_pago).toLocaleString('es-CO')}</TableCell>
                    </TableRow>
                  ))}
                  {historialFiltrado.length === 0 && (
                    <TableRow className="border-white/8"><TableCell colSpan={7} className="py-8 text-center text-steel-500">Sin registros</TableCell></TableRow>
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