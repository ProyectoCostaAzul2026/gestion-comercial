import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { VentaAcciones } from '@/components/modulos/venta-acciones'

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
}

export default async function VentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  const esAdmin = profile?.rol === 'administrador'

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

  const { data: venta, error } = await supabase
    .from('ventas')
    .select(`
      id, numero_ticket, fecha, hora, total, subtotal,
      total_descuentos, total_iva, total_redondeado,
      descuento_habilitado, descuento_tipo, descuento_total_porcentaje,
      tipo_pago, estado, factura_electronica, observaciones,
      motivo_anulacion, monto_devolucion,
      clientes(id, nombre, telefono, nit_cc),
      empleado:profiles!empleado_id(nombre_completo),
      anulado_por:profiles!anulada_por(nombre_completo)
    `)
    .eq('id', id)
    .single()

  if (error || !venta) notFound()

  const [
    { data: items },
    { data: servicios },
    { data: pagos },
    { data: devoluciones },
  ] = await Promise.all([
    supabase
      .from('venta_items')
      .select('id, nombre_producto, precio_unitario, iva_unitario, cantidad, descuento_linea, subtotal_linea, es_fraccionado, cantidad_fraccion, descuento_porcentaje, producto_id, devolucion_items(cantidad), productos(producto_proveedores(proveedor_id, es_proveedor_principal, proveedores(id, nombre)))')
      .eq('venta_id', id),
    supabase
      .from('venta_servicios')
      .select('id, nombre_servicio, precio_aplicado')
      .eq('venta_id', id),
    supabase
      .from('venta_pagos')
      .select('id, metodo, monto, monto_recibido, vueltas')
      .eq('venta_id', id),
    supabase
      .from('devoluciones')
      .select('id, tipo, observacion, monto_devuelto, monto_cobrado, created_at')
      .eq('venta_id', id)
      .order('created_at', { ascending: false }),
  ])

  const cliente = venta.clientes as any
  const empleado = venta.empleado as any
  const anuladoPor = venta.anulado_por as any

  const estadoBadge =
    venta.estado === 'anulada' ? 'border-brand-red/30 bg-brand-red/20 text-brand-red'
    : venta.estado === 'modificada' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'
    : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ventas" className="rounded-xl border border-white/20 p-2 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4 text-white" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Ticket #{venta.numero_ticket}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoBadge}`}>
              {venta.estado === 'anulada' ? 'Anulada' :
               venta.estado === 'modificada' ? 'Modificada' : 'Completada'}
            </span>
          </div>
          <p className="text-xs text-steel-300">{venta.fecha} · {venta.hora?.slice(0, 5)}</p>
        </div>
        <Link
          href={`/dashboard/ventas/${id}/recibo`}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-yellow/60 px-3 py-2 text-sm font-semibold text-brand-yellow hover:bg-brand-yellow/10"
        >
          <Printer className="h-4 w-4" />
          Recibo
        </Link>
      </div>

      {/* Info general */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Información general</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Cliente</dt>
            <dd className="font-medium text-white">{cliente?.nombre ?? '—'}</dd>
            {cliente?.telefono && <dd className="text-xs text-steel-500">{cliente.telefono}</dd>}
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Empleado</dt>
            <dd className="text-white">{empleado?.nombre_completo ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Tipo de pago</dt>
            <dd className="text-white">{METODO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Factura electrónica</dt>
            <dd className="text-white">{venta.factura_electronica ? 'Sí' : 'No'}</dd>
          </div>
          {venta.observaciones && (
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Observaciones</dt>
              <dd className="text-steel-300">{venta.observaciones}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Productos */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Productos</h2>
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b border-white/8 py-2 text-sm last:border-0">
              <div>
                <p className="font-semibold text-white">{item.nombre_producto}</p>
                <p className="text-xs text-brand-yellow">
                  {item.es_fraccionado
                    ? `${item.cantidad_fraccion} (fraccionado)`
                    : `${item.cantidad} × $${Number(item.precio_unitario).toLocaleString('es-CO')}`}
                  {Number(item.descuento_linea) > 0 && (
                    <span className="ml-2 text-emerald-400">
                      Desc: -${Number(item.descuento_linea).toLocaleString('es-CO')}
                    </span>
                  )}
                </p>
                {esAdmin && Number(item.iva_unitario) > 0 && (
                  <p className="text-xs text-steel-300">
                    IVA: ${Math.round(Number(item.iva_unitario) * item.cantidad).toLocaleString('es-CO')} (informativo)
                  </p>
                )}
              </div>
              <p className="shrink-0 font-display font-bold text-white">
                ${Number(item.subtotal_linea).toLocaleString('es-CO')}
              </p>
            </div>
          ))}
          {(items ?? []).length === 0 && (
            <p className="text-sm text-steel-500">Sin productos</p>
          )}
        </div>
      </div>

      {/* Servicios */}
      {(servicios ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Servicios</h2>
          <div className="space-y-2">
            {servicios!.map((s) => (
              <div key={s.id} className="flex justify-between border-b border-white/8 py-2 text-sm last:border-0">
                <span className="text-white">{s.nombre_servicio}</span>
                <span className="font-display font-bold text-white">${Number(s.precio_aplicado).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagos */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Pagos</h2>
        <div className="space-y-2">
          {(pagos ?? []).map((p) => (
            <div key={p.id} className="flex items-start justify-between border-b border-white/8 py-2 text-sm last:border-0">
              <div>
                <p className="font-medium text-white">{METODO_LABEL[p.metodo] ?? p.metodo}</p>
                {p.monto_recibido != null && (
                  <p className="text-xs text-steel-300">
                    Recibido: ${Number(p.monto_recibido).toLocaleString('es-CO')}
                    {Number(p.vueltas ?? 0) > 0 && (
                      <> · Vueltas: <span className="text-emerald-400">${Number(p.vueltas).toLocaleString('es-CO')}</span></>
                    )}
                  </p>
                )}
              </div>
              <span className="font-display font-bold text-white">${Number(p.monto).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-steel-300">Subtotal</dt>
            <dd className="text-white">${Number(venta.subtotal).toLocaleString('es-CO')}</dd>
          </div>
          {Number(venta.total_descuentos) > 0 && (
            <div className="flex justify-between text-emerald-400">
              <dt>Descuentos</dt>
              <dd>-${Number(venta.total_descuentos).toLocaleString('es-CO')}</dd>
            </div>
          )}
          {Number(venta.total_iva) > 0 && (
            <div className="flex justify-between text-xs text-steel-300">
              <dt>IVA incluido (informativo)</dt>
              <dd>${Number(venta.total_iva).toLocaleString('es-CO')}</dd>
            </div>
          )}
          {Number(venta.monto_devolucion ?? 0) > 0 && (
            <div className="flex justify-between text-brand-red">
              <dt>Monto devuelto</dt>
              <dd>-${Number(venta.monto_devolucion).toLocaleString('es-CO')}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-white/8 pt-2 text-lg font-bold text-brand-yellow">
            <dt>Total</dt>
            <dd className="font-display">${Number(venta.total).toLocaleString('es-CO')}</dd>
          </div>
        </dl>
      </div>

      {/* Historial devoluciones */}
      {(devoluciones ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow before:block before:h-5 before:w-1 before:rounded-full before:bg-brand-yellow">Historial de ajustes</h2>
          <div className="space-y-2">
            {devoluciones!.map((d) => (
              <div key={d.id} className="space-y-1 rounded-xl border border-white/10 bg-[#1a2430] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${d.tipo === 'total' ? 'border-brand-red/30 bg-brand-red/20 text-brand-red' : 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'}`}>
                    {d.tipo === 'total' ? 'Devolución total' : d.tipo === 'parcial' ? 'Devolución parcial' : 'Cambio'}
                  </span>
                  <span className="text-xs text-steel-500">
                    {new Date(d.created_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <p className="text-steel-300">{d.observacion}</p>
                {Number(d.monto_devuelto) > 0 && (
                  <p className="text-xs text-brand-red">Devuelto: ${Number(d.monto_devuelto).toLocaleString('es-CO')}</p>
                )}
                {Number(d.monto_cobrado) > 0 && (
                  <p className="text-xs text-emerald-400">Cobrado adicional: ${Number(d.monto_cobrado).toLocaleString('es-CO')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      {venta.estado !== 'anulada' && (
        <VentaAcciones
          key={JSON.stringify((items ?? []).map(i => i.id + i.cantidad))}
          ventaId={id}
          esAdmin={esAdmin}
          ventaTotal={Number(venta.total)}
          ventaSubtotal={Number(venta.subtotal)}
          items={(items ?? []).map(i => {
            const yaDevuelto = ((i as any).devolucion_items ?? [])
              .reduce((sum: number, d: any) => sum + d.cantidad, 0)
            const proveedoresProducto = (i as any).productos?.producto_proveedores ?? []
            const proveedorPrincipal = proveedoresProducto.find((p: any) => p.es_proveedor_principal) ?? proveedoresProducto[0]
            return {
              id: i.id,
              nombre_producto: i.nombre_producto,
              cantidad: i.es_fraccionado ? i.cantidad : i.cantidad - yaDevuelto,
              precio_unitario: Number(i.precio_unitario),
              subtotal_linea: Number(i.subtotal_linea),
              es_fraccionado: i.es_fraccionado,
              cantidad_fraccion: Number(i.cantidad_fraccion),
              producto_id: (i as any).producto_id,
              proveedores_producto: proveedoresProducto.map((p: any) => ({
                id: p.proveedores?.id ?? p.proveedor_id,
                nombre: p.proveedores?.nombre ?? '—',
              })),
              proveedor_preseleccionado: proveedoresProducto.length === 1 ? proveedorPrincipal?.proveedores?.id ?? '' : '',
            }
          }).filter(i => i.es_fraccionado ? true : i.cantidad > 0)}
        />
      )}

    </div>
  )
}