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
        <Link href="/dashboard/proveedores" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-xl font-extrabold tracking-tight text-steel-900">Nuevo Proveedor</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ProveedorForm />
      </div>
    </div>
  )
}