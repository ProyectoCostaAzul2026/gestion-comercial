'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { esDomingoOFestivo } from '@/lib/festivos-colombia'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
}
const DIA_NUM: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
}

interface Turno {
  id: string
  empleado_id: string
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  profiles: { nombre_completo: string } | null
}

interface Empleado {
  id: string
  nombre_completo: string
}

interface HorarioSemanalProps {
  turnos: Turno[]
  empleados: Empleado[]
  esAdmin: boolean
  fechaHoy: string
}

function calcularHoras(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return Math.max(0, ((hf * 60 + mf) - (hi * 60 + mi) - 60) / 60)
}

// Dado fechaHoy (YYYY-MM-DD) y un nombre de día, devuelve la fecha de ese día en la semana actual
function fechaDelDia(fechaHoy: string, diaNombre: string): string {
  const hoy = new Date(fechaHoy + 'T12:00:00')
  const diaHoy = hoy.getDay() // 0=dom, 1=lun...
  const diaObj = DIA_NUM[diaNombre]
  const diff = diaObj - diaHoy
  const fecha = new Date(hoy)
  fecha.setDate(hoy.getDate() + diff)
  return fecha.toISOString().slice(0, 10)
}

function esDomingoOFestivoNombre(diaNombre: string, fechaHoy: string): boolean {
  if (diaNombre === 'domingo') return true
  const fecha = fechaDelDia(fechaHoy, diaNombre)
  return esDomingoOFestivo(fecha)
}

export function HorarioSemanal({ turnos, empleados, esAdmin, fechaHoy }: HorarioSemanalProps) {
  const supabase = createClient()
  const router = useRouter()
  const [vistaActiva, setVistaActiva] = useState<'semanal' | 'empleado'>('semanal')
  const [diaActivo, setDiaActivo] = useState<string | null>(null)
  const [nuevoTurno, setNuevoTurno] = useState({
    empleado_id: '',
    hora_inicio: '08:00',
    hora_fin: '19:00',
  })
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const turnosPorDia = (dia: string) => turnos.filter(t => t.dia_semana === dia)

  const horasPorEmpleado = (empleadoId: string) => {
    return turnos.filter(t => t.empleado_id === empleadoId)
      .reduce((sum, t) => sum + calcularHoras(t.hora_inicio, t.hora_fin), 0)
  }

  const handleClickDia = (dia: string) => {
    if (!esAdmin) return
    if (diaActivo === dia) { setDiaActivo(null); return }
    setDiaActivo(dia)
    const esFestOrDom = esDomingoOFestivoNombre(dia, fechaHoy)
    setNuevoTurno(prev => ({
      ...prev,
      hora_inicio: esFestOrDom ? '09:00' : '08:00',
      hora_fin: esFestOrDom ? '17:00' : '19:00',
    }))
  }

  const handleGuardarTurno = async () => {
    if (!diaActivo || !nuevoTurno.empleado_id) { toast.error('Selecciona un empleado'); return }
    if (nuevoTurno.hora_inicio >= nuevoTurno.hora_fin) { toast.error('La hora de inicio debe ser antes del fin'); return }
    setGuardando(true)
    try {
      const { error } = await supabase.from('horario_laboral').insert({
        empleado_id: nuevoTurno.empleado_id,
        dia_semana: diaActivo,
        hora_inicio: nuevoTurno.hora_inicio,
        hora_fin: nuevoTurno.hora_fin,
        activo: true,
      })
      if (error) throw error
      toast.success('Turno asignado')
      setNuevoTurno(prev => ({ ...prev, empleado_id: '' }))
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarTurno = async (id: string) => {
    setEliminando(id)
    try {
      const { error } = await supabase.from('horario_laboral').update({ activo: false }).eq('id', id)
      if (error) throw error
      toast.success('Turno eliminado')
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['semanal', 'empleado'] as const).map(v => (
          <button key={v} onClick={() => setVistaActiva(v)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              vistaActiva === v ? 'bg-brand-yellow text-steel-900' : 'border border-white/10 bg-[#1a2430] text-steel-300 hover:bg-white/5 hover:text-white'
            }`}>
            {v === 'semanal' ? 'Vista semanal' : 'Por empleado'}
          </button>
        ))}
      </div>

      {vistaActiva === 'semanal' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {DIAS.map(dia => {
            const esFestivo = esDomingoOFestivoNombre(dia, fechaHoy)
            return (
              <div key={dia} className="rounded-2xl border border-white/10 bg-[#111820]">
                <div
                  className={`cursor-pointer rounded-t-2xl px-3 py-2 text-center text-sm font-semibold transition-colors ${
                    diaActivo === dia
                      ? 'bg-brand-yellow text-steel-900'
                      : esFestivo
                      ? 'bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow/20'
                      : 'bg-steel-700 text-steel-300 hover:bg-white/5'
                  }`}
                  onClick={() => handleClickDia(dia)}
                >
                  {DIAS_LABEL[dia]}
                  {esFestivo && dia !== 'domingo' && (
                    <span className="block text-xs font-normal">Festivo</span>
                  )}
                </div>
                <div className="min-h-16 space-y-1 p-2">
                  {turnosPorDia(dia).map(t => (
                    <div key={t.id} className="rounded-xl border border-white/10 bg-[#1a2430] px-2 py-1 text-xs">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="font-medium leading-tight text-white">
                            {t.profiles?.nombre_completo?.split(' ')[0] ?? '?'}
                          </p>
                          <p className="text-steel-300">{t.hora_inicio.slice(0, 5)} – {t.hora_fin.slice(0, 5)}</p>
                        </div>
                        {esAdmin && (
                          <button type="button" onClick={() => handleEliminarTurno(t.id)}
                            disabled={eliminando === t.id}
                            className="mt-0.5 shrink-0 text-steel-300 hover:text-brand-red">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {turnosPorDia(dia).length === 0 && (
                    <p className="pt-2 text-center text-xs text-steel-500">Libre</p>
                  )}
                </div>

                {esAdmin && diaActivo === dia && (
                  <div className="space-y-2 rounded-b-2xl border-t border-white/10 bg-[#1a2430] p-2">
                    <p className="text-xs font-medium text-steel-300">
                      Agregar turno
                      {esFestivo && <span className="ml-1 text-brand-yellow">(Domingo/Festivo)</span>}
                    </p>
                    <Select items={empleados.map(e => ({ value: e.id, label: e.nombre_completo }))}
                      onValueChange={v => v && setNuevoTurno(p => ({ ...p, empleado_id: v }))}
                      value={nuevoTurno.empleado_id}>
                      <SelectTrigger className="h-7 border-white/10 bg-[#111820] text-xs text-white"><SelectValue placeholder="Empleado" /></SelectTrigger>
                      <SelectContent>
                        {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs text-steel-300">Inicio</label>
                        <input type="time" value={nuevoTurno.hora_inicio}
                          onChange={e => setNuevoTurno(p => ({ ...p, hora_inicio: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#111820] px-1 py-0.5 text-xs text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-steel-300">Fin</label>
                        <input type="time" value={nuevoTurno.hora_fin}
                          onChange={e => setNuevoTurno(p => ({ ...p, hora_fin: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#111820] px-1 py-0.5 text-xs text-white" />
                      </div>
                    </div>
                    <Button type="button" size="sm" className="h-7 w-full bg-brand-yellow text-xs font-bold text-steel-900 hover:brightness-105"
                      onClick={handleGuardarTurno} disabled={guardando}>
                      {guardando ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {vistaActiva === 'empleado' && (
        <div className="space-y-3">
          {empleados.map(emp => {
            const turnosEmp = turnos.filter(t => t.empleado_id === emp.id)
            const horasSemanales = horasPorEmpleado(emp.id)
            return (
              <div key={emp.id} className="rounded-2xl border border-white/10 bg-[#111820] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-white">{emp.nombre_completo}</h3>
                  <span className="inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">{horasSemanales.toFixed(1)}h / semana</span>
                </div>
                {turnosEmp.length === 0 ? (
                  <p className="text-sm text-steel-500">Sin turnos asignados</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {DIAS.filter(d => turnosEmp.some(t => t.dia_semana === d)).map(dia =>
                      turnosEmp.filter(t => t.dia_semana === dia).map(t => (
                        <div key={t.id} className="rounded-xl border border-white/10 bg-[#1a2430] px-3 py-1.5 text-xs">
                          <span className="font-medium text-white">{DIAS_LABEL[dia]}</span>
                          <span className="ml-2 text-steel-300">{t.hora_inicio.slice(0, 5)} – {t.hora_fin.slice(0, 5)}</span>
                          <span className="ml-2 text-steel-500">({calcularHoras(t.hora_inicio, t.hora_fin).toFixed(1)}h)</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}