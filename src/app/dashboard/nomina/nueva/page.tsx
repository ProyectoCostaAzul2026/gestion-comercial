import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NominaNuevaForm } from '@/components/modulos/nomina-nueva-form'

export default async function NuevaNominaPage({
  searchParams,
}: {
  searchParams: Promise<{
    empleado?: string
    fecha?: string
    horas?: string
    salario?: string
  }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empleados } = await supabase
    .from('profiles')
    .select('id, nombre_completo, salario_base')
    .eq('activo', true)
    .order('nombre_completo')

  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/nomina" className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Registrar pago de nómina</h1>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <NominaNuevaForm
          empleados={empleados ?? []}
          inicial={{
            empleado_id: sp.empleado ?? '',
            fecha: sp.fecha ?? hoy,
            horas_trabajadas: sp.horas ? parseFloat(sp.horas) : null,
            salario_base: sp.salario ? parseFloat(sp.salario) : null,
          }}
        />
      </div>
    </div>
  )
}