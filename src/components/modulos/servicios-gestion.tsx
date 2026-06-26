'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  activo: boolean
}

export function ServiciosGestion({ servicios: inicial }: { servicios: Servicio[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [servicios, setServicios] = useState(inicial)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: 0 })
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', precio: 0 })
  const [saving, setSaving] = useState(false)

  const handleCrear = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (form.precio <= 0) { toast.error('El precio debe ser mayor a 0'); return }
    setSaving(true)
    const { data, error } = await supabase
      .from('servicios')
      .insert({ nombre: form.nombre, descripcion: form.descripcion || null, precio: form.precio, activo: true })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setServicios(prev => [...prev, data])
    setForm({ nombre: '', descripcion: '', precio: 0 })
    setMostrarNuevo(false)
    toast.success('Servicio creado')
  }

  const iniciarEdicion = (s: Servicio) => {
    setEditandoId(s.id)
    setEditForm({ nombre: s.nombre, descripcion: s.descripcion ?? '', precio: s.precio })
  }

  const handleActualizar = async (id: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('servicios')
      .update({ nombre: editForm.nombre, descripcion: editForm.descripcion || null, precio: editForm.precio })
      .eq('id', id)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setServicios(prev => prev.map(s => s.id === id ? { ...s, ...editForm, descripcion: editForm.descripcion || null } : s))
    setEditandoId(null)
    toast.success('Servicio actualizado')
  }

  const handleToggle = async (s: Servicio) => {
    const { error } = await supabase
      .from('servicios').update({ activo: !s.activo }).eq('id', s.id)
    if (error) { toast.error('Error: ' + error.message); return }
    setServicios(prev => prev.map(sv => sv.id === s.id ? { ...sv, activo: !sv.activo } : sv))
    toast.success(s.activo ? 'Servicio desactivado' : 'Servicio activado')
  }

  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {servicios.filter(s => s.activo).length} servicios activos
        </p>
        <Button size="sm" onClick={() => setMostrarNuevo(v => !v)}>
          <Plus className="h-4 w-4 mr-1" />Nuevo servicio
        </Button>
      </div>

      {mostrarNuevo && (
        <div className="rounded-md border bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Precio *</Label>
              <Input type="number" value={form.precio || ''}
                onChange={e => setForm(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Descripción</Label>
              <Input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCrear} disabled={saving}>
              {saving ? 'Guardando…' : 'Crear'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMostrarNuevo(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {servicios.map(s => (
          <div key={s.id} className={`rounded-md border p-3 ${!s.activo ? 'opacity-50' : ''}`}>
            {editandoId === s.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editForm.nombre}
                    onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                    className="h-8 text-sm" placeholder="Nombre" />
                  <Input type="number" value={editForm.precio || ''}
                    onChange={e => setEditForm(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-sm" placeholder="Precio" />
                  <Input value={editForm.descripcion}
                    onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))}
                    className="h-8 text-sm col-span-2" placeholder="Descripción" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleActualizar(s.id)} className="text-green-600 hover:text-green-800">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditandoId(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.nombre}</span>
                    {!s.activo && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">${Number(s.precio).toLocaleString('es-CO')}</span>
                    {s.descripcion && <span className="text-xs text-slate-400">{s.descripcion}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => iniciarEdicion(s)} className="text-slate-400 hover:text-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleToggle(s)}
                    className={`text-xs ${s.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                    {s.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {servicios.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Sin servicios registrados</p>
        )}
      </div>
    </div>
  )
}