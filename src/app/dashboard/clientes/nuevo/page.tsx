import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ClienteForm } from '@/components/modulos/cliente-form'

export default async function NuevoClientePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b lg:top-0 border-linea bg-fondo px-4 py-3">
        <div className="flex items-center gap-3">
          <BotonAtras href="/dashboard/clientes" />
          <h1 className="font-display text-lg font-bold text-tinta">Nuevo Cliente</h1>
        </div>
      </div>
      <div className="max-w-md p-4">
        <ClienteForm />
      </div>
    </div>
  )
}