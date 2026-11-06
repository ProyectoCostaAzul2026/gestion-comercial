'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type TipoNivel = 'categoria' | 'familia' | 'grupo'

const SEPARADOR = ' - '
const limpiar = (t: string) => t.trim().replace(/\s+/g, ' ')

interface Props {
  tipo: TipoNivel
  onCerrar: () => void
  /** Categoría donde se crea la familia o el grupo */
  categoriaId?: string
  /** Familia donde se crea el grupo */
  familia?: string
  categorias: { id: string; nombre: string }[]
  familias: { id: string; nombre_base: string }[]
  marcas: string[]
  /** Grupos que ya tiene la familia en esta categoría, como "característica|marca" en minúscula, con su clave */
  gruposExistentes?: Map<string, string>
  /** Ruta del inventario a la que vuelve el formulario de producto nuevo */
  rutaVolver: string
  onCategoriaCreada: (id: string) => void
  onIrGrupo?: (clave: string) => void
}

const TEXTOS: Record<TipoNivel, { titulo: string; descripcion: string }> = {
  categoria: { titulo: 'Nueva categoría', descripcion: 'Después entras a ella para crear sus familias.' },
  familia: {
    titulo: 'Nueva familia',
    descripcion: 'Una familia es el tipo de producto (Codo, Tornillo, Brocha). Escribe también su primer grupo de medidas; luego creas su primera medida.',
  },
  grupo: {
    titulo: 'Nuevo grupo de medidas',
    descripcion: 'Un grupo son los productos de la familia con la misma característica y marca, que solo cambian de medida. Luego creas su primera medida.',
  },
}

/** Crea una categoría, o abre "Nuevo producto" con la familia y el grupo de medidas nuevos ya elegidos */
export function CrearNivelInventario({
  tipo, onCerrar, categoriaId, familia: familiaFija, categorias, familias, marcas, gruposExistentes, rutaVolver,
  onCategoriaCreada, onIrGrupo,
}: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [nombre, setNombre] = useState('')
  const [familia, setFamilia] = useState(familiaFija ?? '')
  const [caracteristica, setCaracteristica] = useState('')
  const [marca, setMarca] = useState('Generica')
  const [guardando, setGuardando] = useState(false)

  const familiaExistente = useMemo(() => {
    const n = limpiar(familia).toLowerCase()
    return n ? familias.find(f => f.nombre_base.trim().toLowerCase() === n) ?? null : null
  }, [familia, familias])

  async function crearCategoria() {
    const n = limpiar(nombre)
    if (!n) { toast.error('Escribe el nombre de la categoría'); return }
    const repetida = categorias.find(c => c.nombre.trim().toLowerCase() === n.toLowerCase())
    if (repetida) { toast.error(`La categoría "${repetida.nombre}" ya existe`); return }
    setGuardando(true)
    const { data, error } = await supabase.from('categorias_producto').insert({ nombre: n }).select('id').single()
    setGuardando(false)
    if (error || !data) { toast.error('No se pudo crear la categoría: ' + (error?.message ?? '')); return }
    toast.success('Categoría creada')
    onCerrar()
    onCategoriaCreada(data.id)
  }

  function continuar() {
    const f = limpiar(familia), c = limpiar(caracteristica), m = limpiar(marca) || 'Generica'
    if (!f) { toast.error('Escribe la familia'); return }
    if (!c) { toast.error('Escribe la característica del grupo'); return }
    if (f.includes(SEPARADOR) || c.includes(SEPARADOR)) { toast.error('No uses " - " dentro de la familia o la característica (usa /)'); return }
    const existente = gruposExistentes?.get(`${c}|${m}`.toLowerCase())
    if (tipo === 'grupo' && existente && onIrGrupo) {
      toast.info('Ese grupo de medidas ya existe en esta familia: te llevo a él')
      onCerrar()
      onIrGrupo(existente)
      return
    }
    const sp = new URLSearchParams({ categoria: categoriaId ?? '', familia: f, caracteristica: c, marca: m, volver: rutaVolver })
    router.push(`/dashboard/inventario/nuevo?${sp.toString()}`)
  }

  const CAMPO = 'h-11 border-white/10 bg-[#1a2430] text-[16px] text-white placeholder:text-steel-500'
  const nombreFinal = `${familiaExistente?.nombre_base ?? (limpiar(familia) || '…')}${SEPARADOR}${limpiar(caracteristica) || '…'}`

  return (
    <Sheet open onOpenChange={abierto => { if (!abierto) onCerrar() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-4 sm:mx-auto sm:max-w-lg">
        <SheetHeader className="p-0 pr-8">
          <SheetTitle className="text-base text-white">{TEXTOS[tipo].titulo}</SheetTitle>
          <SheetDescription className="text-xs text-steel-300">{TEXTOS[tipo].descripcion}</SheetDescription>
        </SheetHeader>

        {tipo === 'categoria' ? (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); crearCategoria() }}>
            <div className="space-y-1">
              <Label htmlFor="nivel-categoria" className="text-xs text-steel-300">Nombre de la categoría</Label>
              <Input id="nivel-categoria" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Iluminación" className={CAMPO} autoFocus autoComplete="off" />
            </div>
            <button type="submit" disabled={guardando}
              className="h-11 w-full rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105 disabled:opacity-50">
              {guardando ? 'Creando…' : 'Crear categoría'}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); continuar() }}>
            {tipo === 'familia' ? (
              <div className="space-y-1">
                <Label htmlFor="nivel-familia" className="text-xs text-steel-300">Familia</Label>
                <Input id="nivel-familia" list="nivel-familias" value={familia} onChange={e => setFamilia(e.target.value)} placeholder="Ej: Codo" className={CAMPO} autoFocus autoComplete="off" />
                <datalist id="nivel-familias">{familias.map(f => <option key={f.id} value={f.nombre_base} />)}</datalist>
                {familiaExistente && (
                  <p className="text-[11px] text-brand-yellow">Esa familia ya existe (quizás en otra categoría): el producto se agregará a ella en esta categoría.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-steel-300">Familia: <span className="font-semibold text-white">{familiaFija}</span></p>
            )}
            <div className="space-y-1">
              <Label htmlFor="nivel-caracteristica" className="text-xs text-steel-300">Característica del grupo</Label>
              <Input id="nivel-caracteristica" value={caracteristica} onChange={e => setCaracteristica(e.target.value)} placeholder="Ej: PVC Presion" className={CAMPO} autoFocus={tipo === 'grupo'} autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nivel-marca" className="text-xs text-steel-300">Marca</Label>
              <Input id="nivel-marca" list="nivel-marcas" value={marca} onChange={e => setMarca(e.target.value)} className={CAMPO} autoComplete="off" />
              <datalist id="nivel-marcas">{marcas.map(m => <option key={m} value={m} />)}</datalist>
            </div>
            <p className="rounded-lg border border-white/10 bg-[#111820] px-3 py-2 text-xs text-steel-300">
              Los productos se llamarán: <span className="font-semibold text-white">{nombreFinal}</span>
            </p>
            <button type="submit"
              className="h-11 w-full rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105">
              Continuar con la primera medida
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
