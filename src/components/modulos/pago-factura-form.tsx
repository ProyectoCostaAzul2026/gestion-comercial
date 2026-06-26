'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PagoFacturaFormProps {
  facturaId: string
  saldoPendiente: number
  proveedorId?: string
}

export function PagoFacturaForm({ facturaId, saldoPendiente, proveedorId }: PagoFacturaFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const hoy = new Date().toISOString().slice(0, 10)
  const [monto, setMonto] = useState(saldoPendiente)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [origenCaja, setOrigenCaja] = useState('caja_menor')
  const [fechaPago, setFechaPago] = useState(hoy)
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (monto > saldoPendiente) {
      toast.error(`El monto supera el saldo pendiente ($${saldoPendiente.toLocaleString('es-CO')})`)
      return
    }
    setSaving(true)
    try {
      const fuentes = metodoPago === 'efectivo'
        ? [{ fuente: origenCaja, monto }]
        : [{ fuente: metodoPago, monto }]

      const { error } = await supabase.rpc('registrar_pago_factura', {
        p_factura_id: facturaId,
        p_monto: monto,
        p_fuentes: fuentes as any,
        p_fecha_pago: fechaPago,
        p_observaciones: observaciones || null,
      })
      if (error) throw error
      toast.success('Pago registrado')
      if (proveedorId) router.push(`/dashboard/proveedores/${proveedorId}`)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
      setConfirmar(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-slate-50 border p-3 text-sm">
        <span className="text-slate-500">Saldo pendiente: </span>
        <span className="font-bold text-slate-900">${saldoPendiente.toLocaleString('es-CO')}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monto">Monto a pagar *</Label>
          <Input
            id="monto"
            type="number"
            value={monto || ''}
            onChange={e => setMonto(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_pago">Fecha de pago</Label>
          <Input
            id="fecha_pago"
            type="date"
            value={fechaPago}
            onChange={e => setFechaPago(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Método de pago</Label>
        <Select
          items={[
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'nequi', label: 'Nequi' },
            { value: 'daviplata', label: 'Daviplata' },
            { value: 'tarjeta', label: 'Tarjeta' },
          ]}
          onValueChange={v => v && setMetodoPago(v)}
          value={metodoPago}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="nequi">Nequi</SelectItem>
            <SelectItem value="daviplata">Daviplata</SelectItem>
            <SelectItem value="tarjeta">Tarjeta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {metodoPago === 'efectivo' && (
        <div className="space-y-2">
          <Label>Origen del efectivo</Label>
          <Select
            items={[
              { value: 'caja_menor', label: 'Caja menor' },
              { value: 'caja_mayor', label: 'Caja mayor' },
            ]}
            onValueChange={v => v && setOrigenCaja(v)}
            value={origenCaja}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="caja_menor">Caja menor</SelectItem>
              <SelectItem value="caja_mayor">Caja mayor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={observaciones}
          rows={2}
          onChange={e => setObservaciones(e.target.value)}
        />
      </div>

      {!confirmar ? (
        <Button type="button" onClick={() => setConfirmar(true)} className="w-full">
          Registrar pago
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">
            ¿Confirmas el pago de ${monto.toLocaleString('es-CO')}?
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Registrando…' : 'Sí, registrar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmar(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}