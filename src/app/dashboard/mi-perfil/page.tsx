import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_TEMA, leerTema } from '@/lib/tema'
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
      <div className="mb-6 relative py-1">
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">Mi perfil</h1>
        <p className="mt-0.5 text-xs text-steel-300">Tu información de cuenta</p>
      </div>
      <MiPerfilForm perfil={perfil as any} temaInicial={leerTema((await cookies()).get(COOKIE_TEMA)?.value)} />
    </div>
  )
}