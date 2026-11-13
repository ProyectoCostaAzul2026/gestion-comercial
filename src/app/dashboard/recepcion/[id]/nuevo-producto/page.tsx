import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { esAdmin } from '@/lib/permissions'
import { costoParaProducto } from '@/lib/recepcion'
import { RecepcionProductoNuevo } from '@/components/modulos/recepcion-producto-nuevo'

// Crear el producto de un renglón pendiente de la recepción (solo administrador)
export default async function NuevoProductoRecepcionPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const renglonId = (await searchParams).renglon
  const volver = `/dashboard/recepcion/${id}`
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!esAdmin(perfil?.rol) || typeof renglonId !== 'string') redirect(volver)

  const { data: rec } = await supabase.from('recepciones').select('id, proveedor_id, costos_con_iva, estado').eq('id', id).maybeSingle()
  if (!rec) notFound()
  const { data: renglon } = await supabase
    .from('recepcion_items')
    .select('id, producto_id, descripcion, referencia, cantidad_facturada, costo_unitario')
    .eq('id', renglonId)
    .eq('recepcion_id', id)
    .maybeSingle()
  if (!renglon || renglon.producto_id || rec.estado !== 'abierta') redirect(volver)

  const [{ data: config }, { data: categorias }, { data: proveedores }, { data: unidades }] = await Promise.all([
    supabase.from('configuracion_negocio').select('margen_default').maybeSingle(),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('unidades_medida').select('nombre').eq('activo', true).order('orden'),
  ])

  // El formulario empieza con IVA 19 % y el costo sin IVA: el costo del renglón se pasa a esa forma
  const costo = costoParaProducto(Number(renglon.costo_unitario), rec.costos_con_iva, { tieneIva: true, ivaIncluido: false, porcentajeIva: 19 })

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b lg:top-0 border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={volver} className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-white">Nuevo producto de la recepción</h1>
            <p className="truncate text-xs text-steel-300">En la factura: {renglon.descripcion}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <RecepcionProductoNuevo
          recepcionId={id}
          renglon={{ id: renglon.id, referencia: renglon.referencia, cantidad_facturada: renglon.cantidad_facturada, costo_unitario: Number(renglon.costo_unitario) }}
          categorias={categorias ?? []}
          proveedores={proveedores ?? []}
          unidades={(unidades ?? []).map(u => u.nombre)}
          empleadoId={user.id}
          margenDefault={config?.margen_default != null ? Number(config.margen_default) * 100 : 40}
          nuevoInicial={{
            nombre: renglon.descripcion,
            proveedorId: rec.proveedor_id,
            precioCosto: costo,
            referencia: renglon.referencia ?? undefined,
            stockDesdeRecepcion: true,
          }}
        />
      </div>
    </div>
  )
}
