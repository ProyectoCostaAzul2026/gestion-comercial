'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, PartyPopper, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { JORNADA_FESTIVO, JORNADA_NORMAL, nombreFestivo, turnoEnFecha } from '@/lib/festivos-colombia'
import { fechaLarga, sumarDias } from '@/lib/permisos'
import type { PermisoVista } from './permisos-empleados'

// La semana va de lunes a domingo
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
}
/** Cuántas semanas hacia adelante se pueden consultar */
const SEMANAS_ADELANTE = 12

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
  /** Permisos desde el lunes de esta semana: se marcan en el día que no asiste el empleado */
  permisos?: PermisoVista[]
}

/** Horas pagadas de un turno: se descuenta 1 hora de almuerzo */
function calcularHoras(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return Math.max(0, ((hf * 60 + mf) - (hi * 60 + mi) - 60) / 60)
}

/** Lunes de la semana de una fecha AAAA-MM-DD (sin depender de la zona horaria del navegador) */
function lunesDe(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay() // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7))
}

export function HorarioSemanal({ turnos, empleados, esAdmin, fechaHoy, permisos = [] }: HorarioSemanalProps) {
  const supabase = createClient()
  const router = useRouter()
  const [vistaActiva, setVistaActiva] = useState<'semanal' | 'empleado'>('semanal')
  const [semana, setSemana] = useState(0)
  const [diaActivo, setDiaActivo] = useState<string | null>(null)
  const [nuevoTurno, setNuevoTurno] = useState<{ empleado_id: string; hora_inicio: string; hora_fin: string }>({
    empleado_id: '',
    hora_inicio: JORNADA_NORMAL.inicio,
    hora_fin: JORNADA_NORMAL.fin,
  })
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  // Los turnos son una plantilla que se repite cada semana; aquí se aplican a las fechas de la semana elegida
  const lunes = sumarDias(lunesDe(fechaHoy), semana * 7)
  const dias = DIAS.map((dia, i) => {
    const fecha = sumarDias(lunes, i)
    return { dia, fecha, numero: Number(fecha.slice(8)), festivo: nombreFestivo(fecha), esHoy: fecha === fechaHoy }
  })

  const turnosPorDia = (dia: string) => turnos
    .filter(t => t.dia_semana === dia)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const permisosDelDia = (fecha: string) => permisos.filter(p => p.fecha === fecha)
  const tienePermiso = (fecha: string, empleadoId: string) => permisos.some(p => p.fecha === fecha && p.empleado_id === empleadoId)

  /** Horas de la semana que se ve: con la jornada de festivo aplicada y sin los días con permiso */
  const horasPorEmpleado = (empleadoId: string) => dias.reduce((suma, { dia, fecha }) => {
    if (tienePermiso(fecha, empleadoId)) return suma
    return suma + turnos.filter(t => t.empleado_id === empleadoId && t.dia_semana === dia).reduce((s, t) => {
      const real = turnoEnFecha(fecha, t.hora_inicio, t.hora_fin)
      return s + calcularHoras(real.inicio, real.fin)
    }, 0)
  }, 0)

  const handleClickDia = (dia: string) => {
    if (!esAdmin) return
    if (diaActivo === dia) { setDiaActivo(null); return }
    setDiaActivo(dia)
    // El turno se guarda para ese día de TODAS las semanas: solo el domingo arranca con la jornada reducida
    const jornada = dia === 'domingo' ? JORNADA_FESTIVO : JORNADA_NORMAL
    setNuevoTurno(prev => ({ ...prev, hora_inicio: jornada.inicio, hora_fin: jornada.fin }))
  }

  const handleGuardarTurno = async () => {
    if (!diaActivo || !nuevoTurno.empleado_id) { toast.error('Selecciona un empleado'); return }
    if (nuevoTurno.hora_inicio >= nuevoTurno.hora_fin) { toast.error('La hora de inicio debe ser antes del fin'); return }
    if (turnos.some(t => t.dia_semana === diaActivo && t.empleado_id === nuevoTurno.empleado_id
      && t.hora_inicio.slice(0, 5) < nuevoTurno.hora_fin && nuevoTurno.hora_inicio < t.hora_fin.slice(0, 5))) {
      toast.error('Ese empleado ya tiene un turno a esa hora ese día')
      return
    }
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
    } catch (err) {
      toast.error('Error: ' + (err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarTurno = async (t: Turno) => {
    const nombre = t.profiles?.nombre_completo ?? 'este empleado'
    if (!window.confirm(`¿Quitar el turno de ${nombre} de todos los ${DIAS_LABEL[t.dia_semana]}?`)) return
    setEliminando(t.id)
    try {
      const { error } = await supabase.from('horario_laboral').update({ activo: false }).eq('id', t.id)
      if (error) throw error
      toast.success('Turno eliminado')
      router.refresh()
    } catch (err) {
      toast.error('Error: ' + (err as Error).message)
    } finally {
      setEliminando(null)
    }
  }

  const festivosSemana = dias.filter(d => d.festivo && d.dia !== 'domingo')
  const CAMPO_HORA = 'h-10 w-full rounded-lg border border-white/10 bg-[#111820] px-2 text-sm text-white'

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['semanal', 'empleado'] as const).map(v => (
          <button key={v} onClick={() => setVistaActiva(v)}
            className={`h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${
              vistaActiva === v ? 'bg-brand-yellow text-steel-900' : 'border border-white/10 bg-[#1a2430] text-steel-300 hover:bg-white/5 hover:text-white'
            }`}>
            {v === 'semanal' ? 'Vista semanal' : 'Por empleado'}
          </button>
        ))}
      </div>

      {/* Semana que se está viendo */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111820] p-2">
        <button type="button" onClick={() => setSemana(s => s - 1)} disabled={semana <= 0} aria-label="Semana anterior"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white hover:bg-white/5 disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold text-white">
            {semana === 0 ? 'Esta semana' : semana === 1 ? 'Próxima semana' : `En ${semana} semanas`}
          </p>
          <p className="truncate text-xs text-steel-300">{fechaLarga(lunes)} al {fechaLarga(sumarDias(lunes, 6))}</p>
        </div>
        {semana > 0 && (
          <button type="button" onClick={() => setSemana(0)} className="h-10 shrink-0 rounded-xl border border-white/10 px-3 text-xs font-bold text-brand-yellow hover:bg-white/5">
            Hoy
          </button>
        )}
        <button type="button" onClick={() => setSemana(s => s + 1)} disabled={semana >= SEMANAS_ADELANTE} aria-label="Semana siguiente"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white hover:bg-white/5 disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {festivosSemana.length > 0 && (
        <p className="flex gap-2 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-2 text-xs text-white">
          <PartyPopper className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" aria-hidden />
          <span>
            {festivosSemana.map(d => `${fechaLarga(d.fecha)} es festivo (${d.festivo})`).join('; ')}.
            Ese día los turnos pasan a la jornada de festivo, de {JORNADA_FESTIVO.inicio} a {JORNADA_FESTIVO.fin} ({JORNADA_FESTIVO.horas} horas pagadas).
          </span>
        </p>
      )}

      {vistaActiva === 'semanal' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {dias.map(({ dia, fecha, numero, festivo, esHoy }) => {
            const reducido = dia === 'domingo' || !!festivo
            const delDia = turnosPorDia(dia)
            return (
              <div key={dia} className={`rounded-2xl border bg-[#111820] ${esHoy ? 'border-brand-yellow/60' : 'border-white/10'}`}>
                <button type="button" disabled={!esAdmin} onClick={() => handleClickDia(dia)}
                  aria-expanded={esAdmin ? diaActivo === dia : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-t-2xl px-3 py-2 text-left text-sm font-semibold transition-colors md:flex-col md:justify-center md:gap-0 md:text-center ${
                    diaActivo === dia
                      ? 'bg-brand-yellow text-steel-900'
                      : reducido
                        ? 'bg-brand-yellow/10 text-brand-yellow enabled:hover:bg-brand-yellow/20'
                        : 'bg-steel-700 text-steel-300 enabled:hover:bg-white/5'
                  }`}>
                  <span>
                    {DIAS_LABEL[dia]} {numero}
                    {esHoy && <span className="ml-1.5 rounded-full bg-brand-yellow px-1.5 py-0.5 text-[10px] font-bold text-steel-900">Hoy</span>}
                  </span>
                  <span className="flex items-center gap-2 text-xs font-normal">
                    {festivo && <span className="md:block">Festivo</span>}
                    {esAdmin && diaActivo !== dia && <Plus className="h-4 w-4 md:hidden" aria-hidden />}
                  </span>
                </button>
                {festivo && <p className="truncate px-3 pt-1.5 text-[11px] text-brand-yellow" title={festivo}>{festivo}</p>}
                <div className="min-h-14 space-y-1 p-2">
                  {permisosDelDia(fecha).map(p => (
                    <div key={p.id} className="rounded-xl border border-brand-red/30 bg-brand-red/10 px-2 py-1 text-xs text-brand-red">
                      <p className="font-medium leading-tight">{p.nombre.split(' ')[0]}</p>
                      <p>Permiso: no asiste</p>
                    </div>
                  ))}
                  {delDia.map(t => {
                    const real = turnoEnFecha(fecha, t.hora_inicio, t.hora_fin)
                    return (
                      <div key={t.id} className={`rounded-xl border border-white/10 bg-[#1a2430] px-2 py-1 text-xs ${tienePermiso(fecha, t.empleado_id) ? 'opacity-40 line-through' : ''}`}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="truncate font-medium leading-tight text-white">
                              {t.profiles?.nombre_completo?.split(' ')[0] ?? '?'}
                            </p>
                            <p className={real.ajustado ? 'font-semibold text-brand-yellow' : 'text-steel-300'}>{real.inicio} – {real.fin}</p>
                            {real.ajustado && (
                              <p className="text-[10px] text-steel-500">Habitual {t.hora_inicio.slice(0, 5)} – {t.hora_fin.slice(0, 5)}</p>
                            )}
                          </div>
                          {esAdmin && (
                            <button type="button" onClick={() => handleEliminarTurno(t)}
                              disabled={eliminando === t.id} aria-label="Quitar turno"
                              className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-300 hover:bg-white/5 hover:text-brand-red">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {delDia.length === 0 && permisosDelDia(fecha).length === 0 && (
                    <p className="pt-2 text-center text-xs text-steel-500">Sin turnos</p>
                  )}
                </div>

                {esAdmin && diaActivo === dia && (
                  <div className="space-y-2 rounded-b-2xl border-t border-white/10 bg-[#1a2430] p-2">
                    <p className="text-xs font-medium text-steel-300">
                      Agregar turno para todos los {DIAS_LABEL[dia]}
                    </p>
                    <Select items={empleados.map(e => ({ value: e.id, label: e.nombre_completo }))}
                      onValueChange={v => v && setNuevoTurno(p => ({ ...p, empleado_id: v }))}
                      value={nuevoTurno.empleado_id}>
                      <SelectTrigger className="h-10 w-full border-white/10 bg-[#111820] text-sm text-white"><SelectValue placeholder="Empleado" /></SelectTrigger>
                      <SelectContent>
                        {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                      <div>
                        <label htmlFor={`inicio-${dia}`} className="text-xs text-steel-300">Inicio</label>
                        <input id={`inicio-${dia}`} type="time" value={nuevoTurno.hora_inicio}
                          onChange={e => setNuevoTurno(p => ({ ...p, hora_inicio: e.target.value }))}
                          className={CAMPO_HORA} />
                      </div>
                      <div>
                        <label htmlFor={`fin-${dia}`} className="text-xs text-steel-300">Fin</label>
                        <input id={`fin-${dia}`} type="time" value={nuevoTurno.hora_fin}
                          onChange={e => setNuevoTurno(p => ({ ...p, hora_fin: e.target.value }))}
                          className={CAMPO_HORA} />
                      </div>
                    </div>
                    {festivo && (
                      <p className="text-[11px] text-steel-500">
                        Escribe el horario habitual: en los festivos la app ya lo recorta a {JORNADA_FESTIVO.inicio} – {JORNADA_FESTIVO.fin}.
                      </p>
                    )}
                    <Button type="button" className="h-10 w-full bg-brand-yellow text-sm font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105"
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate font-medium text-white">{emp.nombre_completo}</h3>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">{horasSemanales.toFixed(1)}h esta semana</span>
                </div>
                {turnosEmp.length === 0 ? (
                  <p className="text-sm text-steel-500">Sin turnos asignados</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dias.filter(d => turnosEmp.some(t => t.dia_semana === d.dia)).map(({ dia, fecha, numero }) =>
                      turnosEmp.filter(t => t.dia_semana === dia).map(t => {
                        const real = turnoEnFecha(fecha, t.hora_inicio, t.hora_fin)
                        const conPermiso = tienePermiso(fecha, emp.id)
                        return (
                          <div key={t.id} className={`rounded-xl border px-3 py-1.5 text-xs ${conPermiso ? 'border-brand-red/30 bg-brand-red/10' : 'border-white/10 bg-[#1a2430]'}`}>
                            <span className="font-medium text-white">{DIAS_LABEL[dia]} {numero}</span>
                            {conPermiso
                              ? <span className="ml-2 text-brand-red">Permiso</span>
                              : (
                                <>
                                  <span className={`ml-2 ${real.ajustado ? 'text-brand-yellow' : 'text-steel-300'}`}>{real.inicio} – {real.fin}</span>
                                  <span className="ml-2 text-steel-500">({calcularHoras(real.inicio, real.fin).toFixed(1)}h{real.ajustado ? ', festivo' : ''})</span>
                                </>
                              )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-steel-500">
        Los turnos se repiten cada semana. Los festivos de Colombia se reconocen solos y ese día el turno se muestra con la jornada de festivo.
      </p>
    </div>
  )
}
