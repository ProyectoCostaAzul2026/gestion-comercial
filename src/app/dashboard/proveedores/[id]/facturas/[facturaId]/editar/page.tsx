import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { FacturaProveedorForm } from '@/components/modulos/factura-proveedor-form'

export default async function EditarFacturaPage({
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
    .select(`
      id, numero_factura, fecha_emision, fecha_vencimiento,
      monto_total, notas,
      pagos_programados_proveedor(id, monto, fecha_programada, nota, pagado)
    `)
    .eq('id', facturaId)
    .single()

  if (error || !factura) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <BotonAtras href={`/dashboard/proveedores/${id}`} />
        <div>
          <h1 className="text-2xl font-bold text-tinta">Editar factura</h1>
          <p className="text-xs text-steel-300">
            {factura.numero_factura ? `#${factura.numero_factura}` : 'Sin número'}
          </p>
        </div>
      </div>
      <div>
        <FacturaProveedorForm
          proveedorId={id}
          facturaId={facturaId}
          inicial={{
            numero_factura: factura.numero_factura ?? '',
            fecha_emision: factura.fecha_emision,
            fecha_vencimiento: factura.fecha_vencimiento ?? '',
            monto_total: Number(factura.monto_total),
            notas: factura.notas ?? '',
            pagos_programados: (factura.pagos_programados_proveedor as any[]).map(p => ({
              id: p.id,
              monto: Number(p.monto),
              fecha_programada: p.fecha_programada,
              nota: p.nota,
            })),
          }}
        />
      </div>
    </div>
  )
}