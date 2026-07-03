'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, X, Check } from 'lucide-react'

interface Unidad {
  id: string
  nombre: string
  activo: boolean
}

export function UnidadesMedidaForm({ unidades }: { unidades: Unidad[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [nueva, setNueva] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const handleAgregar = async () => {
    if (!nueva.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('unidades_medida')
        .insert({ nombre: nueva.trim(), activo: true, orden: 9999 })
      if (error) throw error
      toast.success('Unidad agregada')
      setNueva('')
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleToggle = async (u: Unidad) => {
    setToggling(u.id)
    try {
      const { error } = await supabase
        .from('unidades_medida')
        .update({ activo: !u.activo })
        .eq('id', u.id)
      if (error) throw error
      toast.success(u.activo ? 'Unidad desactivada' : 'Unidad reactivada')
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-6">
      <p className="text-sm text-steel-300">
        Las unidades activas aparecen al crear o editar productos, y al armar una Familia de productos.
      </p>

      {/* Lista de unidades */}
      <div className="flex flex-wrap gap-2">
        {unidades.map(u => (
          <div key={u.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2">
            <span className={`text-sm font-medium ${!u.activo ? 'text-steel-500 line-through' : 'text-white'}`}>
              {u.nombre}
            </span>
            <button
              type="button"
              onClick={() => handleToggle(u)}
              disabled={toggling === u.id}
              className={`rounded-lg p-1 transition-colors ${
                u.activo
                  ? 'text-steel-300 hover:bg-brand-red/15 hover:text-brand-red'
                  : 'text-steel-300 hover:bg-emerald-500/15 hover:text-emerald-400'
              }`}
              title={u.activo ? 'Desactivar' : 'Reactivar'}
            >
              {u.activo ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>

      {/* Agregar nueva */}
      <div className="flex gap-2 border-t border-white/10 pt-4">
        <Input
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          placeholder="Nueva unidad… (ej: Tonelada, Rollo)"
          onKeyDown={e => e.key === 'Enter' && handleAgregar()}
          className="h-12 flex-1 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500"
        />
        <Button type="button" onClick={handleAgregar} disabled={guardando} className="h-12 bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
          <Plus className="mr-1 h-4 w-4" />
          {guardando ? 'Agregando…' : 'Agregar'}
        </Button>
      </div>
    </div>
  )
}