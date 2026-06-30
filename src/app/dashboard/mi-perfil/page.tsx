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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">Mi Perfil</h1>
        <p className="mt-1 text-sm text-steel-500">Tu información de cuenta</p>
      </div>
      <MiPerfilForm perfil={perfil as any} />
    </div>
  )
}