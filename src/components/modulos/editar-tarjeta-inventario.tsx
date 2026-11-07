'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { limpiarTexto, validarImagenUrl } from '@/lib/inventario-arbol'

/** Qué tarjeta se edita: una categoría, una familia o un grupo de medidas (familia + característica + marca) */
export type TarjetaEditable =
  | { tipo: 'categoria'; id: string; nombre: string; imagen: string | null }
  | { tipo: 'familia'; id: string; nombre: string; imagen: string | null }
  | { tipo: 'grupo'; familiaId: string; familia: string; caracteristica: string | null; marca: string | null; imagen: string | null; medidas: number }

const TITULOS: Record<TarjetaEditable['tipo'], string> = {
  categoria: 'Editar categoría',
  familia: 'Editar familia',
  grupo: 'Editar grupo de medidas',
}

const DESCRIPCIONES: Record<TarjetaEditable['tipo'], string> = {
  categoria: 'Cambia el nombre y la imagen de la tarjeta. Los productos no cambian.',
  familia: 'Al cambiar el nombre, todos los productos de la familia pasan a llamarse "Familia nueva - Característica". La imagen es solo la de la tarjeta.',
  grupo: 'El nombre del grupo es su característica: los productos pasan a llamarse "Familia - Característica nueva". La imagen nueva queda en todas las medidas del grupo.',
}

/**
 * Edita el nombre y la URL de la imagen de una tarjeta del inventario. La categoría se actualiza directo; la familia y el
 * grupo pasan por editar_familia y editar_grupo_medidas, que también renombran los productos.
 */
export function EditarTarjetaInventario({ tarjeta, categorias, onCerrar, onGrupoRenombrado }: {
  tarjeta: TarjetaEditable
  categorias: { id: string; nombre: string }[]
  onCerrar: () => void
  /** Clave nueva del grupo ("característica|marca"), para seguir en él si se estaba viendo */
  onGrupoRenombrado?: (claveNueva: string) => void
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const nombreInicial = tarjeta.tipo === 'grupo' ? (tarjeta.caracteristica ?? '') : tarjeta.nombre
  const [nombre, setNombre] = useState(nombreInicial)
  const [imagen, setImagen] = useState(tarjeta.imagen ?? '')
  const [guardando, setGuardando] = useState(false)
  const imagenLimpia = imagen.trim()
  const errorImagen = validarImagenUrl(imagenLimpia)

  async function guardar() {
    const n = limpiarTexto(nombre)
    if (!n) { toast.error('Escribe el nombre'); return }
    if (tarjeta.tipo !== 'categoria' && n.includes(' - ')) { toast.error('No uses " - " en el nombre (usa /)'); return }
    if (errorImagen) { toast.error(errorImagen); return }
    const imagenNueva = imagenLimpia || null
    const cambiaImagen = imagenNueva !== (tarjeta.imagen ?? null)
    if (n === nombreInicial && !cambiaImagen) { onCerrar(); return }

    setGuardando(true)
    let error: { message: string } | null = null
    if (tarjeta.tipo === 'categoria') {
      const repetida = categorias.find(c => c.id !== tarjeta.id && c.nombre.trim().toLowerCase() === n.toLowerCase())
      if (repetida) { setGuardando(false); toast.error(`La categoría "${repetida.nombre}" ya existe`); return }
      ;({ error } = await supabase.from('categorias_producto').update({ nombre: n, imagen_url: imagenNueva }).eq('id', tarjeta.id))
    } else if (tarjeta.tipo === 'familia') {
      ;({ error } = await supabase.rpc('editar_familia', { p_familia_id: tarjeta.id, p_nombre_base: n, p_imagen_url: imagenNueva ?? undefined }))
    } else {
      ;({ error } = await supabase.rpc('editar_grupo_medidas', {
        p_familia_id: tarjeta.familiaId,
        // null identifica a un grupo sin característica o sin marca (la función compara con "is not distinct from")
        p_caracteristica: tarjeta.caracteristica as string,
        p_marca: tarjeta.marca as string,
        p_caracteristica_nueva: n,
        p_cambiar_imagen: cambiaImagen,
        p_imagen_url: imagenNueva ?? undefined,
      }))
    }
    setGuardando(false)
    if (error) { toast.error('No se pudo guardar: ' + error.message); return }
    toast.success('Cambios guardados')
    onCerrar()
    if (tarjeta.tipo === 'grupo' && n !== nombreInicial) onGrupoRenombrado?.(`${n}|${tarjeta.marca ?? ''}`)
    router.refresh()
  }

  const CAMPO = 'h-11 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500'
  const etiquetaNombre = tarjeta.tipo === 'grupo' ? 'Característica del grupo' : tarjeta.tipo === 'familia' ? 'Nombre de la familia' : 'Nombre de la categoría'

  return (
    <Sheet open onOpenChange={abierto => { if (!abierto) onCerrar() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-4 sm:mx-auto sm:max-w-lg">
        <SheetHeader className="p-0 pr-8">
          <SheetTitle className="text-base text-white">{TITULOS[tarjeta.tipo]}</SheetTitle>
          <SheetDescription className="text-xs text-steel-300">{DESCRIPCIONES[tarjeta.tipo]}</SheetDescription>
        </SheetHeader>
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); guardar() }}>
          <div className="space-y-1">
            <Label htmlFor="tarjeta-nombre" className="text-xs text-steel-300">{etiquetaNombre}</Label>
            <Input id="tarjeta-nombre" value={nombre} onChange={e => setNombre(e.target.value)} className={CAMPO} autoComplete="off" />
          </div>
          {tarjeta.tipo === 'grupo' && (
            <p className="rounded-lg border border-white/10 bg-[#111820] px-3 py-2 text-xs text-steel-300">
              Los productos se llamarán: <span className="font-semibold text-white">{tarjeta.familia} - {limpiarTexto(nombre) || '…'}</span>
              {' '}({tarjeta.marca ?? 'sin marca'}, {tarjeta.medidas} medida{tarjeta.medidas === 1 ? '' : 's'})
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="tarjeta-imagen" className="text-xs text-steel-300">URL de la imagen</Label>
            <Input id="tarjeta-imagen" type="url" inputMode="url" value={imagen} onChange={e => setImagen(e.target.value)}
              placeholder="https://…" className={CAMPO} autoComplete="off" />
            {imagenLimpia && errorImagen && <p className="text-[11px] text-brand-red">{errorImagen}</p>}
            {tarjeta.tipo === 'grupo' && (
              <p className="text-[11px] text-steel-500">Déjala vacía para quitar la imagen de todas las medidas. Si no la cambias, cada medida conserva la suya.</p>
            )}
          </div>
          {imagenLimpia && !errorImagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenLimpia} alt="Vista previa" className="mx-auto h-40 w-full rounded-xl bg-white object-contain" />
          )}
          <button type="submit" disabled={guardando}
            className="h-11 w-full rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
