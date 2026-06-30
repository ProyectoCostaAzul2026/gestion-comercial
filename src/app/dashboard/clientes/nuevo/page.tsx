import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClienteForm } from '@/components/modulos/cliente-form'

export default async function NuevoClientePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clientes" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <h1 className="font-display text-lg font-bold text-white">Nuevo Cliente</h1>
        </div>
      </div>
      <div className="max-w-md p-4">
        <ClienteForm />
      </div>
    </div>
  )
}