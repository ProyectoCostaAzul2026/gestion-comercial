'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, X, Check } from 'lucide-react'

interface Categoria {
  id: string
  nombre: string
  activo: boolean
}

export function CategoriasGastoForm({ categorias }: { categorias: Categoria[] }) {
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
        .from('categorias_gasto')
        .insert({ nombre: nueva.trim(), activo: true })
      if (error) throw error
      toast.success('Categoría agregada')
      setNueva('')
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleToggle = async (cat: Categoria) => {
    setToggling(cat.id)
    try {
      const { error } = await supabase
        .from('categorias_gasto')
        .update({ activo: !cat.activo })
        .eq('id', cat.id)
      if (error) throw error
      toast.success(cat.activo ? 'Categoría desactivada' : 'Categoría reactivada')
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
        Las categorías activas aparecen al registrar gastos en Caja y Contabilidad.
      </p>

      {/* Lista de categorías */}
      <div className="space-y-2">
        {categorias.map(cat => (
          <div key={cat.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${!cat.activo ? 'text-steel-500 line-through' : 'text-white'}`}>
                {cat.nombre}
              </span>
              {!cat.activo && <span className="inline-flex items-center rounded-full border border-white/10 bg-steel-700 px-2 py-0.5 text-xs font-semibold text-steel-300">Inactiva</span>}
            </div>
            <button
              type="button"
              onClick={() => handleToggle(cat)}
              disabled={toggling === cat.id}
              className={`rounded-lg p-1.5 transition-colors ${
                cat.activo
                  ? 'text-steel-300 hover:bg-brand-red/15 hover:text-brand-red'
                  : 'text-steel-300 hover:bg-emerald-500/15 hover:text-emerald-400'
              }`}
              title={cat.activo ? 'Desactivar' : 'Reactivar'}
            >
              {cat.activo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        ))}
      </div>

      {/* Agregar nueva */}
      <div className="flex gap-2 border-t border-white/10 pt-4">
        <Input
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          placeholder="Nueva categoría…"
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