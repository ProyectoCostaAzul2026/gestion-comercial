import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PerfilProveedorAcciones } from '@/components/modulos/perfil-proveedor-acciones'
import { ProductosProveedorTable } from '@/components/modulos/productos-proveedor-table'
import { GarantiasPanel } from '@/components/modulos/garantias-panel'

const hoy = new Date().toISOString().slice(0, 10)
const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const ESTADO_FACTURA: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' },
  parcial: { label: 'Parcial', className: 'border-brand-blue/30 bg-brand-blue/20 text-brand-blue' },
  pagada: { label: 'Pagada', className: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' },
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

  const [{ data: productos }, { data: facturas }, { data: garantiasProveedor }] = await Promise.all([
    supabase
      .from('producto_proveedores')
      .select('id, precio_costo, es_proveedor_principal, referencia_proveedor, productos(id, nombre, codigo, activo, stock_actual, stock_minimo, marca, unidad_medida, familia_id, producto_familias(nombre_base))')
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
    (supabase as any)
      .from('garantias')
      .select('id, nombre_producto, cantidad, observaciones, fecha_registro, estado, productos(id)')
      .eq('proveedor_id', id)
      .order('fecha_registro', { ascending: false }),
  ])

  const pagosPendientes = (facturas ?? []).flatMap(f =>
    (f.pagos_programados_proveedor as any[]).filter(p =>
      !p.pagado && p.fecha_programada <= en7Dias
    ).map(p => ({ ...p, factura: f }))
  ).sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/proveedores" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4 text-white" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-white">{proveedor.nombre}</h1>
          {!proveedor.activo && <span className="inline-flex items-center rounded-full border border-white/10 bg-steel-700 px-2.5 py-0.5 text-xs font-semibold text-steel-300">Inactivo</span>}
        </div>
        <Link href={`/dashboard/proveedores/${id}/editar`}
          className="rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2 text-sm text-white hover:bg-white/5">
          Editar
        </Link>
      </div>

      {/* Datos */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Información</h2>
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
              <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">{label}</dt>
              <dd className="font-medium text-white">{value}</dd>
            </div>
          ) : null)}
        </dl>
      </div>

      {/* Alertas de pagos próximos */}
      {pagosPendientes.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4">
          <h2 className="font-display font-bold text-brand-yellow">Pagos programados próximos o vencidos</h2>
          {pagosPendientes.map((p: any) => (
            <div key={p.id} className="flex justify-between rounded-xl border border-white/10 bg-[#1a2430] p-2 text-sm">
              <div>
                <span className={p.fecha_programada < hoy ? 'font-medium text-brand-red' : 'text-steel-300'}>
                  {p.fecha_programada < hoy ? '⚠ Vencido — ' : ''}{p.fecha_programada}
                </span>
                {p.nota && <span className="ml-2 text-steel-500">{p.nota}</span>}
                <span className="ml-2 text-xs text-steel-500">
                  Factura #{(p.factura as any).numero_factura ?? 'S/N'}
                </span>
              </div>
              <span className="font-display font-bold text-white">${Number(p.monto).toLocaleString('es-CO')}</span>
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
            familiaId: pp.productos?.familia_id ?? null,
            familiaNombre: pp.productos?.producto_familias?.nombre_base ?? null,
          },
        }))}
      />

      {/* Facturas */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Facturas
          </h2>
          <PerfilProveedorAcciones proveedorId={id} />
        </div>

        {(facturas ?? []).length === 0 ? (
          <p className="text-sm text-steel-500">Sin facturas registradas.</p>
        ) : (
          <div className="space-y-4">
            {(facturas ?? []).map((f: any) => {
              const vencida = f.fecha_vencimiento && f.fecha_vencimiento < hoy && f.estado !== 'pagada'
              const proxima = f.fecha_vencimiento && f.fecha_vencimiento >= hoy && f.fecha_vencimiento <= en7Dias && f.estado !== 'pagada'

              return (
                <div key={f.id} className={`space-y-3 rounded-xl border p-4 ${vencida ? 'border-brand-red/30 bg-brand-red/10' : proxima ? 'border-brand-yellow/30 bg-brand-yellow/10' : 'border-white/10 bg-[#1a2430]'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">
                          {f.numero_factura ? `Factura #${f.numero_factura}` : 'Sin número'}
                        </p>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_FACTURA[f.estado]?.className ?? 'border-white/10 bg-steel-700 text-steel-300'}`}>
                          {ESTADO_FACTURA[f.estado]?.label ?? f.estado}
                        </span>
                        {vencida && <span className="inline-flex items-center rounded-full border border-brand-red/30 bg-brand-red/20 px-2.5 py-0.5 text-xs font-semibold text-brand-red">Vencida</span>}
                        {proxima && <span className="inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">Vence pronto</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-steel-300">
                        Emitida: {f.fecha_emision}
                        {f.fecha_vencimiento && ` · Vence: ${f.fecha_vencimiento}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-bold text-white">${Number(f.monto_total).toLocaleString('es-CO')}</p>
                      {Number(f.saldo_pendiente) > 0 && (
                        <p className="text-xs text-brand-red">Pendiente: ${Number(f.saldo_pendiente).toLocaleString('es-CO')}</p>
                      )}
                    </div>
                  </div>

                  {(f.pagos_programados_proveedor ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-steel-300">Pagos programados:</p>
                      {(f.pagos_programados_proveedor as any[]).map((pp: any) => (
                        <div key={pp.id} className="flex justify-between rounded-lg border border-white/10 bg-[#111820] px-2 py-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={pp.pagado ? 'text-steel-500 line-through' : pp.fecha_programada < hoy ? 'font-medium text-brand-red' : 'text-steel-300'}>
                              {pp.fecha_programada}
                            </span>
                            {pp.nota && <span className="text-steel-500">{pp.nota}</span>}
                            {pp.pagado && <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">Pagado</span>}
                          </div>
                          <span className="font-medium text-white">${Number(pp.monto).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(f.pagos_factura_proveedor ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-steel-300">Pagos realizados:</p>
                      {(f.pagos_factura_proveedor as any[]).map((p: any) => (
                        <div key={p.id} className="flex justify-between border-b border-white/8 pb-1 text-xs text-steel-300 last:border-0">
                          <span>{p.fecha_pago} · {p.metodo_pago}</span>
                          <span className="font-medium text-white">${Number(p.monto).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.estado !== 'pagada' && (
                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/dashboard/proveedores/${id}/facturas/${f.id}/pagar`}
                        className="rounded-lg border border-brand-yellow/60 px-2 py-1 text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/10"
                      >
                        Registrar pago
                      </Link>
                      <Link
                        href={`/dashboard/proveedores/${id}/facturas/${f.id}/editar`}
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-steel-300 hover:bg-white/5 hover:text-white"
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

      {/* Garantías */}
      {(garantiasProveedor ?? []).length > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">
            Garantías ({(garantiasProveedor as any[] ?? []).filter((g: any) => g.estado === 'pendiente').length} pendientes)
          </h2>
          <GarantiasPanel
            garantias={(garantiasProveedor as any) ?? []}
            proveedores={[{ id, nombre: proveedor.nombre }]}
            soloProveedor={proveedor.nombre}
          />
        </div>
      )}
    </div>
  )
}