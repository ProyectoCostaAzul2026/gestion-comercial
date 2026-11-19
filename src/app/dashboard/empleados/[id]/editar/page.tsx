import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
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
        <BotonAtras href={`/dashboard/empleados/${id}`} />
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Editar Empleado</h1>
          <p className="text-xs text-steel-300">{empleado.nombre_completo}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-linea bg-superficie p-6">
        <EmpleadoForm empleado={empleado} />
      </div>
    </div>
  )
}