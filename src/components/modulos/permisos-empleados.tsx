'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarOff, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fechaLarga } from '@/lib/permisos'

/** Un permiso: el empleado no asiste ese día */
export interface PermisoVista {
  id: string
  empleado_id: string
  fecha: string
  motivo: string | null
  nombre: string
}

/**
 * Permisos de los empleados: cada uno saca el suyo para un día (desde hoy) y el administrador puede registrarlo para
 * cualquiera. Los administradores ven la alerta en el Inicio y en la vista semanal de Horario.
 */
export function PermisosEmpleados({ permisos, empleados, esAdmin, usuarioId, fechaHoy }: {
  permisos: PermisoVista[]
  empleados: { id: string; nombre_completo: string }[]
  esAdmin: boolean
  usuarioId: string
  fechaHoy: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [empleadoId, setEmpleadoId] = useState(usuarioId)
  const [fecha, setFecha] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState<string | null>(null)

  const proximos = permisos.filter(p => p.fecha >= fechaHoy)

  const guardar = async () => {
    if (!fecha) { toast.error('Elige el día del permiso'); return }
    if (!esAdmin && fecha < fechaHoy) { toast.error('El permiso debe ser desde hoy en adelante'); return }
    const quien = esAdmin ? empleadoId : usuarioId
    if (!quien) { toast.error('Elige el empleado'); return }
    setGuardando(true)
    const { error } = await supabase.from('permisos_empleado').insert({
      empleado_id: quien,
      fecha,
      motivo: motivo.trim() || null,
      creado_por: usuarioId,
    })
    setGuardando(false)
    if (error) {
      toast.error(error.code === '23505' ? 'Ya hay un permiso para ese empleado en ese día' : 'No se pudo guardar: ' + error.message)
      return
    }
    toast.success('Permiso registrado: los administradores verán la alerta')
    setFecha('')
    setMotivo('')
    router.refresh()
  }

  const borrar = async (p: PermisoVista) => {
    if (!window.confirm(`¿Quitar el permiso de ${p.nombre} del ${fechaLarga(p.fecha)}?`)) return
    setBorrando(p.id)
    const { error } = await supabase.from('permisos_empleado').delete().eq('id', p.id)
    setBorrando(null)
    if (error) { toast.error('No se pudo quitar: ' + error.message); return }
    toast.success('Permiso quitado')
    router.refresh()
  }

  const CAMPO = 'h-11 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500'

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <CalendarOff className="h-5 w-5 text-brand-red" />Permisos
        </h2>
        <p className="text-xs text-steel-300">
          {esAdmin ? 'Registra el día que un empleado no asiste.' : 'Saca un permiso para el día que no vas a asistir.'} Los administradores reciben la alerta.
        </p>
      </div>

      <form className="grid grid-cols-1 gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); guardar() }}>
        {esAdmin && (
          <div className="space-y-1">
            <Label className="text-xs text-steel-300">Empleado</Label>
            <Select items={empleados.map(e => ({ value: e.id, label: e.nombre_completo }))} value={empleadoId}
              onValueChange={v => v && setEmpleadoId(v)}>
              <SelectTrigger className="h-11 w-full border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Empleado" /></SelectTrigger>
              <SelectContent>{empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="permiso-fecha" className="text-xs text-steel-300">Día</Label>
          <Input id="permiso-fecha" type="date" min={esAdmin ? undefined : fechaHoy} value={fecha} onChange={e => setFecha(e.target.value)} className={CAMPO} />
        </div>
        <div className={`space-y-1 ${esAdmin ? '' : 'sm:col-span-2'}`}>
          <Label htmlFor="permiso-motivo" className="text-xs text-steel-300">Motivo (opcional)</Label>
          <Input id="permiso-motivo" value={motivo} maxLength={300} onChange={e => setMotivo(e.target.value)} placeholder="Ej: cita médica" className={CAMPO} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={guardando} className="h-11 w-full bg-brand-yellow font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
            {guardando ? 'Guardando…' : 'Sacar permiso'}
          </Button>
        </div>
      </form>

      {proximos.length === 0 ? (
        <p className="text-sm text-steel-500">No hay permisos próximos.</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {proximos.map(p => {
            const puedeQuitar = esAdmin || p.empleado_id === usuarioId
            return (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{p.nombre} <span className="font-normal text-brand-red">no asiste</span></p>
                  <p className="text-xs text-steel-300">{fechaLarga(p.fecha)}{p.fecha === fechaHoy ? ' (hoy)' : ''}{p.motivo ? ` · ${p.motivo}` : ''}</p>
                </div>
                {puedeQuitar && (
                  <button type="button" onClick={() => borrar(p)} disabled={borrando === p.id} aria-label="Quitar permiso"
                    className="shrink-0 rounded-lg p-2 text-steel-300 hover:bg-white/5 hover:text-brand-red">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
