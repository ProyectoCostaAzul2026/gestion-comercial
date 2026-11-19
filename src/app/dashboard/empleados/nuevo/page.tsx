import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { EmpleadoForm } from '@/components/modulos/empleado-form'

export default async function NuevoEmpleadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <BotonAtras href="/dashboard/empleados" />
        <h1 className="text-2xl font-bold text-tinta">Nuevo empleado</h1>
      </div>
      <div>
        <EmpleadoForm />
      </div>
    </div>
  )
}