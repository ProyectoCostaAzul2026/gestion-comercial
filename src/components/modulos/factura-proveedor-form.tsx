'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
  const hoy = new Date().toISOString().slice(0, 10)

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
        const { error } = await supabase.from('facturas_proveedor').update({
          numero_factura: form.numero_factura || null,
          fecha_emision: form.fecha_emision,
          fecha_vencimiento: form.fecha_vencimiento || null,
          monto_total: form.monto_total,
          saldo_pendiente: form.monto_total,
          notas: form.notas || null,
        }).eq('id', facturaId!)
        if (error) throw error
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numero_factura">N° Factura</Label>
          <Input id="numero_factura" value={form.numero_factura}
            onChange={e => setForm(p => ({ ...p, numero_factura: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monto_total">Monto total *</Label>
          <Input id="monto_total" type="number" value={form.monto_total || ''}
            onChange={e => setForm(p => ({ ...p, monto_total: parseFloat(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha_emision">Fecha emisión</Label>
          <Input id="fecha_emision" type="date" value={form.fecha_emision}
            onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_vencimiento">Fecha vencimiento</Label>
          <Input id="fecha_vencimiento" type="date" value={form.fecha_vencimiento}
            onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" value={form.notas} rows={2}
          onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
      </div>

      {/* Pagos programados */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-steel-900">Pagos programados</h3>
          <Button type="button" variant="outline" size="sm" onClick={agregarPago}>
            <Plus className="mr-1 h-4 w-4" />Agregar cuota
          </Button>
        </div>
        {pagosProgramados.length === 0 && (
          <p className="text-xs text-steel-300">Sin pagos programados. Agrega cuotas como recordatorio.</p>
        )}
        {pagosProgramados.map((p, idx) => (
          <div key={p.key} className="grid grid-cols-12 items-end gap-2 border-b border-slate-100 pb-3 last:border-0">
            <div className="col-span-4 space-y-1">
              <label className="text-xs text-steel-500">Fecha</label>
              <Input type="date" value={p.fecha_programada}
                onChange={e => setPagosProgramados(prev => prev.map((it, i) =>
                  i === idx ? { ...it, fecha_programada: e.target.value } : it))} />
            </div>
            <div className="col-span-3 space-y-1">
              <label className="text-xs text-steel-500">Monto</label>
              <Input type="number" value={p.monto || ''}
                onChange={e => setPagosProgramados(prev => prev.map((it, i) =>
                  i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it))} />
            </div>
            <div className="col-span-4 space-y-1">
              <label className="text-xs text-steel-500">Nota</label>
              <Input value={p.nota} placeholder="Opcional"
                onChange={e => setPagosProgramados(prev => prev.map((it, i) =>
                  i === idx ? { ...it, nota: e.target.value } : it))} />
            </div>
            <div className="col-span-1 flex justify-end">
              <button type="button" onClick={() => {
                if (!p.key.startsWith('nuevo-')) setPagosEliminados(prev => [...prev, p.key])
                setPagosProgramados(prev => prev.filter((_, i) => i !== idx))
              }} className="text-steel-300 hover:text-brand-red">
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

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar factura'}
      </Button>
    </form>
  )
}