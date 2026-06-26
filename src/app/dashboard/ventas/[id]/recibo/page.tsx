import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
      .select('id, nombre_producto, precio_unitario, cantidad, descuento_linea, subtotal_linea, es_fraccionado, cantidad_fraccion')
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
        <Link href={`/dashboard/ventas/${id}`} className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Recibo — Ticket #{venta.numero_ticket}</h1>
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