import { createClient } from '@/lib/supabase/server'
import { telefonoMarcable } from '@/components/modulos/avatar-iniciales'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { EnlaceA, MiniaturaProducto, rutaProducto } from '@/components/ui/producto-miniatura'
import { BotonAtras } from '@/components/ui/boton-atras'
import { Printer } from 'lucide-react'
import { VentaAcciones, type AccionVenta } from '@/components/modulos/venta-acciones'

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
  credito: 'Crédito',
}

const TITULOS_ACCION: Record<AccionVenta, string> = {
  devolver: 'Devolver productos',
  cambiar: 'Cambiar productos',
  anular: 'Anular venta',
}

export default async function VentaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ accion?: string }>
}) {
  const { id } = await params
  const { accion: accionPedida } = await searchParams
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
    { data: credito },
  ] = await Promise.all([
    supabase
      .from('venta_items')
      .select('id, nombre_producto, precio_unitario, iva_unitario, cantidad, descuento_linea, subtotal_linea, es_fraccionado, cantidad_fraccion, descuento_porcentaje, precio_cantidad_desde, producto_id, devolucion_items(cantidad, cantidad_fraccion), productos(imagen_url, producto_proveedores(proveedor_id, es_proveedor_principal, proveedores(id, nombre)))')
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
      .select('id, tipo, observacion, monto_devuelto, monto_cobrado, ajuste_credito, created_at')
      .eq('venta_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ventas_credito')
      .select('saldo_pendiente, estado, abonos_credito(fuentes)')
      .eq('venta_id', id)
      .maybeSingle(),
  ])

  const cliente = venta.clientes as any
  const empleado = venta.empleado as any
  const anuladoPor = venta.anulado_por as any

  // Base del descuento global (líneas con su descuento + servicios), como en devolver_productos y cambiar_productos
  const baseVenta =
    (items ?? []).reduce((suma, i) => suma + Number(i.subtotal_linea), 0) +
    (servicios ?? []).reduce((suma, s) => suma + Number(s.precio_aplicado), 0)

  // Venta a crédito: deuda pendiente y lo abonado (suma de las fuentes de cada abono, como anular_venta)
  const abonado = (credito?.abonos_credito ?? []).reduce((suma, a) => {
    const fuentes = Array.isArray(a.fuentes) ? (a.fuentes as { monto?: number | string }[]) : []
    return suma + fuentes.reduce((s, f) => s + Number(f.monto ?? 0), 0)
  }, 0)
  const creditoVenta = credito ? { saldoPendiente: Number(credito.saldo_pendiente), abonado } : null

  const estadoBadge =
    venta.estado === 'anulada' ? 'border-brand-red/30 bg-brand-red/20 text-sale'
    : venta.estado === 'modificada' || venta.estado === 'credito' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'
    : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'

  // Devolver, cambiar y anular tienen su propia vista (?accion=...): misma venta, solo el formulario de la acción
  const acciones = (accion: AccionVenta | undefined) => (
        <VentaAcciones
          accion={accion}
          key={JSON.stringify([(items ?? []).map(i => i.id + i.cantidad), (devoluciones ?? []).length])}
          ventaId={id}
          esAdmin={esAdmin}
          ventaTotal={Number(venta.total)}
          baseVenta={baseVenta}
          descuentoGlobalPorcentaje={venta.descuento_habilitado ? Number(venta.descuento_total_porcentaje) : 0}
          conDescuentoGlobal={(venta.descuento_habilitado ? Number(venta.descuento_total_porcentaje ?? 0) : 0) > 0 || venta.descuento_tipo === 'manual'}
          tipoPago={venta.tipo_pago}
          tieneAjustes={(devoluciones ?? []).length > 0}
          tieneServicios={(servicios ?? []).length > 0}
          credito={creditoVenta}
          items={(items ?? []).map(i => {
            const devueltos: { cantidad: number; cantidad_fraccion: number | null }[] = (i as any).devolucion_items ?? []
            const yaDevuelto = devueltos.reduce((sum, d) => sum + d.cantidad, 0)
            // Fracción que queda por devolver (redondeada para no arrastrar decimales de punto flotante)
            const fraccionRestante = Math.round(
              (Number(i.cantidad_fraccion ?? 0) - devueltos.reduce((sum, d) => sum + Number(d.cantidad_fraccion ?? 0), 0)) * 1e4,
            ) / 1e4
            const proveedoresProducto = (i as any).productos?.producto_proveedores ?? []
            const proveedorPrincipal = proveedoresProducto.find((p: any) => p.es_proveedor_principal) ?? proveedoresProducto[0]
            return {
              id: i.id,
              nombre_producto: i.nombre_producto,
              imagen_url: (i as any).productos?.imagen_url ?? null,
              cantidad: i.es_fraccionado ? i.cantidad : i.cantidad - yaDevuelto,
              cantidad_linea: i.cantidad,
              precio_unitario: Number(i.precio_unitario),
              subtotal_linea: Number(i.subtotal_linea),
              descuento_linea: Number(i.descuento_linea),
              es_fraccionado: i.es_fraccionado,
              cantidad_fraccion: i.es_fraccionado ? fraccionRestante : Number(i.cantidad_fraccion),
              cantidad_fraccion_linea: Number(i.cantidad_fraccion),
              producto_id: (i as any).producto_id,
              proveedores_producto: proveedoresProducto.map((p: any) => ({
                id: p.proveedores?.id ?? p.proveedor_id,
                nombre: p.proveedores?.nombre ?? '—',
              })),
              proveedor_preseleccionado: proveedoresProducto.length === 1 ? proveedorPrincipal?.proveedores?.id ?? '' : '',
            }
          }).filter(i => i.es_fraccionado ? i.cantidad_fraccion > 0 : i.cantidad > 0)}
        />
  )
  // Una venta con devoluciones o cambios ya no se anula (se devuelve lo que queda)
  const accionVista = esAdmin && venta.estado !== 'anulada' && accionPedida && accionPedida in TITULOS_ACCION
    && !(accionPedida === 'anular' && (devoluciones ?? []).length > 0)
    ? accionPedida as AccionVenta
    : null
  if (accionVista) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <BotonAtras href={`/dashboard/ventas/${id}`} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-tinta">{TITULOS_ACCION[accionVista]}</h1>
            <p className="text-xs text-steel-300">
              Ticket #{venta.numero_ticket} · {venta.fecha} · ${Number(venta.total).toLocaleString('es-CO')} · {METODO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}
              {cliente?.nombre ? ` · ${cliente.nombre}` : ''}
            </p>
          </div>
        </div>
        {acciones(accionVista)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <BotonAtras href="/dashboard/ventas" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-tinta">Ticket #{venta.numero_ticket}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoBadge}`}>
              {venta.estado === 'anulada' ? 'Anulada' :
               venta.estado === 'modificada' ? 'Modificada' :
               venta.estado === 'credito' ? 'Crédito' : 'Completada'}
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
      <div className="rounded-2xl bg-superficie p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-tinta">Información general</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-sm font-semibold text-suave">Cliente</dt>
            <dd className="font-medium text-tinta">{cliente?.id ? <EnlaceA href={`/dashboard/clientes/${cliente.id}`}>{cliente.nombre}</EnlaceA> : (cliente?.nombre ?? 'Mostrador')}</dd>
            {cliente?.telefono && <dd className="text-sm"><a href={`tel:${telefonoMarcable(cliente.telefono)}`} className="text-enlace underline-offset-2 hover:underline">{cliente.telefono}</a></dd>}
          </div>
          <div>
            <dt className="text-sm font-semibold text-suave">Empleado</dt>
            <dd className="text-tinta">{empleado?.nombre_completo ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-suave">Tipo de pago</dt>
            <dd className="text-tinta">{METODO_LABEL[venta.tipo_pago] ?? venta.tipo_pago}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-suave">Factura electrónica</dt>
            <dd className="text-tinta">{venta.factura_electronica ? 'Sí' : 'No'}</dd>
          </div>
          {venta.observaciones && (
            <div className="col-span-2">
              <dt className="text-sm font-semibold text-suave">Observaciones</dt>
              <dd className="text-steel-300">{venta.observaciones}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Productos */}
      <div className="rounded-2xl bg-superficie p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-tinta">Productos</h2>
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 border-b border-linea py-2.5 text-sm last:border-0">
              <div className="flex min-w-0 gap-3">
                <MiniaturaProducto url={(item as any).productos?.imagen_url} nombre={item.nombre_producto} tam="md" />
                <div className="min-w-0">
                <EnlaceA href={item.producto_id ? rutaProducto(item.producto_id) : null} className="font-semibold">
                  <span className="font-semibold text-tinta">{item.nombre_producto}</span>
                </EnlaceA>
                <p className="text-sm text-suave">
                  {item.es_fraccionado
                    ? `${item.cantidad_fraccion} (fraccionado)`
                    : `${item.cantidad} × $${Number(item.precio_unitario).toLocaleString('es-CO')}`}
                  {item.precio_cantidad_desde != null && (
                    <span className="ml-2 text-emerald-400">Precio por cantidad (desde {item.precio_cantidad_desde})</span>
                  )}
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
              </div>
              <p className="shrink-0 font-display font-bold text-tinta">
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
        <div className="rounded-2xl bg-superficie p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-tinta">Servicios</h2>
          <div className="space-y-2">
            {servicios!.map((s) => (
              <div key={s.id} className="flex justify-between border-b border-linea py-2 text-sm last:border-0">
                <span className="text-tinta">{s.nombre_servicio}</span>
                <span className="font-display font-bold text-tinta">${Number(s.precio_aplicado).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagos */}
      <div className="rounded-2xl bg-superficie p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-tinta">Pagos</h2>
        <div className="space-y-2">
          {(pagos ?? []).map((p) => (
            <div key={p.id} className="flex items-start justify-between border-b border-linea py-2 text-sm last:border-0">
              <div>
                <p className="font-medium text-tinta">{METODO_LABEL[p.metodo] ?? p.metodo}</p>
                {p.monto_recibido != null && (
                  <p className="text-xs text-steel-300">
                    Recibido: ${Number(p.monto_recibido).toLocaleString('es-CO')}
                    {Number(p.vueltas ?? 0) > 0 && (
                      <> · Vueltas: <span className="text-emerald-400">${Number(p.vueltas).toLocaleString('es-CO')}</span></>
                    )}
                  </p>
                )}
              </div>
              <span className="font-display font-bold text-tinta">${Number(p.monto).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-2xl bg-superficie p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-steel-300">Subtotal</dt>
            <dd className="text-tinta">${Number(venta.subtotal).toLocaleString('es-CO')}</dd>
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
              <dd>${Math.round(Number(venta.total_iva)).toLocaleString('es-CO')}</dd>
            </div>
          )}
          {Number(venta.monto_devolucion ?? 0) > 0 && (
            <div className="flex justify-between text-sale">
              <dt>Monto devuelto</dt>
              <dd>-${Number(venta.monto_devolucion).toLocaleString('es-CO')}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-linea pt-2 text-lg font-bold text-brand-yellow">
            <dt>Total</dt>
            <dd className="font-display">${Number(venta.total).toLocaleString('es-CO')}</dd>
          </div>
          {creditoVenta && (
            <div className="flex justify-between text-sm">
              <dt className="text-steel-300">
                Deuda pendiente{credito?.estado === 'anulado' ? ' (crédito anulado)' : ''}
              </dt>
              <dd className="font-display font-bold text-sale">${creditoVenta.saldoPendiente.toLocaleString('es-CO')}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Historial devoluciones */}
      {(devoluciones ?? []).length > 0 && (
        <div className="rounded-2xl bg-superficie p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-tinta">Historial de ajustes</h2>
          <div className="space-y-2">
            {devoluciones!.map((d) => (
              <div key={d.id} className="space-y-1 rounded-xl border border-linea bg-superficie-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${d.tipo === 'total' ? 'border-brand-red/30 bg-brand-red/20 text-sale' : 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'}`}>
                    {d.tipo === 'total' ? 'Devolución total' : d.tipo === 'parcial' ? 'Devolución parcial' : 'Cambio'}
                  </span>
                  <span className="text-xs text-steel-500">
                    {new Date(d.created_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <p className="text-steel-300">{d.observacion}</p>
                {Number(d.monto_devuelto) > 0 && (
                  <p className="text-xs text-sale">Devuelto: ${Number(d.monto_devuelto).toLocaleString('es-CO')}</p>
                )}
                {Number(d.monto_cobrado) > 0 && (
                  <p className="text-xs text-emerald-400">Cobrado adicional: ${Number(d.monto_cobrado).toLocaleString('es-CO')}</p>
                )}
                {Number(d.ajuste_credito) !== 0 && (
                  <p className="text-xs text-brand-yellow">
                    {Number(d.ajuste_credito) < 0 ? 'Descontado de la deuda' : 'Sumado a la deuda'}:
                    {' '}${Math.abs(Number(d.ajuste_credito)).toLocaleString('es-CO')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      {venta.estado !== 'anulada' && acciones(undefined)}

    </div>
  )
}