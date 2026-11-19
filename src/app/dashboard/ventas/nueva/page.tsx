import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NuevaVentaForm } from '@/components/modulos/nueva-venta-form'

export default async function NuevaVentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: clienteGeneral },
    { data: catalogo },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, telefono, nit_cc, email, es_cliente_generico')
      .eq('es_cliente_generico', true)
      .single(),
    supabase
      .from('servicios')
      .select('id, nombre, descripcion, precio')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('configuracion_negocio')
      .select('max_descuento_porcentaje, whatsapp_negocio')
      .single(),
  ])

  if (!clienteGeneral) redirect('/dashboard/ventas')

  return (
    <div>
      <NuevaVentaForm
        clienteGeneral={clienteGeneral}
        catalogo={catalogo ?? []}
       maxDescuentoPct={(config as any)?.max_descuento_porcentaje ?? 0.10}
        whatsappNegocio={(config as any)?.whatsapp_negocio ?? null}
      />
    </div>
  )
}