import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
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

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b lg:top-0 border-linea bg-fondo px-4 py-3">
        <div className="flex items-center gap-3">
          <BotonAtras href={`/dashboard/inventario/${producto.id}`} />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-tinta">Grupo de medidas</h1>
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
          categorias={categorias ?? []}
          proveedoresDisponibles={proveedores ?? []}
        />
      </div>
    </div>
  )
}
