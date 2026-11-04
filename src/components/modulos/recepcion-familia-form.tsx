'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INPUT_CLS, LABEL_CLS, MEDIDA_REGEX, SEPARADOR_FAMILIA, generarSKU, parseUnidadMedida } from './producto-form'
import { BuscadorProducto, type ProductoElegido } from './recepcion-buscador'
import type { ProductoDelProveedor } from './recepcion-tipos'

interface ProductoBase {
  id: string
  nombre: string
  familiaId: string | null
  nombreBase: string | null
  caracteristica: string | null
  marca: string | null
  unidadMedida: string | null
  categoria: string | null
}

/**
 * Crea el producto de un renglón pendiente dentro de una familia que ya existe (crear_miembro_familia_renglon): otra
 * medida del mismo grupo (misma característica y marca) u otra característica o marca de la familia. Nace con los datos
 * del producto elegido, queda asociado al renglón y se activa al aprobar los precios. Solo administrador.
 */
export function RecepcionFamiliaForm({ renglonId, descripcion, productosProveedor, unidades, onListo }: {
  renglonId: string
  descripcion: string
  productosProveedor: ProductoDelProveedor[]
  unidades: string[]
  onListo: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [base, setBase] = useState<ProductoBase | null>(null)
  const [cargando, setCargando] = useState(false)
  const [caracteristica, setCaracteristica] = useState('')
  const [marca, setMarca] = useState('')
  const [medida, setMedida] = useState('')
  const [unidad, setUnidad] = useState('')
  const [guardando, setGuardando] = useState(false)

  const elegirBase = async (p: ProductoElegido) => {
    setCargando(true)
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, familia_id, caracteristica, marca, unidad_medida, categorias_producto(nombre), producto_familias(nombre_base)')
      .eq('id', p.id)
      .single()
    setCargando(false)
    if (error || !data) { toast.error('No se pudo leer el producto: ' + (error?.message ?? 'no encontrado')); return }
    const elegido: ProductoBase = {
      id: data.id,
      nombre: data.nombre,
      familiaId: data.familia_id,
      nombreBase: data.producto_familias?.nombre_base ?? null,
      caracteristica: data.caracteristica,
      marca: data.marca,
      unidadMedida: data.unidad_medida,
      categoria: data.categorias_producto?.nombre ?? null,
    }
    setBase(elegido)
    setCaracteristica(elegido.caracteristica ?? '')
    setMarca(elegido.marca ?? 'Generica')
    setMedida('')
    setUnidad(parseUnidadMedida(elegido.unidadMedida).unidad)
  }

  const nombreFinal = base?.nombreBase ? `${base.nombreBase}${SEPARADOR_FAMILIA}${caracteristica.trim()}` : ''
  const medidaLimpia = medida.trim().replace(/X/g, 'x')
  const unidadMedida = medidaLimpia ? `${medidaLimpia} ${unidad}`.trim() : unidad
  const mismoGrupo = !!base && caracteristica.trim() === (base.caracteristica ?? '') && marca.trim() === (base.marca ?? '')
  const opcionesUnidad = unidad && !unidades.includes(unidad) ? [...unidades, unidad] : unidades

  const crear = async () => {
    if (!base?.familiaId) return
    if (!caracteristica.trim()) { toast.error('Escribe la característica'); return }
    if (!unidad) { toast.error('Elige la unidad'); return }
    if (medidaLimpia && !MEDIDA_REGEX.test(medidaLimpia)) { toast.error('Escribe una sola medida, sin ";"'); return }
    setGuardando(true)
    const codigo = generarSKU(nombreFinal, base.categoria ?? '', marca.trim() || 'Generica', medidaLimpia, unidad)
    const { error } = await supabase.rpc('crear_miembro_familia_renglon', {
      p_renglon_id: renglonId,
      p_producto_base_id: base.id,
      p_caracteristica: caracteristica.trim(),
      p_marca: marca.trim(),
      p_unidad_medida: unidadMedida,
      p_codigo: codigo || undefined,
    })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success('Producto creado en la familia. Queda activo cuando apruebes los precios de la recepción.')
    onListo()
    router.refresh()
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Layers className="h-4 w-4 text-brand-blue" />Agregar a una familia o grupo de medidas
      </p>
      <p className="text-xs text-steel-300">
        Busca un producto de la misma familia (por ejemplo, la misma referencia en otra medida). El nuevo hereda su
        categoría, IVA, imagen y proveedores. En la factura dice: <span className="text-white">{descripcion}</span>
      </p>
      <BuscadorProducto id={`familia-buscar-${renglonId}`} productosProveedor={productosProveedor} onElegir={elegirBase}
        placeholder="Producto de la familia" />
      {cargando && <p className="text-xs text-steel-300">Cargando…</p>}

      {base && !base.familiaId && (
        <p className="rounded-lg border border-brand-yellow/30 bg-brand-yellow/10 p-2 text-xs text-brand-yellow">
          &quot;{base.nombre}&quot; todavía no tiene familia. Créala en{' '}
          <Link href={`/dashboard/inventario/${base.id}/familia`} className="font-semibold underline">su página de familia</Link>
          {' '}y vuelve a esta recepción.
        </p>
      )}

      {base?.familiaId && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`familia-car-${renglonId}`} className={LABEL_CLS}>Característica</Label>
              <Input id={`familia-car-${renglonId}`} value={caracteristica} onChange={e => setCaracteristica(e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`familia-marca-${renglonId}`} className={LABEL_CLS}>Marca</Label>
              <Input id={`familia-marca-${renglonId}`} value={marca} onChange={e => setMarca(e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`familia-medida-${renglonId}`} className={LABEL_CLS}>Medida nueva</Label>
              <Input id={`familia-medida-${renglonId}`} value={medida} onChange={e => setMedida(e.target.value)}
                placeholder="Ej: 6x2" className={INPUT_CLS} />
            </div>
            <div className="space-y-1">
              <Label className={LABEL_CLS}>Unidad</Label>
              <Select value={unidad} onValueChange={v => v && setUnidad(v)} items={opcionesUnidad.map(u => ({ value: u, label: u }))}>
                <SelectTrigger className="w-full border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Unidad" /></SelectTrigger>
                <SelectContent>{opcionesUnidad.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="rounded-lg border border-white/10 bg-[#111820] p-2 text-xs text-steel-300">
            Se crea <span className="font-semibold text-white">{nombreFinal} {unidadMedida}</span> de marca{' '}
            <span className="text-white">{marca.trim() || 'Generica'}</span>,{' '}
            {mismoGrupo ? 'como otra medida del mismo grupo.' : 'como otra variante de la familia.'}
          </p>
          <Button type="button" onClick={crear} disabled={guardando}
            className="h-10 w-full bg-brand-blue font-semibold text-white hover:bg-brand-blue hover:brightness-110">
            {guardando ? 'Creando…' : 'Crear y asociar al renglón'}
          </Button>
        </div>
      )}
    </div>
  )
}
