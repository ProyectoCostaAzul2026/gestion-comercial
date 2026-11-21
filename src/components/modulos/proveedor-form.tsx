'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/lib/avisos'
import { useNavegacion } from '@/lib/navegacion'
import { CampoImagen } from '@/components/ui/campo-imagen'
import { imagenVisible, valorImagen, type ValorImagen } from '@/lib/imagenes'
import { confirmar } from '@/components/ui/confirmar'

interface ProveedorFormState {
  nombre: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  nit_ruc: string
  notas: string
  logo_url: string
  sitio_web: string
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
  logo_url: string | null
  logo_subido?: string | null
  logo_enlace?: string | null
  sitio_web: string | null
}

interface ProveedorFormProps {
  proveedor?: ProveedorExistente
}

function estadoInicial(proveedor?: ProveedorExistente): ProveedorFormState {
  if (!proveedor) return { nombre: '', contacto: '', telefono: '', email: '', direccion: '', nit_ruc: '', notas: '', logo_url: '', sitio_web: '' }
  return {
    nombre: proveedor.nombre,
    contacto: proveedor.contacto ?? '',
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
    direccion: proveedor.direccion ?? '',
    nit_ruc: proveedor.nit_ruc ?? '',
    notas: proveedor.notas ?? '',
    logo_url: proveedor.logo_url ?? '',
    sitio_web: proveedor.sitio_web ?? '',
  }
}

export function ProveedorForm({ proveedor }: ProveedorFormProps) {
  const esEdicion = !!proveedor
  const supabase = createClient()
  const { volver } = useNavegacion()
  const [form, setForm] = useState<ProveedorFormState>(estadoInicial(proveedor))
  // Logo subido y enlace por aparte: el subido tiene prioridad y el enlace queda de respaldo
  const [logo, setLogo] = useState<ValorImagen>(() => valorImagen(proveedor?.logo_url, proveedor?.logo_subido, proveedor?.logo_enlace))
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
        logo_url: imagenVisible(logo) || null,
        logo_subido: logo.subida.trim() || null,
        logo_enlace: logo.enlace.trim() || null,
        sitio_web: form.sitio_web.trim() || null,
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
      volver('/dashboard/proveedores', { refrescar: true })
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDesactivar = async () => {
    if (!proveedor) return
    const confirmado = await confirmar({ titulo: `¿Desactivar a "${proveedor.nombre}"?`, mensaje: 'Deja de aparecer en las listas de proveedores. Sus facturas y pagos se conservan.', tono: 'peligro', textoConfirmar: 'Desactivar' })
    if (!confirmado) return
    setDesactivando(true)
    const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', proveedor.id)
    setDesactivando(false)
    if (error) { toast.error('No se pudo completar la acción', { description: error.message }); return }
    toast.success('Proveedor desactivado')
    volver('/dashboard/proveedores', { refrescar: true })
  }

  const inputCls = 'h-12 border-linea-fuerte bg-superficie text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25'
  const labelCls = 'text-sm font-semibold text-suave'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre" className={labelCls}>Nombre *</Label>
        <Input id="nombre" className={inputCls} value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contacto" className={labelCls}>Contacto</Label>
          <Input id="contacto" className={inputCls} value={form.contacto} onChange={e => handleChange('contacto', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nit_ruc" className={labelCls}>NIT / RUC</Label>
          <Input id="nit_ruc" className={inputCls} value={form.nit_ruc} onChange={e => handleChange('nit_ruc', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono" className={labelCls}>Teléfono</Label>
          <Input id="telefono" className={inputCls} value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className={labelCls}>Email</Label>
          <Input id="email" type="email" className={inputCls} value={form.email} onChange={e => handleChange('email', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion" className={labelCls}>Dirección</Label>
        <Input id="direccion" className={inputCls} value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sitio_web" className={labelCls}>Sitio web</Label>
        <Input id="sitio_web" className={inputCls} value={form.sitio_web} placeholder="www.proveedor.com" onChange={e => handleChange('sitio_web', e.target.value)} />
      </div>
      <CampoImagen etiqueta="Logo" carpeta="proveedores" forma="logo" valor={logo} onCambio={setLogo}
        placeholderEnlace="https://…/logo.png" claseCampo={inputCls} claseEtiqueta={labelCls} />
      <div className="space-y-2">
        <Label htmlFor="notas" className={labelCls}>Notas</Label>
        <Textarea id="notas" className="border-linea-fuerte bg-superficie text-[16px] text-tinta placeholder:text-tenue focus:border-accion focus:ring-3 focus:ring-accion/25" value={form.notas} onChange={e => handleChange('notas', e.target.value)} rows={3} />
      </div>
      <div className="sticky bottom-[var(--abajo-nav,0px)] z-10 -mx-4 bg-gradient-to-t from-fondo via-fondo/95 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-none lg:p-0">
<Button type="submit" disabled={saving} className="h-14 w-full rounded-xl bg-accion text-lg font-bold text-sobre-accion hover:bg-accion hover:brightness-105">
        {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear proveedor'}
      </Button>
</div>
      {esEdicion && (
        <button type="button" disabled={desactivando} onClick={handleDesactivar}
          className={buttonVariants({ variant: 'outline', className: 'h-12 w-full border-brand-red/30 bg-brand-red/15 text-sale hover:bg-brand-red/25 hover:text-sale' })}>
          {desactivando ? 'Desactivando…' : 'Desactivar proveedor'}
        </button>
      )}
    </form>
  )
}