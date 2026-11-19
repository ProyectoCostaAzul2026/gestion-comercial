import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { MiniaturaProducto } from '@/components/ui/producto-miniatura'
import { esAdmin } from '@/lib/permissions'
import { GrupoMedidasPanel } from '@/components/modulos/grupo-medidas-panel'
import { cargarGrupoMedidas } from '@/lib/grupo-medidas-servidor'

export default async function GrupoMedidasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [grupo, { data: perfil }, { data: categorias }, { data: proveedores }] = await Promise.all([
    cargarGrupoMedidas(supabase, id),
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ])
  if (!grupo) notFound()
  const { producto, miembros } = grupo
  const fotoGrupo = (producto as { imagen_url?: string | null }).imagen_url ?? miembros.find(m => m.imagen_url)?.imagen_url ?? null

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(var(--alto-barra,3.5rem)+env(safe-area-inset-top))] z-20 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <div className="flex items-center gap-3">
          <BotonAtras href={`/dashboard/inventario/${producto.id}`} />
          {/* Un grupo de medidas lleva una sola foto, arriba */}
          <MiniaturaProducto url={fotoGrupo} nombre={producto.nombre} tam="md" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-tinta">{producto.nombre}</h1>
            <p className="truncate text-sm text-suave">
              Grupo de medidas{producto.marca ? `, ${producto.marca}` : ''}, {miembros.length} {miembros.length === 1 ? 'medida' : 'medidas'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-4">
        <GrupoMedidasPanel
          productoActualId={producto.id}
          miembrosIniciales={miembros}
          esAdmin={esAdmin(perfil?.rol)}
          categorias={categorias ?? []}
          proveedoresDisponibles={proveedores ?? []}
        />
      </div>
    </div>
  )
}
