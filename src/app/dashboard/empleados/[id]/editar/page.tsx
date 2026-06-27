import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EmpleadoForm } from '@/components/modulos/empleado-form'

export default async function EditarEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empleado, error } = await supabase
    .from('profiles')
    .select('id, nombre_completo, telefono, rol, salario_base, activo, foto_url, email')
    .eq('id', id)
    .single()

  if (error || !empleado) notFound()

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/dashboard/empleados/${id}`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-steel-900">Editar Empleado</h1>
          <p className="text-xs text-steel-500">{empleado.nombre_completo}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <EmpleadoForm empleado={empleado} />
      </div>
    </div>
  )
}