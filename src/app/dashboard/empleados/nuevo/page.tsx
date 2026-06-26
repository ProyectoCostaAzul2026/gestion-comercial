import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EmpleadoForm } from '@/components/modulos/empleado-form'

export default async function NuevoEmpleadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/empleados" className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Nuevo Empleado</h1>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <EmpleadoForm />
      </div>
    </div>
  )
}