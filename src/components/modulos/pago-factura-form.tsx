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
import { hoyBogota } from '@/lib/fechas'
import { useNavegacion } from '@/lib/navegacion'

interface PagoFacturaFormProps {
  facturaId: string
  saldoPendiente: number
  proveedorId?: string
  /** Saldo de cada medio: si viene, no deja pagar más de lo que hay */
  saldos?: Record<string, number>
}

const NOMBRE_MEDIO: Record<string, string> = { efectivo: 'caja menor', caja_mayor: 'caja mayor', nequi: 'Nequi', daviplata: 'Daviplata', tarjeta: 'tarjeta' }

export function PagoFacturaForm({ facturaId, saldoPendiente, proveedorId, saldos }: PagoFacturaFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const { volver } = useNavegacion()
  const hoy = hoyBogota()
  const [monto, setMonto] = useState(saldoPendiente)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [origenCaja, setOrigenCaja] = useState('caja_menor')
  const [fechaPago, setFechaPago] = useState(hoy)
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  // Medio del que sale el dinero (caja menor es el saldo "efectivo")
  const medio = metodoPago === 'efectivo' ? (origenCaja === 'caja_menor' ? 'efectivo' : origenCaja) : metodoPago
  const disponible = saldos ? Math.round(saldos[medio] ?? 0) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (monto > saldoPendiente) {
      toast.error(`El monto supera el saldo pendiente ($${saldoPendiente.toLocaleString('es-CO')})`)
      return
    }
    if (disponible !== null && monto > disponible) {
      toast.error(`No alcanza: en ${NOMBRE_MEDIO[medio] ?? medio} hay $${disponible.toLocaleString('es-CO')}`)
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
        p_observaciones: observaciones || undefined,
      })
      if (error) throw error
      toast.success('Pago registrado')
      if (proveedorId) volver(`/dashboard/proveedores/${proveedorId}`, { refrescar: true })
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
      setConfirmar(false)
    }
  }

  const inputCls = 'h-12 border-linea bg-superficie-2 text-[16px] text-tinta placeholder:text-steel-500 focus:border-brand-yellow/60'
  const labelCls = 'text-xs font-bold text-steel-300'
  const triggerCls = 'border-linea bg-superficie-2 text-tinta'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-linea bg-superficie-2 p-3 text-sm">
        <span className="text-steel-300">Saldo pendiente: </span>
        <span className="font-display font-bold text-tinta">${saldoPendiente.toLocaleString('es-CO')}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monto" className={labelCls}>Monto a pagar *</Label>
          <Input
            id="monto"
            type="number"
            className={inputCls}
            value={monto || ''}
            onChange={e => setMonto(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_pago" className={labelCls}>Fecha de pago</Label>
          <Input
            id="fecha_pago"
            type="date"
            className={inputCls}
            value={fechaPago}
            onChange={e => setFechaPago(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={labelCls}>Método de pago</Label>
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
          <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="nequi">Nequi</SelectItem>
            <SelectItem value="daviplata">Daviplata</SelectItem>
            <SelectItem value="tarjeta">Tarjeta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {disponible !== null && (
        <p className="-mt-2 text-xs text-steel-500">Hay ${disponible.toLocaleString('es-CO')} en {NOMBRE_MEDIO[medio] ?? medio}</p>
      )}

      {metodoPago === 'efectivo' && (
        <div className="space-y-2">
          <Label className={labelCls}>Origen del efectivo</Label>
          <Select
            items={[
              { value: 'caja_menor', label: 'Caja menor' },
              { value: 'caja_mayor', label: 'Caja mayor' },
            ]}
            onValueChange={v => v && setOrigenCaja(v)}
            value={origenCaja}
          >
            <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="caja_menor">Caja menor</SelectItem>
              <SelectItem value="caja_mayor">Caja mayor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="observaciones" className={labelCls}>Observaciones</Label>
        <Textarea
          id="observaciones"
          className="border-linea bg-superficie-2 text-tinta placeholder:text-steel-500 focus:border-brand-yellow/60"
          value={observaciones}
          rows={2}
          onChange={e => setObservaciones(e.target.value)}
        />
      </div>

      {!confirmar ? (
        <Button type="button" onClick={() => setConfirmar(true)} className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
          Registrar pago
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-tinta">
            ¿Confirmas el pago de ${monto.toLocaleString('es-CO')}?
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="h-12 flex-1 bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
              {saving ? 'Registrando…' : 'Sí, registrar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmar(false)} className="h-12 flex-1 border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}