'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ClienteFormState {
  nombre: string
  telefono: string
  email: string
  nit_cc: string
  direccion: string
  notas: string
}

export interface ClienteExistente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  nit_cc: string | null
  direccion: string | null
  notas: string | null
}

interface ClienteFormProps {
  cliente?: ClienteExistente
  onSuccess?: () => void
}

function estadoInicial(cliente?: ClienteExistente): ClienteFormState {
  if (!cliente) {
    return { nombre: '', telefono: '', email: '', nit_cc: '', direccion: '', notas: '' }
  }
  return {
    nombre: cliente.nombre,
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    nit_cc: cliente.nit_cc ?? '',
    direccion: cliente.direccion ?? '',
    notas: cliente.notas ?? '',
  }
}

export function ClienteForm({ cliente, onSuccess }: ClienteFormProps) {
  const esEdicion = !!cliente
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState<ClienteFormState>(estadoInicial(cliente))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDesactivando, setIsDesactivando] = useState(false)

  const handleChange = (field: keyof ClienteFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Ingresa un correo válido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const datos = {
        nombre: form.nombre,
        telefono: form.telefono || null,
        email: form.email || null,
        nit_cc: form.nit_cc || null,
        direccion: form.direccion || null,
        notas: form.notas || null,
      }

      if (esEdicion) {
        const { error } = await supabase.from('clientes').update(datos).eq('id', cliente.id)
        if (error) throw error
        toast.success('Cliente actualizado')
      } else {
        const { error } = await supabase.from('clientes').insert({ ...datos, activo: true, es_cliente_generico: false })
        if (error) throw error
        toast.success('Cliente creado')
      }

      router.refresh()
      router.push('/dashboard/clientes')
      onSuccess?.()
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDesactivar = async () => {
    if (!cliente) return
    const confirmado = window.confirm(`¿Seguro que deseas desactivar a "${cliente.nombre}"?`)
    if (!confirmado) return
    setIsDesactivando(true)
    const { error } = await supabase.from('clientes').update({ activo: false }).eq('id', cliente.id)
    setIsDesactivando(false)
    if (error) {
      toast.error('Error al desactivar: ' + error.message)
      return
    }
    toast.success('Cliente desactivado')
    router.push('/dashboard/clientes')
    router.refresh()
  }

  const inputCls = 'h-12 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500 focus:border-brand-yellow/60'
  const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-steel-300'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nombre" className={labelCls}>Nombre *</Label>
        <Input id="nombre" className={inputCls} value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)} />
        {errors.nombre && <p className="text-xs text-brand-red">{errors.nombre}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="telefono" className={labelCls}>Teléfono</Label>
          <Input id="telefono" className={inputCls} value={form.telefono} onChange={(e) => handleChange('telefono', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className={labelCls}>Email</Label>
          <Input id="email" type="email" className={inputCls} value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          {errors.email && <p className="text-xs text-brand-red">{errors.email}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nit_cc" className={labelCls}>NIT / CC</Label>
        <Input id="nit_cc" className={inputCls} value={form.nit_cc} onChange={(e) => handleChange('nit_cc', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion" className={labelCls}>Dirección</Label>
        <Input id="direccion" className={inputCls} value={form.direccion} onChange={(e) => handleChange('direccion', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas" className={labelCls}>Notas</Label>
        <Textarea id="notas" className="border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500 focus:border-brand-yellow/60" value={form.notas} onChange={(e) => handleChange('notas', e.target.value)} rows={3} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
        {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cliente'}
      </Button>

      {esEdicion && (
        <button
          type="button"
          disabled={isDesactivando}
          onClick={handleDesactivar}
          className={buttonVariants({ variant: 'outline', className: 'h-12 w-full border-brand-red/30 bg-brand-red/15 text-brand-red hover:bg-brand-red/25 hover:text-brand-red' })}
        >
          {isDesactivando ? 'Desactivando...' : 'Desactivar cliente'}
        </button>
      )}
    </form>
  )
}