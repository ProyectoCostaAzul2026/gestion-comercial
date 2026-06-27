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
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/clientes/${id}`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-extrabold tracking-tight text-steel-900">Editar Cliente</h1>
            <p className="text-xs text-steel-500">{cliente.nombre}</p>
          </div>
        </div>
      </div>
      <div className="max-w-md p-4">
        {cliente.es_cliente_generico ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            "Cliente General" es un registro del sistema y no se puede editar.
          </p>
        ) : (
          <ClienteForm cliente={cliente} />
        )}
      </div>
    </div>
  )
}