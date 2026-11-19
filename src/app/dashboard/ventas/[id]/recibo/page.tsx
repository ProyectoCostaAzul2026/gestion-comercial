import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { ReciboView } from '@/components/modulos/recibo-view'

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: venta, error },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('ventas')
      .select(`
        id, numero_ticket, fecha, hora, total, subtotal,
        total_descuentos, total_iva, tipo_pago, estado,
        factura_electronica, observaciones,
        clientes(nombre, telefono, nit_cc),
        empleado:profiles!empleado_id(nombre_completo)
      `)
      .eq('id', id)
      .single(),
    supabase.from('configuracion_negocio').select('*').single(),
  ])

  if (error || !venta) notFound()

  const [{ data: items }, { data: servicios }, { data: pagos }] = await Promise.all([
    supabase
      .from('venta_items')
      .select('id, nombre_producto, precio_unitario, cantidad, descuento_linea, subtotal_linea, es_fraccionado, cantidad_fraccion, precio_cantidad_desde')
      .eq('venta_id', id),
    supabase
      .from('venta_servicios')
      .select('id, nombre_servicio, precio_aplicado')
      .eq('venta_id', id),
    supabase
      .from('venta_pagos')
      .select('id, metodo, monto')
      .eq('venta_id', id),
  ])

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <BotonAtras href={`/dashboard/ventas/${id}`} />
        <h1 className="font-display text-lg font-bold text-tinta">Recibo — Ticket #{venta.numero_ticket}</h1>
      </div>

      <ReciboView
        venta={venta as any}
        items={items ?? []}
        servicios={servicios ?? []}
        pagos={pagos ?? []}
        config={config}
      />
    </div>
  )
}