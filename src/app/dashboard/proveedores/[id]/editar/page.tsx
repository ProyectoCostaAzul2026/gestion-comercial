import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ProveedorForm } from '@/components/modulos/proveedor-form'

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: proveedor, error } = await supabase
    .from('proveedores')
    .select('id, nombre, contacto, telefono, email, direccion, nit_ruc, notas, logo_url, sitio_web')
    .eq('id', id)
    .single()

  if (error || !proveedor) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <BotonAtras href={`/dashboard/proveedores/${id}`} />
        <div>
          <h1 className="text-2xl font-bold text-tinta">Editar proveedor</h1>
          <p className="text-xs text-steel-300">{proveedor.nombre}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-superficie p-6">
        <ProveedorForm proveedor={proveedor} />
      </div>
    </div>
  )
}