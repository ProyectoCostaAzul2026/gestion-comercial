'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProveedorFormState {
  nombre: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  nit_ruc: string
  notas: string
}

export interface ProveedorExistente {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  nit_ruc: string | null
  notas: string | null
}

interface ProveedorFormProps {
  proveedor?: ProveedorExistente
}

function estadoInicial(proveedor?: ProveedorExistente): ProveedorFormState {
  if (!proveedor) return { nombre: '', contacto: '', telefono: '', email: '', direccion: '', nit_ruc: '', notas: '' }
  return {
    nombre: proveedor.nombre,
    contacto: proveedor.contacto ?? '',
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
    direccion: proveedor.direccion ?? '',
    nit_ruc: proveedor.nit_ruc ?? '',
    notas: proveedor.notas ?? '',
  }
}

export function ProveedorForm({ proveedor }: ProveedorFormProps) {
  const esEdicion = !!proveedor
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState<ProveedorFormState>(estadoInicial(proveedor))
  const [saving, setSaving] = useState(false)
  const [desactivando, setDesactivando] = useState(false)

  const handleChange = (field: keyof ProveedorFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const datos = {
        nombre: form.nombre,
        contacto: form.contacto || null,
        telefono: form.telefono || null,
        email: form.email || null,
        direccion: form.direccion || null,
        nit_ruc: form.nit_ruc || null,
        notas: form.notas || null,
      }
      if (esEdicion) {
        const { error } = await supabase.from('proveedores').update(datos).eq('id', proveedor.id)
        if (error) throw error
        toast.success('Proveedor actualizado')
      } else {
        const { error } = await supabase.from('proveedores').insert({ ...datos, activo: true })
        if (error) throw error
        toast.success('Proveedor creado')
      }
      router.refresh()
      router.push('/dashboard/proveedores')
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDesactivar = async () => {
    if (!proveedor) return
    const confirmado = window.confirm(`¿Desactivar a "${proveedor.nombre}"?`)
    if (!confirmado) return
    setDesactivando(true)
    const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', proveedor.id)
    setDesactivando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Proveedor desactivado')
    router.push('/dashboard/proveedores')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input id="nombre" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contacto">Contacto</Label>
          <Input id="contacto" value={form.contacto} onChange={e => handleChange('contacto', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nit_ruc">NIT / RUC</Label>
          <Input id="nit_ruc" value={form.nit_ruc} onChange={e => handleChange('nit_ruc', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" value={form.notas} onChange={e => handleChange('notas', e.target.value)} rows={3} />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear proveedor'}
      </Button>
      {esEdicion && (
        <button type="button" disabled={desactivando} onClick={handleDesactivar}
          className={buttonVariants({ variant: 'outline', className: 'w-full border-brand-red/30 text-brand-red hover:bg-brand-red-soft' })}>
          {desactivando ? 'Desactivando…' : 'Desactivar proveedor'}
        </button>
      )}
    </form>
  )
}