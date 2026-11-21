'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus } from 'lucide-react'
import { toast } from '@/lib/avisos'
import { useRouter } from 'next/navigation'
import { hoyBogota } from '@/lib/fechas'

interface PagoProgramado {
  key: string
  monto: number
  fecha_programada: string
  nota: string
}

interface FacturaProveedorFormProps {
  proveedorId: string
  facturaId?: string
  inicial?: {
    numero_factura: string
    fecha_emision: string
    fecha_vencimiento: string
    monto_total: number
    notas: string
    pagos_programados: { id: string; monto: number; fecha_programada: string; nota: string | null }[]
  }
  onSuccess?: () => void
}

export function FacturaProveedorForm({ proveedorId, facturaId, inicial, onSuccess }: FacturaProveedorFormProps) {
  const esEdicion = !!facturaId
  const supabase = createClient()
  const router = useRouter()
  const hoy = hoyBogota()

  const [form, setForm] = useState({
    numero_factura: inicial?.numero_factura ?? '',
    fecha_emision: inicial?.fecha_emision ?? hoy,
    fecha_vencimiento: inicial?.fecha_vencimiento ?? '',
    monto_total: inicial?.monto_total ?? 0,
    notas: inicial?.notas ?? '',
  })

  const [pagosProgramados, setPagosProgramados] = useState<PagoProgramado[]>(
    inicial?.pagos_programados.map(p => ({
      key: p.id,
      monto: p.monto,
      fecha_programada: p.fecha_programada,
      nota: p.nota ?? '',
    })) ?? []
  )
  const [pagosEliminados, setPagosEliminados] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const agregarPago = () => {
    setPagosProgramados(prev => [...prev, {
      key: `nuevo-${Date.now()}`,
      monto: 0,
      fecha_programada: hoy,
      nota: '',
    }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.monto_total <= 0) { toast.error('El monto total debe ser mayor a 0'); return }
    setSaving(true)
    try {
      let fId = facturaId
      if (esEdicion) {
        // La base recalcula el saldo y el estado con lo ya pagado (antes el saldo quedaba igual al total)
        const { error } = await supabase.rpc('editar_factura_proveedor', {
          p_factura_id: facturaId!,
          p_numero_factura: form.numero_factura,
          p_fecha_emision: form.fecha_emision,
          // Sin fecha se manda null para quitarla (los tipos generados no marcan los parámetros que aceptan null)
          p_fecha_vencimiento: (form.fecha_vencimiento || null) as string,
          p_monto_total: form.monto_total,
          p_notas: form.notas,
        })
        if (error) {
          throw new Error(error.code === 'PGRST202'
            ? 'falta activar la edición de facturas en la base de datos (migración iva_fraccion_y_editar_factura)'
            : error.message)
        }
      } else {
        const { data, error } = await supabase.from('facturas_proveedor').insert({
          proveedor_id: proveedorId,
          numero_factura: form.numero_factura || null,
          fecha_emision: form.fecha_emision,
          fecha_vencimiento: form.fecha_vencimiento || null,
          monto_total: form.monto_total,
          monto_pagado: 0,
          saldo_pendiente: form.monto_total,
          estado: 'pendiente',
          notas: form.notas || null,
        }).select('id').single()
        if (error) throw error
        fId = data.id
      }

      // Borrar pagos programados eliminados
      if (pagosEliminados.length > 0) {
        await supabase.from('pagos_programados_proveedor').delete().in('id', pagosEliminados)
      }

      // Guardar pagos programados
      for (const p of pagosProgramados) {
        if (p.monto <= 0 || !p.fecha_programada) continue
        if (p.key.startsWith('nuevo-')) {
          await supabase.from('pagos_programados_proveedor').insert({
            factura_id: fId!,
            monto: p.monto,
            fecha_programada: p.fecha_programada,
            nota: p.nota || null,
            pagado: false,
          })
        } else {
          await supabase.from('pagos_programados_proveedor').update({
            monto: p.monto,
            fecha_programada: p.fecha_programada,
            nota: p.nota || null,
          }).eq('id', p.key)
        }
      }

      toast.success(esEdicion ? 'Factura actualizada' : 'Factura registrada')
      router.refresh()
      onSuccess?.()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'h-12 border-linea-fuerte bg-superficie text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25'
  const labelCls = 'text-sm font-semibold text-suave'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numero_factura" className={labelCls}>N° Factura</Label>
          <Input id="numero_factura" className={inputCls} value={form.numero_factura}
            onChange={e => setForm(p => ({ ...p, numero_factura: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monto_total" className={labelCls}>Monto total *</Label>
          <Input id="monto_total" type="number" className={inputCls} value={form.monto_total || ''}
            onChange={e => setForm(p => ({ ...p, monto_total: parseFloat(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha_emision" className={labelCls}>Fecha emisión</Label>
          <Input id="fecha_emision" type="date" className={inputCls} value={form.fecha_emision}
            onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_vencimiento" className={labelCls}>Fecha vencimiento</Label>
          <Input id="fecha_vencimiento" type="date" className={inputCls} value={form.fecha_vencimiento}
            onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas" className={labelCls}>Notas</Label>
        <Textarea id="notas" className="border-linea-fuerte bg-superficie text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25" value={form.notas} rows={2}
          onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
      </div>

      {/* Pagos programados */}
      <div className="space-y-3 rounded-2xl bg-superficie p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-tinta">Pagos programados</h3>
          <Button type="button" variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={agregarPago}>
            <Plus className="mr-1 h-4 w-4" />Agregar cuota
          </Button>
        </div>
        {pagosProgramados.length === 0 && (
          <p className="text-xs text-steel-500">Sin pagos programados. Agrega cuotas como recordatorio.</p>
        )}
        {pagosProgramados.map((p, idx) => (
          <div key={p.key} className="grid grid-cols-12 items-end gap-2 border-b border-linea pb-3 last:border-0">
            <div className="col-span-4 space-y-1">
              <label className="text-sm font-semibold text-suave">Fecha</label>
              <Input type="date" className="border-linea bg-superficie-2 text-tinta" value={p.fecha_programada}
                onChange={e => setPagosProgramados(prev => prev.map((it, i) =>
                  i === idx ? { ...it, fecha_programada: e.target.value } : it))} />
            </div>
            <div className="col-span-3 space-y-1">
              <label className="text-sm font-semibold text-suave">Monto</label>
              <Input type="number" className="border-linea bg-superficie-2 text-tinta" value={p.monto || ''}
                onChange={e => setPagosProgramados(prev => prev.map((it, i) =>
                  i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it))} />
            </div>
            <div className="col-span-4 space-y-1">
              <label className="text-sm font-semibold text-suave">Nota</label>
              <Input value={p.nota} placeholder="Opcional" className="border-linea bg-superficie-2 text-tinta placeholder:text-tenue"
                onChange={e => setPagosProgramados(prev => prev.map((it, i) =>
                  i === idx ? { ...it, nota: e.target.value } : it))} />
            </div>
            <div className="col-span-1 flex justify-end">
              <button type="button" onClick={() => {
                if (!p.key.startsWith('nuevo-')) setPagosEliminados(prev => [...prev, p.key])
                setPagosProgramados(prev => prev.filter((_, i) => i !== idx))
              }} className="text-steel-300 hover:text-sale">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {pagosProgramados.length > 0 && (
          <p className="text-xs text-steel-300">
            Total programado: ${pagosProgramados.reduce((s, p) => s + p.monto, 0).toLocaleString('es-CO')}
            {' '}/ ${form.monto_total.toLocaleString('es-CO')} total factura
          </p>
        )}
      </div>

      <div className="sticky bottom-[var(--abajo-nav,0px)] z-10 -mx-4 bg-gradient-to-t from-fondo via-fondo/95 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-none lg:p-0">
<Button type="submit" disabled={saving} className="h-14 w-full rounded-xl bg-accion text-lg font-bold text-sobre-accion hover:bg-accion hover:brightness-105">
        {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar factura'}
      </Button>
</div>
    </form>
  )
}