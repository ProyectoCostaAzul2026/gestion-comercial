import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
        <Link href={`/dashboard/proveedores/${id}`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-steel-900">Editar Factura</h1>
          <p className="text-xs text-steel-500">
            {factura.numero_factura ? `#${factura.numero_factura}` : 'Sin número'}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
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
          onSuccess={() => {}}
        />
      </div>
    </div>
  )
}