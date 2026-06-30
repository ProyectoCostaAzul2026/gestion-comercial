'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ConfigNegocio {
  id: string
  margen_default: number | null
  nombre: string
  nit: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  ciudad: string | null
  regimen: string | null
  mensaje_pie: string | null
  logo_url: string | null
  monto_base_caja_menor: number | null
  monto_inicial_monedas: number | null
  monto_inicial_sencillo: number | null
  max_descuento_porcentaje: number | null
  whatsapp_negocio: string | null
}

export function ConfiguracionForm({ config }: { config: ConfigNegocio | null }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    nombre: config?.nombre ?? '',
    nit: config?.nit ?? '',
    margen_default: config?.margen_default != null ? config.margen_default * 100 : 40,
    direccion: config?.direccion ?? '',
    telefono: config?.telefono ?? '',
    email: config?.email ?? '',
    ciudad: config?.ciudad ?? '',
    regimen: config?.regimen ?? 'Régimen Simplificado',
    mensaje_pie: config?.mensaje_pie ?? 'Gracias por su compra',
    logo_url: config?.logo_url ?? '',
    monto_base_caja_menor: config?.monto_base_caja_menor ?? 300000,
    monto_inicial_monedas: config?.monto_inicial_monedas ?? 400000,
    monto_inicial_sencillo: config?.monto_inicial_sencillo ?? 800000,
    max_descuento_porcentaje: config?.max_descuento_porcentaje != null
      ? config.max_descuento_porcentaje * 100
      : 10,
    whatsapp_negocio: config?.whatsapp_negocio ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre del negocio es obligatorio'); return }
    setSaving(true)
    try {
      const datos = {
        nombre: form.nombre,
        margen_default: (Number(form.margen_default) || 40) / 100,
        nit: form.nit || null,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        email: form.email || null,
        ciudad: form.ciudad || null,
        regimen: form.regimen || null,
        mensaje_pie: form.mensaje_pie || null,
        logo_url: form.logo_url || null,
        monto_base_caja_menor: Number(form.monto_base_caja_menor) || 0,
        monto_inicial_monedas: Number(form.monto_inicial_monedas) || 0,
        monto_inicial_sencillo: Number(form.monto_inicial_sencillo) || 0,
        max_descuento_porcentaje: (Number(form.max_descuento_porcentaje) || 10) / 100,
        whatsapp_negocio: form.whatsapp_negocio || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = config?.id
        ? await supabase.from('configuracion_negocio').update(datos as any).eq('id', config.id)
        : await supabase.from('configuracion_negocio').insert(datos as any)
      if (error) throw error
      toast.success('Configuración guardada')
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'h-12 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500 focus:border-brand-yellow/60'
  const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-steel-300'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-6">
      <div className="space-y-2">
        <Label htmlFor="nombre" className={labelCls}>Nombre del negocio *</Label>
        <Input id="nombre" className={inputCls} value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nit" className={labelCls}>NIT</Label>
          <Input id="nit" className={inputCls} value={form.nit} onChange={e => handleChange('nit', e.target.value)} placeholder="123456789-0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="regimen" className={labelCls}>Régimen</Label>
          <Input id="regimen" className={inputCls} value={form.regimen} onChange={e => handleChange('regimen', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion" className={labelCls}>Dirección</Label>
        <Input id="direccion" className={inputCls} value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ciudad" className={labelCls}>Ciudad</Label>
          <Input id="ciudad" className={inputCls} value={form.ciudad} onChange={e => handleChange('ciudad', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono" className={labelCls}>Teléfono</Label>
          <Input id="telefono" className={inputCls} value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className={labelCls}>Email</Label>
        <Input id="email" type="email" className={inputCls} value={form.email} onChange={e => handleChange('email', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_negocio" className={labelCls}>WhatsApp del negocio</Label>
        <Input
          id="whatsapp_negocio"
          className={inputCls}
          value={form.whatsapp_negocio}
          onChange={e => handleChange('whatsapp_negocio', e.target.value)}
          placeholder="573101234567 (con código de país, sin +)"
        />
        <p className="text-xs text-steel-500">Se usa para enviar recibos de factura electrónica</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mensaje_pie" className={labelCls}>Mensaje al pie del recibo</Label>
        <Textarea id="mensaje_pie" className="border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500 focus:border-brand-yellow/60" value={form.mensaje_pie}
          onChange={e => handleChange('mensaje_pie', e.target.value)} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo_url" className={labelCls}>Logo del negocio (URL)</Label>
        <Input id="logo_url" className={inputCls} value={form.logo_url ?? ''}
          onChange={e => handleChange('logo_url', e.target.value)}
          placeholder="https://ejemplo.com/logo.png" />
        {form.logo_url && (
          <img src={form.logo_url} alt="Logo" className="h-16 w-auto rounded-xl border border-white/10 object-contain p-1" />
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#1a2430] p-4">
        <p className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
          Configuración de caja y descuentos
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="monto_base_caja_menor" className={labelCls}>Base caja menor</Label>
            <Input id="monto_base_caja_menor" type="number" className="h-12 border-white/10 bg-[#111820] text-[16px] text-white"
              value={form.monto_base_caja_menor ?? 300000}
              onChange={e => handleChange('monto_base_caja_menor', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monto_inicial_monedas" className={labelCls}>Monto monedas</Label>
            <Input id="monto_inicial_monedas" type="number" className="h-12 border-white/10 bg-[#111820] text-[16px] text-white"
              value={form.monto_inicial_monedas ?? 400000}
              onChange={e => handleChange('monto_inicial_monedas', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monto_inicial_sencillo" className={labelCls}>Monto sencillo</Label>
            <Input id="monto_inicial_sencillo" type="number" className="h-12 border-white/10 bg-[#111820] text-[16px] text-white"
              value={form.monto_inicial_sencillo ?? 800000}
              onChange={e => handleChange('monto_inicial_sencillo', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="margen_default" className={labelCls}>Margen por defecto %</Label>
            <Input id="margen_default" type="number" min={0} max={100} step={0.1} className="h-12 border-white/10 bg-[#111820] text-[16px] text-white"
              value={(form as any).margen_default ?? 40}
              onChange={e => handleChange('margen_default' as any, e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_descuento_porcentaje" className={labelCls}>Descuento máximo %</Label>
            <Input id="max_descuento_porcentaje" type="number" min={0} max={100} step={0.1} className="h-12 border-white/10 bg-[#111820] text-[16px] text-white"
              value={form.max_descuento_porcentaje}
              onChange={e => handleChange('max_descuento_porcentaje', e.target.value)} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </Button>
    </form>
  )
}