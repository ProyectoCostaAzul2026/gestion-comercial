'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calcularPagoDia, horasPagarPorFecha, esDomingoOFestivo } from '@/lib/festivos-colombia'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Empleado {
  id: string
  nombre_completo: string
  salario_base: number | null
}

interface NominaNuevaFormProps {
  empleados: Empleado[]
  inicial: {
    empleado_id: string
    fecha: string
    horas_trabajadas: number | null
    salario_base: number | null
  }
}

export function NominaNuevaForm({ empleados, inicial }: NominaNuevaFormProps) {
  const supabase = createClient()
  const router = useRouter()

  const [empleadoId, setEmpleadoId] = useState(inicial.empleado_id)
  const [fecha, setFecha] = useState(inicial.fecha)
  const [horasTrabajadas, setHorasTrabajadas] = useState<number>(
    inicial.horas_trabajadas ?? horasPagarPorFecha(inicial.fecha)
  )
  const [salarioBase, setSalarioBase] = useState<number>(inicial.salario_base ?? 0)
  const [bonificaciones, setBonificaciones] = useState(0)
  const [conceptoBonificacion, setConceptoBonificacion] = useState('')
  const [deducciones, setDeducciones] = useState(0)
  const [conceptoDeduccion, setConceptoDeduccion] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  // Cuando cambia el empleado, cargar su salario base
  useEffect(() => {
    const emp = empleados.find(e => e.id === empleadoId)
    if (emp?.salario_base) setSalarioBase(Number(emp.salario_base))
  }, [empleadoId, empleados])

  // Cuando cambia la fecha, actualizar horas estándar
  useEffect(() => {
    if (!inicial.horas_trabajadas) {
      setHorasTrabajadas(horasPagarPorFecha(fecha))
    }
  }, [fecha])

  const horasEstandar = horasPagarPorFecha(fecha)
  const esFestivo = esDomingoOFestivo(fecha)
  const pagoDia = calcularPagoDia(salarioBase, fecha, horasTrabajadas)
  const totalPago = pagoDia + bonificaciones - deducciones

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empleadoId) { toast.error('Selecciona un empleado'); return }
    if (!fecha) { toast.error('La fecha es obligatoria'); return }
    if (salarioBase <= 0) { toast.error('El salario base debe ser mayor a 0'); return }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('registrar_nomina', {
        p_empleado_id: empleadoId,
        p_fecha: fecha,
        p_horas_trabajadas: horasTrabajadas,
        p_salario_base: pagoDia,
        p_bonificaciones: bonificaciones,
        p_concepto_bonificacion: conceptoBonificacion || null,
        p_deducciones: deducciones,
        p_concepto_deduccion: conceptoDeduccion || null,
        p_metodo_pago: metodoPago,
        p_notas: notas || null,
      })
      if (error) throw error
      toast.success('Nómina registrada')
      router.push('/dashboard/nomina')
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Empleado *</Label>
        <Select
          items={empleados.map(e => ({ value: e.id, label: e.nombre_completo }))}
          onValueChange={v => v && setEmpleadoId(v)}
          value={empleadoId}
        >
          <SelectTrigger><SelectValue placeholder="Selecciona empleado" /></SelectTrigger>
          <SelectContent>
            {empleados.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha *</Label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />
          {esFestivo && (
            <p className="text-xs text-amber-600">
              ☀️ Domingo o festivo — jornada {horasEstandar}h pagadas
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="horas">Horas trabajadas</Label>
          <Input
            id="horas"
            type="number"
            step="0.5"
            min="0"
            max={horasEstandar}
            value={horasTrabajadas}
            onChange={e => setHorasTrabajadas(parseFloat(e.target.value) || 0)}
          />
          <p className="text-xs text-slate-400">Máx: {horasEstandar}h este día</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salario_base">Salario base diario</Label>
        <Input
          id="salario_base"
          type="number"
          value={salarioBase || ''}
          onChange={e => setSalarioBase(parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Resumen de pago */}
      <div className="rounded-md bg-slate-50 border p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">
            Pago por {horasTrabajadas}h
            {horasTrabajadas < horasEstandar ? ` (${horasTrabajadas}/${horasEstandar}h)` : ' (completo)'}
          </span>
          <span>${pagoDia.toLocaleString('es-CO')}</span>
        </div>
        {bonificaciones > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Bonificación</span>
            <span>+${bonificaciones.toLocaleString('es-CO')}</span>
          </div>
        )}
        {deducciones > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Deducciones</span>
            <span>-${deducciones.toLocaleString('es-CO')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t pt-1 mt-1">
          <span>Total a pagar</span>
          <span>${totalPago.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bonif">Bonificación</Label>
          <Input
            id="bonif"
            type="number"
            value={bonificaciones || ''}
            onChange={e => setBonificaciones(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deduc">Deducción</Label>
          <Input
            id="deduc"
            type="number"
            value={deducciones || ''}
            onChange={e => setDeducciones(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {bonificaciones > 0 && (
        <div className="space-y-2">
          <Label htmlFor="concepto_bonif">Concepto de bonificación</Label>
          <Input
            id="concepto_bonif"
            value={conceptoBonificacion}
            onChange={e => setConceptoBonificacion(e.target.value)}
            placeholder="Ej: Horas extras, comisión…"
          />
        </div>
      )}

      {deducciones > 0 && (
        <div className="space-y-2">
          <Label htmlFor="concepto_deduc">Concepto de deducción</Label>
          <Input
            id="concepto_deduc"
            value={conceptoDeduccion}
            onChange={e => setConceptoDeduccion(e.target.value)}
            placeholder="Ej: Préstamo, adelanto…"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Método de pago</Label>
        <Select
          items={[
            { value: 'efectivo', label: 'Efectivo (caja menor)' },
            { value: 'nequi', label: 'Nequi' },
            { value: 'daviplata', label: 'Daviplata' },
          ]}
          onValueChange={v => v && setMetodoPago(v)}
          value={metodoPago}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo (caja menor)</SelectItem>
            <SelectItem value="nequi">Nequi</SelectItem>
            <SelectItem value="daviplata">Daviplata</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          placeholder="Observaciones opcionales"
        />
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Registrando…' : `Pagar $${totalPago.toLocaleString('es-CO')}`}
      </Button>
    </form>
  )
}