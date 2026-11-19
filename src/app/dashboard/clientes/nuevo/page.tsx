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
      <div className="sticky top-[calc(var(--alto-barra,3.5rem)+env(safe-area-inset-top))] z-20 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <div className="flex items-center gap-3">
          <BotonAtras href="/dashboard/clientes" />
          <h1 className="text-xl font-bold text-tinta">Nuevo cliente</h1>
        </div>
      </div>
      <div className="max-w-md p-4">
        <ClienteForm />
      </div>
    </div>
  )
}