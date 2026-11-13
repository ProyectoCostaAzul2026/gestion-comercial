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
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] py-3 pl-4 pr-14 md:py-4 md:pr-28">
        <h1 className="font-display text-2xl font-bold text-brand-yellow md:text-3xl">Configuración</h1>
        <p className="mt-0.5 text-xs text-steel-300">Solo visible para administradores.</p>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 overflow-hidden md:w-24">
          <div className="absolute inset-y-0 right-0 w-9 -skew-x-12 translate-x-4 bg-brand-yellow/80 md:w-20 md:translate-x-8" />
          <div className="absolute inset-y-0 right-0 w-3 -skew-x-12 translate-x-1 bg-brand-blue md:w-7" />
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Datos del negocio</h2>
        <ConfiguracionForm config={config as any} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Categorías de gastos</h2>
        <CategoriasGastoForm categorias={categorias ?? []} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Servicios</h2>
        <ServiciosGestion servicios={servicios ?? []} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Unidades de medida</h2>
        <UnidadesMedidaForm unidades={unidades ?? []} />
      </section>
    </div>
  )
}