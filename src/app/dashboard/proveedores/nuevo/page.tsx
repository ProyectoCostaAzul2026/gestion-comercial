import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProveedorForm } from '@/components/modulos/proveedor-form'

export default async function NuevoProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/proveedores" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4 text-white" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-white">Nuevo Proveedor</h1>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-6">
        <ProveedorForm />
      </div>
    </div>
  )
}