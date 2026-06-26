import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
      .select('id, nombre_producto, precio_unitario, iva_unitario, cantidad, descuento_linea, subtotal_linea, es_fraccionado, cantidad_fraccion, descuento_porcentaje, devolucion_items(cantidad)')
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

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ventas" className="rounded-md border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Ticket #{venta.numero_ticket}</h1>
            <Badge variant={
              venta.estado === 'anulada' ? 'destructive' :
              venta.estado === 'modificada' ? 'secondary' : 'default'
            }>
              {venta.estado === 'anulada' ? 'Anulada' :
               venta.estado === 'modificada' ? 'Modificada' : 'Completada'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">{venta.fecha} · {venta.hora?.slice(0, 5)}</p>
        </div>
        <Link
          href={`/dashboard/ventas/${id}/recibo`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Recibo
        </Link>
      </div>

      {/* Info general */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Información general</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Cliente</dt>
            <dd className="font-medium">{cliente?.nombre ?? '—'}</dd>
            {cliente?.telefono && <dd className="text-xs text-slate-400">{cliente.telefono}</dd>}
          </div>
          <div>
            <dt className="text-xs text-slate-500">Empleado</dt>
            <dd>{empleado?.nombre_completo ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tipo de pago</dt>
            <dd>{METODO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Factura electrónica</dt>
            <dd>{venta.factura_electronica ? 'Sí' : 'No'}</dd>
          </div>
          {venta.observaciones && (
            <div className="col-span-2">
              <dt className="text-xs text-slate-500">Observaciones</dt>
              <dd className="text-slate-700">{venta.observaciones}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Productos */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Productos</h2>
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b py-2 last:border-0 text-sm">
              <div>
                <p className="font-medium">{item.nombre_producto}</p>
                <p className="text-xs text-slate-500">
                  {item.es_fraccionado
                    ? `${item.cantidad_fraccion} (fraccionado)`
                    : `${item.cantidad} × $${Number(item.precio_unitario).toLocaleString('es-CO')}`}
                  {Number(item.descuento_linea) > 0 && (
                    <span className="ml-2 text-green-700">
                      Desc: -${Number(item.descuento_linea).toLocaleString('es-CO')}
                    </span>
                  )}
                </p>
                {esAdmin && Number(item.iva_unitario) > 0 && (
                  <p className="text-xs text-slate-400">
                    IVA: ${Math.round(Number(item.iva_unitario) * item.cantidad).toLocaleString('es-CO')} (informativo)
                  </p>
                )}
              </div>
              <p className="shrink-0 font-medium">
                ${Number(item.subtotal_linea).toLocaleString('es-CO')}
              </p>
            </div>
          ))}
          {(items ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Sin productos</p>
          )}
        </div>
      </div>

      {/* Servicios */}
      {(servicios ?? []).length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Servicios</h2>
          <div className="space-y-2">
            {servicios!.map((s) => (
              <div key={s.id} className="flex justify-between border-b py-2 last:border-0 text-sm">
                <span>{s.nombre_servicio}</span>
                <span className="font-medium">${Number(s.precio_aplicado).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagos */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Pagos</h2>
        <div className="space-y-2">
          {(pagos ?? []).map((p) => (
            <div key={p.id} className="flex items-start justify-between border-b py-2 last:border-0 text-sm">
              <div>
                <p className="font-medium">{METODO_LABEL[p.metodo] ?? p.metodo}</p>
                {p.monto_recibido != null && (
                  <p className="text-xs text-slate-500">
                    Recibido: ${Number(p.monto_recibido).toLocaleString('es-CO')}
                    {Number(p.vueltas ?? 0) > 0 && (
                      <> · Vueltas: <span className="text-green-700">${Number(p.vueltas).toLocaleString('es-CO')}</span></>
                    )}
                  </p>
                )}
              </div>
              <span className="font-medium">${Number(p.monto).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-lg border bg-white p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd>${Number(venta.subtotal).toLocaleString('es-CO')}</dd>
          </div>
          {Number(venta.total_descuentos) > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Descuentos</dt>
              <dd>-${Number(venta.total_descuentos).toLocaleString('es-CO')}</dd>
            </div>
          )}
          {Number(venta.total_iva) > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <dt>IVA incluido (informativo)</dt>
              <dd>${Number(venta.total_iva).toLocaleString('es-CO')}</dd>
            </div>
          )}
          {Number(venta.monto_devolucion ?? 0) > 0 && (
            <div className="flex justify-between text-red-600">
              <dt>Monto devuelto</dt>
              <dd>-${Number(venta.monto_devolucion).toLocaleString('es-CO')}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>${Number(venta.total).toLocaleString('es-CO')}</dd>
          </div>
        </dl>
      </div>

      {/* Historial devoluciones */}
      {(devoluciones ?? []).length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Historial de ajustes</h2>
          <div className="space-y-2">
            {devoluciones!.map((d) => (
              <div key={d.id} className="rounded-md bg-slate-50 p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={d.tipo === 'total' ? 'destructive' : 'secondary'} className="text-xs">
                    {d.tipo === 'total' ? 'Devolución total' : d.tipo === 'parcial' ? 'Devolución parcial' : 'Cambio'}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {new Date(d.created_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <p className="text-slate-600">{d.observacion}</p>
                {Number(d.monto_devuelto) > 0 && (
                  <p className="text-xs text-red-600">Devuelto: ${Number(d.monto_devuelto).toLocaleString('es-CO')}</p>
                )}
                {Number(d.monto_cobrado) > 0 && (
                  <p className="text-xs text-green-700">Cobrado adicional: ${Number(d.monto_cobrado).toLocaleString('es-CO')}</p>
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
            return {
              id: i.id,
              nombre_producto: i.nombre_producto,
              cantidad: i.es_fraccionado ? i.cantidad : i.cantidad - yaDevuelto,
              precio_unitario: Number(i.precio_unitario),
              subtotal_linea: Number(i.subtotal_linea),
              es_fraccionado: i.es_fraccionado,
              cantidad_fraccion: Number(i.cantidad_fraccion),
            }
          }).filter(i => i.es_fraccionado ? true : i.cantidad > 0)}
        />
      )}

    </div>
  )
}