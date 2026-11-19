import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { MiniaturaProducto } from '@/components/ui/producto-miniatura'
import { esAdmin } from '@/lib/permissions'
import { cargarGrupoMedidas } from '@/lib/grupo-medidas-servidor'
import { ordenarPorMedida } from '@/lib/escala-precios'
import { EscalaPrecios } from '@/components/modulos/escala-precios'

// Precios del grupo de medidas en una vista propia (solo administrador): margen, redondeo, sugeridos y precio nuevo
// por medida. El orden, los pesos y los datos del grupo siguen en la página del grupo.
export default async function PreciosGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [grupo, { data: perfil }, { data: config }] = await Promise.all([
    cargarGrupoMedidas(supabase, id),
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
    supabase.from('configuracion_negocio').select('margen_default').single(),
  ])
  if (!grupo) notFound()
  // Cambiar precios es solo del administrador: un empleado ve el grupo
  if (!esAdmin(perfil?.rol)) redirect(`/dashboard/inventario/${id}/grupo`)

  const { producto, miembros } = grupo
  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b border-linea bg-fondo px-4 py-3 lg:top-0">
        <div className="flex items-center gap-3">
          <BotonAtras href={`/dashboard/inventario/${producto.id}/grupo`} etiqueta="Volver al grupo de medidas" />
          <MiniaturaProducto url={(producto as { imagen_url?: string | null }).imagen_url ?? miembros.find(m => m.imagen_url)?.imagen_url} nombre={producto.nombre} tam="md" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-tinta">Precios del grupo</h1>
            <p className="truncate text-sm text-suave">
              {producto.nombre}{producto.marca ? `, ${producto.marca}` : ''}, {miembros.length} {miembros.length === 1 ? 'medida' : 'medidas'}
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl p-4">
        <EscalaPrecios
          miembros={ordenarPorMedida(miembros)}
          margenDefault={config?.margen_default != null ? Number(config.margen_default) * 100 : 40}
          paginaCompleta
        />
      </div>
    </div>
  )
}
