'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDown, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { NivelGrupo } from '@/lib/inventario-arbol'
import { planearUnion } from '@/lib/unir-grupos'

interface Props {
  familia: string
  origen: NivelGrupo
  destino: NivelGrupo
  /** Todos los grupos de la familia */
  grupos: NivelGrupo[]
  onCerrar: () => void
  /** Se llama cuando la unión quedó guardada (con la clave del grupo de destino) */
  onUnido?: (claveDestino: string) => void
}

const nombreGrupo = (g: NivelGrupo) => [g.caracteristica ?? g.nombre, g.marca].filter(Boolean).join(' · ')

/**
 * Confirmación de "unir un grupo de medidas dentro de otro" (se abre al soltar una tarjeta sobre otra).
 * Muestra qué va a pasar, avisa las medidas repetidas y el cambio de marca, y permite deshacer después de guardar.
 */
export function UnirGruposMedidas({ familia, origen, destino, grupos, onCerrar, onUnido }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [guardando, setGuardando] = useState(false)
  const plan = useMemo(() => planearUnion(origen, destino, grupos), [origen, destino, grupos])
  const ids = plan.mover.map(p => p.id)
  const n = plan.mover.length

  // Los dos pasos de la unión. El de la marca solo existe cuando los grupos tienen marcas distintas.
  const ponerNombre = (caracteristica: string | null) =>
    supabase.rpc('mover_productos', { p_producto_ids: ids, p_caracteristica: caracteristica ?? '' })
  const ponerMarca = (marca: string | null) => supabase.from('productos').update({ marca }).in('id', ids)

  /** Lleva las medidas a la característica y marca dadas, en el orden que no choca. Devuelve el error, o null. */
  async function llevar(a: NivelGrupo, desde: NivelGrupo, orden: 'nombre-primero' | 'marca-primero'): Promise<string | null> {
    if (!plan.cambiaMarca) return (await ponerNombre(a.caracteristica)).error?.message ?? null
    if (orden === 'nombre-primero') {
      const { error } = await ponerNombre(a.caracteristica)
      if (error) return error.message
      const { error: errorMarca } = await ponerMarca(a.marca)
      if (!errorMarca) return null
      // No dejar la unión a medias: vuelven a su nombre
      await ponerNombre(desde.caracteristica)
      return errorMarca.message
    }
    const { error: errorMarca } = await ponerMarca(a.marca)
    if (errorMarca) return errorMarca.message
    const { error } = await ponerNombre(a.caracteristica)
    if (!error) return null
    await ponerMarca(desde.marca)
    return error.message
  }

  async function deshacer() {
    // Vuelven a su característica (y marca) de antes, por el camino inverso; el código, el stock y los precios nunca cambiaron
    const error = await llevar(origen, destino, plan.orden === 'nombre-primero' ? 'marca-primero' : 'nombre-primero')
    if (error) { toast.error('No se pudo deshacer: ' + error); return }
    toast.success('Unión deshecha')
    router.refresh()
  }

  async function unir() {
    if (plan.error || guardando) return
    setGuardando(true)
    const error = await llevar(destino, origen, plan.orden)
    setGuardando(false)
    if (error) {
      toast.error('No se pudo unir: ' + error)
      router.refresh()
      return
    }
    toast.success(`${n} medida${n === 1 ? '' : 's'} unida${n === 1 ? '' : 's'} a ${nombreGrupo(destino)}`, {
      duration: 10000,
      action: origen.caracteristica ? { label: 'Deshacer', onClick: () => { void deshacer() } } : undefined,
    })
    onCerrar()
    router.refresh()
    onUnido?.(destino.clave)
  }

  const CAJA = 'rounded-xl border border-white/10 bg-[#111820] px-3 py-2.5'

  return (
    <Sheet open onOpenChange={abierto => { if (!abierto && !guardando) onCerrar() }}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg">
        <SheetHeader className="p-0 pr-8">
          <SheetTitle className="text-base text-white">Unir grupos de medidas</SheetTitle>
          <SheetDescription className="text-xs text-steel-300">Familia {familia}</SheetDescription>
        </SheetHeader>

        <div className="space-y-1.5">
          <div className={CAJA}>
            <p className="text-[11px] uppercase tracking-wide text-steel-500">Se mueve</p>
            <p className="text-sm font-bold text-white">{nombreGrupo(origen)}</p>
            <p className="text-xs text-steel-300">{origen.items.length} medida{origen.items.length === 1 ? '' : 's'}</p>
          </div>
          <ArrowDown className="mx-auto h-4 w-4 text-brand-yellow" aria-hidden />
          <div className={`${CAJA} border-brand-yellow/40`}>
            <p className="text-[11px] uppercase tracking-wide text-steel-500">Queda dentro de</p>
            <p className="text-sm font-bold text-white">{nombreGrupo(destino)}</p>
            <p className="text-xs text-steel-300">{destino.items.length} medida{destino.items.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        {plan.error ? (
          <p className="flex gap-2 rounded-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2.5 text-sm text-white">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden /> {plan.error}
          </p>
        ) : (
          <div className="space-y-2 text-xs text-steel-300">
            <p>
              {n === origen.items.length ? `Las ${n} medidas` : `${n} de las ${origen.items.length} medidas`} de{' '}
              <span className="font-semibold text-white">{nombreGrupo(origen)}</span> pasan a llamarse{' '}
              <span className="font-semibold text-white">{destino.nombre}</span>. El código, el stock, los precios y los
              proveedores no cambian.
            </p>
            {plan.cambiaMarca && (
              <p className="flex gap-2 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-2 text-white">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" aria-hidden />
                <span>
                  Los grupos tienen marcas distintas: las medidas que pasan cambian de marca,
                  de <b>{origen.marca ?? 'sin marca'}</b> a <b>{destino.marca ?? 'sin marca'}</b>.
                </span>
              </p>
            )}
          </div>
        )}

        {plan.repetidas.length > 0 && (
          <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-2 text-xs text-white">
            <p className="flex gap-2 font-semibold">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" aria-hidden />
              {plan.repetidas.length === 1 ? 'Esta medida ya existe' : `Estas ${plan.repetidas.length} medidas ya existen`} en el destino
              {plan.error ? '' : ' y se queda' + (plan.repetidas.length === 1 ? '' : 'n') + ' en su grupo actual'}:
            </p>
            <p className="mt-1 pl-6 text-steel-300">{plan.repetidas.map(r => r.medida).join(', ')}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onCerrar} disabled={guardando}
            className="h-12 flex-1 rounded-xl border border-white/15 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-50">
            {plan.error ? 'Entendido' : 'Cancelar'}
          </button>
          {!plan.error && (
            <button type="button" onClick={unir} disabled={guardando}
              className="h-12 flex-[1.4] rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
              {guardando ? 'Uniendo…' : `Unir ${n} medida${n === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
