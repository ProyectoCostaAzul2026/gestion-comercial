import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PerfilClienteCreditos } from '@/components/modulos/perfil-cliente-creditos'

export default async function PerfilClientePage({
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
    .select('id, nombre, telefono, email, nit_cc, direccion, notas, es_cliente_generico, activo')
    .eq('id', id)
    .single()

  if (error || !cliente) notFound()

  const [
    { data: ventas },
    { data: creditos },
  ] = await Promise.all([
    supabase
      .from('ventas')
      .select('id, numero_ticket, fecha, total, tipo_pago, estado')
      .eq('cliente_id', id)
      .order('fecha', { ascending: false })
      .limit(20),
    supabase
      .from('ventas_credito')
      .select(`
        id, saldo_pendiente, monto_original, fecha_pago_programada, estado, notas, created_at,
        ventas(id, numero_ticket, fecha, total),
        abonos_credito(id, monto, fuentes, observaciones, created_at)
      `)
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
  ])

  const totalDeuda = (creditos ?? [])
    .filter((c: any) => c.estado !== 'pagado')
    .reduce((s: number, c: any) => s + Number(c.saldo_pendiente), 0)

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clientes" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-extrabold tracking-tight text-steel-900">{cliente.nombre}</h1>
            <p className="text-xs text-steel-500">Perfil del cliente</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6 p-4">

        {/* Datos */}
        <dl className="space-y-3 text-sm">
          {[
            ['Teléfono', cliente.telefono ?? '—'],
            ['Email', cliente.email ?? '—'],
            ['NIT/CC', cliente.nit_cc ?? '—'],
            ['Dirección', cliente.direccion ?? '—'],
            ['Notas', cliente.notas ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-steel-500">{label}</dt>
              <dd className="text-right font-medium text-steel-900">{value}</dd>
            </div>
          ))}
        </dl>

        {!cliente.es_cliente_generico && (
          <Link
            href={`/dashboard/clientes/${cliente.id}/editar`}
            className="block w-full rounded-lg bg-steel-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-steel-800"
          >
            Editar cliente
          </Link>
        )}

        {/* Deuda total */}
        {totalDeuda > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-brand-red/30 bg-brand-red-soft p-4">
            <div>
              <p className="text-sm font-semibold text-brand-red">Saldo pendiente total</p>
              <p className="mt-0.5 text-xs text-brand-red">
                {(creditos ?? []).filter((c: any) => c.estado !== 'pagado').length} crédito(s) activo(s)
              </p>
            </div>
            <p className="font-display text-2xl font-bold text-brand-red">${totalDeuda.toLocaleString('es-CO')}</p>
          </div>
        )}

        {/* Créditos pendientes con abonos */}
        {(creditos ?? []).length > 0 && (
          <PerfilClienteCreditos creditos={creditos as any} />
        )}

        {/* Historial de compras */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-steel-900">
            <span className="h-4 w-1 rounded-full bg-brand-yellow" />
            Historial de compras ({ventas?.length ?? 0})
          </h2>
          {(ventas ?? []).length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-steel-500">
              Sin compras registradas.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Ticket</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ventas ?? []).map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link href={`/dashboard/ventas/${v.id}`} className="font-medium text-brand-blue hover:underline">
                          #{v.numero_ticket}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-steel-500">{v.fecha}</TableCell>
                      <TableCell className="text-right font-medium text-steel-900">
                        ${Number(v.total).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-sm capitalize text-steel-500">{v.tipo_pago}</TableCell>
                      <TableCell>
                        <Badge variant={
                          v.estado === 'anulada' ? 'destructive' :
                          v.estado === 'credito' ? 'secondary' : 'default'
                        }>
                          {v.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}