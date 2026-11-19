import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ClienteForm } from '@/components/modulos/cliente-form'

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, email, nit_cc, direccion, notas, es_cliente_generico')
    .eq('id', id)
    .single()

  if (error || !cliente) notFound()

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(var(--alto-barra,3.5rem)+env(safe-area-inset-top))] z-20 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <div className="flex items-center gap-3">
          <BotonAtras href={`/dashboard/clientes/${id}`} />
          <div>
            <h1 className="text-xl font-bold text-tinta">Editar cliente</h1>
            <p className="text-xs text-steel-300">{cliente.nombre}</p>
          </div>
        </div>
      </div>
      <div className="max-w-md p-4">
        {cliente.es_cliente_generico ? (
          <p className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4 text-sm text-brand-yellow">
            "Cliente General" es un registro del sistema y no se puede editar.
          </p>
        ) : (
          <ClienteForm cliente={cliente} />
        )}
      </div>
    </div>
  )
}