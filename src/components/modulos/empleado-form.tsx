'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invitarEmpleado, desactivarEmpleado, reactivarEmpleado } from '@/app/actions/empleados'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export interface EmpleadoExistente {
  id: string
  nombre_completo: string
  telefono: string | null
  email: string | null
  foto_url: string | null
  rol: string
  salario_base: number | null
  activo: boolean
}

interface EmpleadoFormProps {
  empleado?: EmpleadoExistente
}

export function EmpleadoForm({ empleado }: EmpleadoFormProps) {
  const esEdicion = !!empleado
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    email: empleado?.email ?? '',
    nombre_completo: empleado?.nombre_completo ?? '',
    telefono: empleado?.telefono ?? '',
    foto_url: empleado?.foto_url ?? '',
    rol: empleado?.rol ?? 'empleado',
    salario_base: empleado?.salario_base ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [accionando, setAccionando] = useState(false)

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre_completo.trim()) { toast.error('El nombre es obligatorio'); return }

    setSaving(true)
    try {
      if (esEdicion) {
        const { error } = await supabase.from('profiles').update({
          nombre_completo: form.nombre_completo,
          telefono: form.telefono || null,
          email: form.email || null,
          foto_url: form.foto_url || null,
          rol: form.rol,
          salario_base: form.salario_base || null,
        }).eq('id', empleado.id)
        if (error) throw error
        toast.success('Empleado actualizado')
        router.refresh()
        router.push('/dashboard/empleados')
      } else {
        if (!form.email.trim()) { toast.error('El email es obligatorio'); setSaving(false); return }
        await invitarEmpleado({
          email: form.email,
          nombre_completo: form.nombre_completo,
          telefono: form.telefono || null,
          foto_url: form.foto_url || null,
          rol: form.rol,
          salario_base: form.salario_base || null,
        })
        toast.success('Invitación enviada al empleado por email')
        router.refresh()
        router.push('/dashboard/empleados')
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDesactivar = async () => {
    if (!empleado) return
    if (!window.confirm(`¿Desactivar a "${empleado.nombre_completo}"? No podrá iniciar sesión.`)) return
    setAccionando(true)
    try {
      await desactivarEmpleado(empleado.id)
      toast.success('Empleado desactivado')
      router.refresh()
      router.push('/dashboard/empleados')
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setAccionando(false)
    }
  }

  const handleReactivar = async () => {
    if (!empleado) return
    setAccionando(true)
    try {
      await reactivarEmpleado(empleado.id)
      toast.success('Empleado reactivado')
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setAccionando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!esEdicion && (
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
            placeholder="correo@ejemplo.com"
          />
          <p className="text-xs text-steel-500">
            Se enviará una invitación a este correo para que el empleado establezca su contraseña.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombre_completo">Nombre completo *</Label>
        <Input
          id="nombre_completo"
          value={form.nombre_completo}
          onChange={e => handleChange('nombre_completo', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={form.telefono}
            onChange={e => handleChange('telefono', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select
            items={[
              { value: 'empleado', label: 'Empleado' },
              { value: 'administrador', label: 'Administrador' },
            ]}
            onValueChange={v => v && handleChange('rol', v)}
            value={form.rol}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="empleado">Empleado</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email_emp">Email</Label>
        <Input
          id="email_emp"
          type="email"
          value={form.email ?? ''}
          onChange={e => handleChange('email', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="foto_url">Foto (URL)</Label>
        <Input
          id="foto_url"
          value={form.foto_url ?? ''}
          onChange={e => handleChange('foto_url', e.target.value)}
          placeholder="https://ejemplo.com/foto.jpg"
        />
        {form.foto_url && (
          <img src={form.foto_url} alt="Foto" className="h-16 w-16 rounded-full border border-slate-200 object-cover" />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="salario_base">Salario base</Label>
        <Input
          id="salario_base"
          type="number"
          value={form.salario_base || ''}
          onChange={e => handleChange('salario_base', parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Enviar invitación'}
      </Button>

      {esEdicion && (
        empleado.activo ? (
          <button
            type="button"
            disabled={accionando}
            onClick={handleDesactivar}
            className={buttonVariants({ variant: 'outline', className: 'w-full border-brand-red/30 text-brand-red hover:bg-brand-red-soft' })}
          >
            {accionando ? 'Desactivando…' : 'Desactivar empleado'}
          </button>
        ) : (
          <button
            type="button"
            disabled={accionando}
            onClick={handleReactivar}
            className={buttonVariants({ variant: 'outline', className: 'w-full border-green-200 text-green-600 hover:bg-green-50' })}
          >
            {accionando ? 'Reactivando…' : 'Reactivar empleado'}
          </button>
        )
      )}
    </form>
  )
}