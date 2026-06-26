import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProveedorForm } from '@/components/modulos/proveedor-form'

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: proveedor, error } = await supabase
    .from('proveedores')
    .select('id, nombre, contacto, telefono, email, direccion, nit_ruc, notas')
    .eq('id', id)
    .single()

  if (error || !proveedor) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/dashboard/proveedores/${id}`} className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editar Proveedor</h1>
          <p className="text-xs text-slate-500">{proveedor.nombre}</p>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <ProveedorForm proveedor={proveedor} />
      </div>
    </div>
  )
}