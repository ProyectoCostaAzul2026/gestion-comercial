import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MiPerfilForm } from '@/components/modulos/mi-perfil-form'

export default async function MiPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, nombre_completo, email, telefono, rol, foto_url')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/dashboard')

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <h1 className="font-display text-3xl font-bold text-brand-yellow">Mi Perfil</h1>
        <p className="mt-0.5 text-xs text-steel-300">Tu información de cuenta</p>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>
      <MiPerfilForm perfil={perfil as any} />
    </div>
  )
}