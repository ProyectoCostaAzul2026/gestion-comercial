import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracionForm } from '@/components/modulos/configuracion-form'
import { CategoriasGastoForm } from '@/components/modulos/categorias-gasto-form'
import { ServiciosGestion } from '@/components/modulos/servicios-gestion'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'administrador') redirect('/dashboard')

  const [{ data: config }, { data: categorias }, { data: servicios }] = await Promise.all([
    supabase.from('configuracion_negocio').select('*').single(),
    supabase.from('categorias_gasto').select('*').order('nombre'),
    supabase.from('servicios').select('id, nombre, descripcion, precio, activo').order('nombre'),
  ])

  return (
    <div className="max-w-2xl space-y-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">Solo visible para administradores.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Datos del negocio</h2>
        <ConfiguracionForm config={config as any} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Categorías de gastos</h2>
        <CategoriasGastoForm categorias={categorias ?? []} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Servicios</h2>
        <ServiciosGestion servicios={servicios ?? []} />
      </section>
    </div>
  )
}