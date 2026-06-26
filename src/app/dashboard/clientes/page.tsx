import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClienteTable } from '@/components/modulos/cliente-table'
import { Plus } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, email, nit_cc, es_cliente_generico')
    .eq('activo', true)
    .order('es_cliente_generico', { ascending: false })
    .order('nombre', { ascending: true })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">{clientes?.length ?? 0} clientes registrados</p>
        </div>
        <Link
          href="/dashboard/clientes/nuevo"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar cliente
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          Error al cargar clientes: {error.message}
        </p>
      )}

      <ClienteTable clientes={clientes ?? []} />
    </div>
  )
}