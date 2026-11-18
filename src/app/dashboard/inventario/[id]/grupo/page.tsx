import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { esAdmin } from '@/lib/permissions'
import { GrupoMedidasPanel, type MiembroGrupo } from '@/components/modulos/grupo-medidas-panel'

// Un grupo de medidas son los productos de la misma familia, característica y marca: lo mismo en distintas medidas.
// No tiene tabla propia; se arma desde cualquiera de sus productos.
const CAMPOS_MIEMBRO = `
  id, nombre, codigo, unidad_medida, marca, activo, stock_actual, stock_minimo, ubicacion,
  precio_venta, precio_costo_base, tiene_iva, iva_incluido, porcentaje_iva, orden_medida, peso_unitario_g
`

export default async function GrupoMedidasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: producto, error } = await supabase
    .from('productos')
    .select('id, nombre, familia_id, caracteristica, marca')
    .eq('id', id)
    .single()
  if (error || !producto) notFound()

  let consulta = supabase.from('productos').select(CAMPOS_MIEMBRO)
  if (producto.familia_id) {
    consulta = consulta.eq('familia_id', producto.familia_id)
    consulta = producto.caracteristica == null
      ? consulta.is('caracteristica', null)
      : consulta.eq('caracteristica', producto.caracteristica)
    consulta = producto.marca == null ? consulta.is('marca', null) : consulta.eq('marca', producto.marca)
  } else {
    consulta = consulta.eq('id', producto.id)
  }

  const [
    { data: miembrosData },
    { data: perfil },
    { data: config },
    { data: categorias },
    { data: proveedores },
  ] = await Promise.all([
    consulta.order('id'),
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
    supabase.from('configuracion_negocio').select('margen_default').single(),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  const miembros: MiembroGrupo[] = (miembrosData ?? []).map(m => ({
    ...m,
    precio_venta: Number(m.precio_venta),
    precio_costo_base: m.precio_costo_base != null ? Number(m.precio_costo_base) : null,
    porcentaje_iva: Number(m.porcentaje_iva),
    peso_unitario_g: m.peso_unitario_g != null ? Number(m.peso_unitario_g) : null,
  }))

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b lg:top-0 border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/inventario/${producto.id}`} className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-white">Grupo de medidas</h1>
            <p className="truncate text-xs text-steel-300">
              {producto.nombre}{producto.marca ? ` · ${producto.marca}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-4">
        <GrupoMedidasPanel
          productoActualId={producto.id}
          miembrosIniciales={miembros}
          esAdmin={esAdmin(perfil?.rol)}
          margenDefault={config?.margen_default != null ? Number(config.margen_default) * 100 : 40}
          categorias={categorias ?? []}
          proveedoresDisponibles={proveedores ?? []}
        />
      </div>
    </div>
  )
}
