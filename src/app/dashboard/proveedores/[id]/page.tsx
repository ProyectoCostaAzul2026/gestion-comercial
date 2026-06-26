import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PerfilProveedorAcciones } from '@/components/modulos/perfil-proveedor-acciones'
import { ProductosProveedorTable } from '@/components/modulos/productos-proveedor-table'

const hoy = new Date().toISOString().slice(0, 10)
const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const ESTADO_FACTURA: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  parcial: { label: 'Parcial', variant: 'default' },
  pagada: { label: 'Pagada', variant: 'default' },
}

export default async function PerfilProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: proveedor, error } = await supabase
    .from('proveedores')
    .select('id, nombre, contacto, telefono, email, direccion, nit_ruc, notas, activo')
    .eq('id', id)
    .single()

  if (error || !proveedor) notFound()

  const [{ data: productos }, { data: facturas }] = await Promise.all([
    supabase
      .from('producto_proveedores')
      .select('id, precio_costo, es_proveedor_principal, referencia_proveedor, productos(id, nombre, codigo, activo, stock_actual, stock_minimo, marca, unidad_medida)')
      .eq('proveedor_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('facturas_proveedor')
      .select(`
        id, numero_factura, fecha_emision, fecha_vencimiento,
        monto_total, monto_pagado, saldo_pendiente, estado, notas,
        pagos_factura_proveedor(id, monto, metodo_pago, fecha_pago, observaciones),
        pagos_programados_proveedor(id, monto, fecha_programada, nota, pagado)
      `)
      .eq('proveedor_id', id)
      .order('fecha_emision', { ascending: false }),
  ])

  const pagosPendientes = (facturas ?? []).flatMap(f =>
    (f.pagos_programados_proveedor as any[]).filter(p =>
      !p.pagado && p.fecha_programada <= en7Dias
    ).map(p => ({ ...p, factura: f }))
  ).sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/proveedores" className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{proveedor.nombre}</h1>
          {!proveedor.activo && <Badge variant="secondary">Inactivo</Badge>}
        </div>
        <Link href={`/dashboard/proveedores/${id}/editar`}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
          Editar
        </Link>
      </div>

      {/* Datos */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Información</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Contacto', proveedor.contacto],
            ['NIT/RUC', proveedor.nit_ruc],
            ['Teléfono', proveedor.telefono],
            ['Email', proveedor.email],
            ['Dirección', proveedor.direccion],
            ['Notas', proveedor.notas],
          ].map(([label, value]) => value ? (
            <div key={label as string}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ) : null)}
        </dl>
      </div>

      {/* Alertas de pagos próximos */}
      {pagosPendientes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h2 className="font-semibold text-amber-800">Pagos programados próximos o vencidos</h2>
          {pagosPendientes.map((p: any) => (
            <div key={p.id} className="flex justify-between text-sm rounded-md bg-white border p-2">
              <div>
                <span className={p.fecha_programada < hoy ? 'text-red-600 font-medium' : 'text-slate-700'}>
                  {p.fecha_programada < hoy ? '⚠ Vencido — ' : ''}{p.fecha_programada}
                </span>
                {p.nota && <span className="ml-2 text-slate-400">{p.nota}</span>}
                <span className="ml-2 text-xs text-slate-400">
                  Factura #{(p.factura as any).numero_factura ?? 'S/N'}
                </span>
              </div>
              <span className="font-medium">${Number(p.monto).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Productos asociados */}
    <ProductosProveedorTable
        proveedorNombre={proveedor.nombre}
        productos={(productos ?? []).map((pp: any) => ({
          id: pp.id,
          referencia_proveedor: pp.referencia_proveedor,
          precio_costo: Number(pp.precio_costo),
          es_proveedor_principal: pp.es_proveedor_principal,
          producto: {
            id: pp.productos?.id,
            nombre: pp.productos?.nombre ?? '—',
            codigo: pp.productos?.codigo,
            activo: pp.productos?.activo,
            stock_actual: pp.productos?.stock_actual ?? 0,
            stock_minimo: pp.productos?.stock_minimo ?? 0,
            marca: pp.productos?.marca ?? null,
            unidad_medida: pp.productos?.unidad_medida ?? null,
          },
        }))}
      />

      {/* Facturas */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Facturas</h2>
          <PerfilProveedorAcciones proveedorId={id} />
        </div>

        {(facturas ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">Sin facturas registradas.</p>
        ) : (
          <div className="space-y-4">
            {(facturas ?? []).map((f: any) => {
              const vencida = f.fecha_vencimiento && f.fecha_vencimiento < hoy && f.estado !== 'pagada'
              const proxima = f.fecha_vencimiento && f.fecha_vencimiento >= hoy && f.fecha_vencimiento <= en7Dias && f.estado !== 'pagada'

              return (
                <div key={f.id} className={`rounded-lg border p-4 space-y-3 ${vencida ? 'border-red-200 bg-red-50' : proxima ? 'border-amber-200 bg-amber-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">
                          {f.numero_factura ? `Factura #${f.numero_factura}` : 'Sin número'}
                        </p>
                        <Badge variant={ESTADO_FACTURA[f.estado]?.variant ?? 'secondary'}>
                          {ESTADO_FACTURA[f.estado]?.label ?? f.estado}
                        </Badge>
                        {vencida && <Badge variant="destructive">Vencida</Badge>}
                        {proxima && <Badge className="bg-amber-100 text-amber-800">Vence pronto</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Emitida: {f.fecha_emision}
                        {f.fecha_vencimiento && ` · Vence: ${f.fecha_vencimiento}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">${Number(f.monto_total).toLocaleString('es-CO')}</p>
                      {Number(f.saldo_pendiente) > 0 && (
                        <p className="text-xs text-red-600">Pendiente: ${Number(f.saldo_pendiente).toLocaleString('es-CO')}</p>
                      )}
                    </div>
                  </div>

                  {(f.pagos_programados_proveedor ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Pagos programados:</p>
                      {(f.pagos_programados_proveedor as any[]).map((pp: any) => (
                        <div key={pp.id} className="flex justify-between text-xs rounded-md bg-white border px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className={pp.pagado ? 'line-through text-slate-400' : pp.fecha_programada < hoy ? 'text-red-600 font-medium' : 'text-slate-700'}>
                              {pp.fecha_programada}
                            </span>
                            {pp.nota && <span className="text-slate-400">{pp.nota}</span>}
                            {pp.pagado && <Badge className="text-xs bg-green-100 text-green-700">Pagado</Badge>}
                          </div>
                          <span className="font-medium">${Number(pp.monto).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(f.pagos_factura_proveedor ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Pagos realizados:</p>
                      {(f.pagos_factura_proveedor as any[]).map((p: any) => (
                        <div key={p.id} className="flex justify-between text-xs text-slate-600 border-b pb-1 last:border-0">
                          <span>{p.fecha_pago} · {p.metodo_pago}</span>
                          <span className="font-medium">${Number(p.monto).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.estado !== 'pagada' && (
                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/dashboard/proveedores/${id}/facturas/${f.id}/pagar`}
                        className="text-xs text-slate-600 hover:underline border rounded px-2 py-1 hover:bg-white"
                      >
                        Registrar pago
                      </Link>
                      <Link
                        href={`/dashboard/proveedores/${id}/facturas/${f.id}/editar`}
                        className="text-xs text-slate-500 hover:underline border rounded px-2 py-1 hover:bg-white"
                      >
                        Editar factura
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}