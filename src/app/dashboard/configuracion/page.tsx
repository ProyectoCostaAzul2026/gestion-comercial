import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracionForm } from '@/components/modulos/configuracion-form'
import { CategoriasGastoForm } from '@/components/modulos/categorias-gasto-form'
import { ServiciosGestion } from '@/components/modulos/servicios-gestion'
import { UnidadesMedidaForm } from '@/components/modulos/unidades-medida-form'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'administrador') redirect('/dashboard')

  const [{ data: config }, { data: categorias }, { data: servicios }, { data: unidades }] = await Promise.all([
    supabase.from('configuracion_negocio').select('*').single(),
    supabase.from('categorias_gasto').select('*').order('nombre'),
    supabase.from('servicios').select('id, nombre, descripcion, precio, activo').order('nombre'),
    supabase.from('unidades_medida').select('*').order('orden'),
  ])

  return (
    <div className="max-w-2xl space-y-8">
      <div className="relative py-1">
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">Configuración</h1>
        <p className="mt-0.5 text-xs text-steel-300">Solo visible para administradores.</p>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-tinta">Datos del negocio</h2>
        <ConfiguracionForm config={config as any} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-tinta">Categorías de gastos</h2>
        <CategoriasGastoForm categorias={categorias ?? []} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-tinta">Servicios</h2>
        <ServiciosGestion servicios={servicios ?? []} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-tinta">Unidades de medida</h2>
        <UnidadesMedidaForm unidades={unidades ?? []} />
      </section>
    </div>
  )
}