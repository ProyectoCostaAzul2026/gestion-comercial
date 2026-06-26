import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavigationShell from '@/components/layout/NavigationShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  return (
    <NavigationShell rol={profile?.rol ?? 'empleado'} nombre={profile?.nombre_completo ?? user.email ?? ''}>
      {children}
    </NavigationShell>
  )
}