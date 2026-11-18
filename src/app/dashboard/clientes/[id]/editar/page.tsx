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
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b lg:top-0 border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <BotonAtras href={`/dashboard/clientes/${id}`} />
          <div>
            <h1 className="font-display text-lg font-bold text-white">Editar Cliente</h1>
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