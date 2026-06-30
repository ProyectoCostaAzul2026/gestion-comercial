import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/clientes/${id}`} className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
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