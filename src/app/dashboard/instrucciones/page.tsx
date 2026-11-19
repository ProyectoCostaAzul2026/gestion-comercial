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
      <div className="relative py-1">
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">Instrucciones</h1>
        <p className="mt-0.5 text-xs text-steel-300">Guías paso a paso de cómo usar cada parte del sistema.</p>
      </div>

      <InstruccionesPanel esAdmin={esAdmin} />
    </div>
  )
}