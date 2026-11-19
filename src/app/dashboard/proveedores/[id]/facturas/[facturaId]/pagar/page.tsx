import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { PagoFacturaForm } from '@/components/modulos/pago-factura-form'
import { saldosMedios } from '@/lib/caja-servidor'

export default async function PagarFacturaPage({
  params,
}: {
  params: Promise<{ id: string; facturaId: string }>
}) {
  const { id, facturaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: factura, error } = await supabase
    .from('facturas_proveedor')
    .select('id, numero_factura, monto_total, saldo_pendiente, estado')
    .eq('id', facturaId)
    .single()

  if (error || !factura) notFound()
  if (factura.estado === 'pagada') redirect(`/dashboard/proveedores/${id}`)
  const saldos = await saldosMedios(supabase)

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <BotonAtras href={`/dashboard/proveedores/${id}`} />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Registrar pago</h1>
          <p className="text-xs text-steel-300">
            {factura.numero_factura ? `Factura #${factura.numero_factura}` : 'Sin número'} ·
            Total: ${Number(factura.monto_total).toLocaleString('es-CO')}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-6">
        <PagoFacturaForm
          facturaId={facturaId}
          saldoPendiente={Number(factura.saldo_pendiente)}
          proveedorId={id}
          saldos={saldos}
        />
      </div>
    </div>
  )
}