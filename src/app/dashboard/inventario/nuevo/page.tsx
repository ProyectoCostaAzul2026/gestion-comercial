import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductoForm, type NuevoInicial } from '@/components/modulos/producto-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Parametros = {
  desde?: string
  categoria?: string
  familia?: string
  caracteristica?: string
  marca?: string
  volver?: string
}

const limpiar = (t: string | undefined) => (t ?? '').trim().replace(/\s+/g, ' ')

/**
 * Un producto nuevo siempre nace dentro de una categoría, una familia y un grupo de medidas, elegidos en el inventario:
 * - `desde`: otra medida del mismo grupo (copia categoría, familia, característica, marca, imagen, IVA, ubicación y
 *   proveedor principal);
 * - `categoria` + `familia` + `caracteristica` + `marca`: la primera medida de un grupo o de una familia nueva.
 */
export default async function NuevoProductoPage({ searchParams }: { searchParams: Promise<Parametros> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const volver = sp.volver?.startsWith('/dashboard/inventario') ? sp.volver : '/dashboard/inventario'

  const [{ data: profile }, { data: config }, { data: categorias }, { data: proveedores }, { data: unidades }] = await Promise.all([
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
    supabase.from('configuracion_negocio').select('margen_default').single(),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('unidades_medida').select('nombre').eq('activo', true).order('orden'),
  ])

  let contexto: { categoria: string; familia: string; caracteristica: string; marca: string } | null = null
  let nuevoInicial: NuevoInicial = {}
  let problema = 'Para crear un producto, entra al inventario y elige la categoría, la familia y el grupo de medidas donde va.'

  if (sp.desde) {
    const { data: base } = await supabase
      .from('productos')
      .select(`categoria_id, caracteristica, marca, imagen_url, ubicacion, tiene_iva, iva_incluido, porcentaje_iva,
        familia:producto_familias(nombre_base), producto_proveedores(proveedor_id, es_costo_base_manual)`)
      .eq('id', sp.desde)
      .single()
    const familia = (base?.familia as { nombre_base: string } | null)?.nombre_base
    const categoria = categorias?.find(c => c.id === base?.categoria_id)
    if (base && familia && base.caracteristica && categoria) {
      const marca = base.marca || 'Generica'
      const proveedoresBase = (base.producto_proveedores ?? []) as { proveedor_id: string; es_costo_base_manual: boolean }[]
      contexto = { categoria: categoria.nombre, familia, caracteristica: base.caracteristica, marca }
      nuevoInicial = {
        nombre: `${familia} - ${base.caracteristica}`,
        categoriaId: categoria.id,
        marca,
        imagenUrl: base.imagen_url ?? undefined,
        ubicacion: base.ubicacion ?? undefined,
        tieneIva: base.tiene_iva,
        ivaIncluido: base.iva_incluido,
        porcentajeIva: Number(base.porcentaje_iva),
        proveedorId: (proveedoresBase.find(p => p.es_costo_base_manual) ?? proveedoresBase[0])?.proveedor_id,
      }
    } else {
      problema = 'Ese producto no tiene categoría, familia o grupo completos. Muévelo primero desde el inventario.'
    }
  } else if (sp.categoria || sp.familia || sp.caracteristica) {
    const categoria = categorias?.find(c => c.id === sp.categoria)
    let familia = limpiar(sp.familia)
    const caracteristica = limpiar(sp.caracteristica)
    const marca = limpiar(sp.marca) || 'Generica'
    if (!categoria || !familia || !caracteristica) {
      problema = 'Falta la categoría, la familia o la característica del grupo de medidas.'
    } else if (familia.includes(' - ') || caracteristica.includes(' - ')) {
      problema = 'La familia y la característica no pueden llevar " - " (usa /).'
    } else {
      // Si la familia ya existe, se usa su nombre tal como está guardado
      const { data: existente } = await supabase.from('producto_familias').select('nombre_base').ilike('nombre_base', familia).limit(1)
      if (existente?.[0]) familia = existente[0].nombre_base
      contexto = { categoria: categoria.nombre, familia, caracteristica, marca }
      nuevoInicial = { nombre: `${familia} - ${caracteristica}`, categoriaId: categoria.id, marca }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={volver} className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Nuevo Producto</h1>
          </div>
        </div>
      </div>
      <div className="p-4">
        {contexto ? (
          <ProductoForm
            categorias={categorias ?? []}
            proveedores={proveedores ?? []}
            unidades={(unidades ?? []).map(u => u.nombre)}
            empleadoId={user.id}
            isSheet={false}
            rol={(profile?.rol as 'empleado' | 'administrador') ?? 'empleado'}
            margenDefault={config?.margen_default != null ? Number(config.margen_default) * 100 : 40}
            rutaVolver={volver}
            nuevoInicial={nuevoInicial}
            contexto={contexto}
          />
        ) : (
          <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-6 text-center">
            <p className="text-sm text-steel-300">{problema}</p>
            <Link href={volver} className="inline-flex h-10 items-center rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105">
              Ir al inventario
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
