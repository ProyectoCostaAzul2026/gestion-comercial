import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InstruccionesPanel } from '@/components/modulos/instrucciones-panel'

export default async function InstruccionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  const esAdmin = (profile as any)?.rol === 'administrador'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] py-3 pl-4 pr-14 md:py-4 md:pr-28">
        <h1 className="font-display text-2xl font-bold text-brand-yellow md:text-3xl">Instrucciones</h1>
        <p className="mt-0.5 text-xs text-steel-300">Guías paso a paso de cómo usar cada parte del sistema.</p>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 overflow-hidden md:w-24">
          <div className="absolute inset-y-0 right-0 w-9 -skew-x-12 translate-x-4 bg-brand-yellow/80 md:w-20 md:translate-x-8" />
          <div className="absolute inset-y-0 right-0 w-3 -skew-x-12 translate-x-1 bg-brand-blue md:w-7" />
        </div>
      </div>

      <InstruccionesPanel esAdmin={esAdmin} />
    </div>
  )
}