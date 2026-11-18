import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ProveedorForm } from '@/components/modulos/proveedor-form'

export default async function NuevoProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <BotonAtras href="/dashboard/proveedores" />
        <h1 className="font-display text-2xl font-bold text-white">Nuevo Proveedor</h1>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-6">
        <ProveedorForm />
      </div>
    </div>
  )
}