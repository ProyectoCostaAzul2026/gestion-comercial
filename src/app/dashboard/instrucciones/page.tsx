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
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <h1 className="font-display text-3xl font-bold text-brand-yellow">Instrucciones</h1>
        <p className="mt-0.5 text-xs text-steel-300">Guías paso a paso de cómo usar cada parte del sistema.</p>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      <InstruccionesPanel esAdmin={esAdmin} />
    </div>
  )
}