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
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <p className="text-sm text-slate-500">
        Las categorías activas aparecen al registrar gastos en Caja y Contabilidad.
      </p>

      {/* Lista de categorías */}
      <div className="space-y-2">
        {categorias.map(cat => (
          <div key={cat.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${!cat.activo ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {cat.nombre}
              </span>
              {!cat.activo && <Badge variant="secondary" className="text-xs">Inactiva</Badge>}
            </div>
            <button
              type="button"
              onClick={() => handleToggle(cat)}
              disabled={toggling === cat.id}
              className={`rounded-md p-1.5 transition-colors ${
                cat.activo
                  ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                  : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title={cat.activo ? 'Desactivar' : 'Reactivar'}
            >
              {cat.activo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        ))}
      </div>

      {/* Agregar nueva */}
      <div className="flex gap-2 border-t pt-4">
        <Input
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          placeholder="Nueva categoría…"
          onKeyDown={e => e.key === 'Enter' && handleAgregar()}
          className="flex-1"
        />
        <Button type="button" onClick={handleAgregar} disabled={guardando}>
          <Plus className="h-4 w-4 mr-1" />
          {guardando ? 'Agregando…' : 'Agregar'}
        </Button>
      </div>
    </div>
  )
}