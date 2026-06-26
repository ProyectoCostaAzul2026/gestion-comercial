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
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clientes" className="rounded-md border p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Nuevo Cliente</h1>
        </div>
      </div>
      <div className="max-w-md p-4">
        <ClienteForm />
      </div>
    </div>
  )
}