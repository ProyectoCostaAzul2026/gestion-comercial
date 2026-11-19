'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invitarEmpleado, desactivarEmpleado, reactivarEmpleado } from '@/app/actions/empleados'
import { EnlaceAcceso } from './enlace-acceso'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useNavegacion } from '@/lib/navegacion'

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
  const { volver } = useNavegacion()

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
  // Enlace para que el empleado recién creado haga su contraseña
  const [enlaceNuevo, setEnlaceNuevo] = useState<string | null>(null)

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
        volver('/dashboard/empleados', { refrescar: true })
      } else {
        if (!form.email.trim()) { toast.error('El email es obligatorio'); setSaving(false); return }
        const { enlace } = await invitarEmpleado({
          email: form.email,
          nombre_completo: form.nombre_completo,
          telefono: form.telefono || null,
          foto_url: form.foto_url || null,
          rol: form.rol,
          salario_base: form.salario_base || null,
        })
        toast.success('Empleado creado')
        setEnlaceNuevo(enlace)
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
      volver('/dashboard/empleados', { refrescar: true })
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

  if (enlaceNuevo) {
    return (
      <div className="space-y-4">
        <EnlaceAcceso enlace={enlaceNuevo} nombre={form.nombre_completo} telefono={form.telefono} nuevo />
        <button type="button" onClick={() => volver('/dashboard/empleados', { refrescar: true })}
          className="h-12 w-full rounded-xl border border-linea bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2">
          Listo, volver a Empleados
        </button>
      </div>
    )
  }

  const inputCls = 'h-12 border-linea-fuerte bg-superficie text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25'
  const labelCls = 'text-sm font-semibold text-suave'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!esEdicion && (
        <div className="space-y-2">
          <Label htmlFor="email" className={labelCls}>Email *</Label>
          <Input
            id="email"
            type="email"
            className={inputCls}
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
        <Label htmlFor="nombre_completo" className={labelCls}>Nombre completo *</Label>
        <Input
          id="nombre_completo"
          className={inputCls}
          value={form.nombre_completo}
          onChange={e => handleChange('nombre_completo', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono" className={labelCls}>Teléfono</Label>
          <Input
            id="telefono"
            className={inputCls}
            value={form.telefono}
            onChange={e => handleChange('telefono', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>Rol</Label>
          <Select
            items={[
              { value: 'empleado', label: 'Empleado' },
              { value: 'administrador', label: 'Administrador' },
            ]}
            onValueChange={v => v && handleChange('rol', v)}
            value={form.rol}
          >
            <SelectTrigger className="h-12 w-full border-linea-fuerte bg-superficie text-[16px] text-tinta"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="empleado">Empleado</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email_emp" className={labelCls}>Email</Label>
        <Input
          id="email_emp"
          type="email"
          className={inputCls}
          value={form.email ?? ''}
          onChange={e => handleChange('email', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="foto_url" className={labelCls}>Foto (URL)</Label>
        <Input
          id="foto_url"
          className={inputCls}
          value={form.foto_url ?? ''}
          onChange={e => handleChange('foto_url', e.target.value)}
          placeholder="https://ejemplo.com/foto.jpg"
        />
        {form.foto_url && (
          <img src={form.foto_url} alt="Foto" className="h-16 w-16 rounded-full border-2 border-brand-yellow object-cover" />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="salario_base" className={labelCls}>Salario base</Label>
        <Input
          id="salario_base"
          type="number"
          className={inputCls}
          value={form.salario_base || ''}
          onChange={e => handleChange('salario_base', parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>

      <div className="sticky bottom-[var(--abajo-nav,0px)] z-10 -mx-4 bg-gradient-to-t from-fondo via-fondo/95 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-none lg:p-0">
<Button type="submit" disabled={saving} className="h-14 w-full rounded-xl bg-accion text-lg font-bold text-sobre-accion hover:bg-accion hover:brightness-105">
        {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Enviar invitación'}
      </Button>
</div>

      {esEdicion && (
        empleado.activo ? (
          <button
            type="button"
            disabled={accionando}
            onClick={handleDesactivar}
            className={buttonVariants({ variant: 'outline', className: 'h-12 w-full border-brand-red/30 bg-brand-red/15 text-sale hover:bg-brand-red/25 hover:text-sale' })}
          >
            {accionando ? 'Desactivando…' : 'Desactivar empleado'}
          </button>
        ) : (
          <button
            type="button"
            disabled={accionando}
            onClick={handleReactivar}
            className={buttonVariants({ variant: 'outline', className: 'h-12 w-full border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-400' })}
          >
            {accionando ? 'Reactivando…' : 'Reactivar empleado'}
          </button>
        )
      )}
    </form>
  )
}