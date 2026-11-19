import { createClient } from '@/lib/supabase/server'
import { telefonoMarcable } from '@/components/modulos/avatar-iniciales'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock, Pencil } from 'lucide-react'
import { Aviso } from '@/components/ui/aviso'
import { BotonAtras } from '@/components/ui/boton-atras'
import { AvatarIniciales } from '@/components/modulos/avatar-iniciales'
import { PerfilProveedorAcciones } from '@/components/modulos/perfil-proveedor-acciones'
import { ProductosProveedorTable } from '@/components/modulos/productos-proveedor-table'
import { GarantiasPanel } from '@/components/modulos/garantias-panel'
import { ETIQUETA_ESTADO_RECEPCION, type EstadoRecepcion } from '@/lib/recepcion'
import { CLASE_ESTADO_RECEPCION } from '@/components/modulos/recepcion-tipos'
import { bogotaEnDias, hoyBogota } from '@/lib/fechas'

const hoy = hoyBogota()
const en7Dias = bogotaEnDias(7)

const ESTADO_FACTURA: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' },
  parcial: { label: 'Parcial', className: 'border-brand-blue/30 bg-brand-blue/20 text-enlace' },
  pagada: { label: 'Pagada', className: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' },
}

export default async function PerfilProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: proveedor, error } = await supabase
    .from('proveedores')
    .select('id, nombre, contacto, telefono, email, direccion, nit_ruc, notas, activo, logo_url, sitio_web')
    .eq('id', id)
    .single()

  if (error || !proveedor) notFound()

  const [{ data: productos }, { data: facturas }, { data: garantiasProveedor }] = await Promise.all([
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('producto_proveedores')
        .select('id, precio_costo, es_proveedor_principal, referencia_proveedor, productos(id, nombre, codigo, imagen_url, activo, stock_actual, stock_minimo, marca, unidad_medida, familia_id, producto_familias(nombre_base))')
        .eq('proveedor_id', id)
        .order('created_at', { ascending: false })
        .order('id')
        .range(filaDesde, filaHasta)
    ),
    supabase
      .from('facturas_proveedor')
      .select(`
        id, numero_factura, fecha_emision, fecha_vencimiento,
        monto_total, monto_pagado, saldo_pendiente, estado, notas,
        pagos_factura_proveedor(id, monto, metodo_pago, fecha_pago, observaciones),
        pagos_programados_proveedor(id, monto, fecha_programada, nota, pagado),
        recepciones(id, estado)
      `)
      .eq('proveedor_id', id)
      .order('fecha_emision', { ascending: false }),
    supabase
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

  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  const ENLACE = 'text-enlace underline-offset-2 hover:underline'
  const facturasAbiertas = (facturas ?? []).filter((f: any) => f.estado !== 'pagada' && Number(f.saldo_pendiente) > 0)
  const deuda = facturasAbiertas.reduce((s: number, f: any) => s + Number(f.saldo_pendiente), 0)
  const vencidas = facturasAbiertas.filter((f: any) => f.fecha_vencimiento && f.fecha_vencimiento < hoy).length
  const datos: [string, React.ReactNode][] = [
    ['Contacto', proveedor.contacto],
    ['Teléfono', proveedor.telefono ? <a href={`tel:${telefonoMarcable(proveedor.telefono)}`} className={ENLACE}>{proveedor.telefono}</a> : null],
    ['Correo', proveedor.email ? <a href={`mailto:${proveedor.email}`} className={ENLACE}>{proveedor.email}</a> : null],
    ['NIT', proveedor.nit_ruc],
    ['Dirección', proveedor.direccion],
    ['Sitio web', proveedor.sitio_web
      ? <a href={proveedor.sitio_web.startsWith('http') ? proveedor.sitio_web : `https://${proveedor.sitio_web}`} target="_blank" rel="noopener noreferrer" className={ENLACE}>
          {proveedor.sitio_web.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      : null],
    ['Notas', proveedor.notas],
  ]

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(var(--alto-barra,3.5rem)+env(safe-area-inset-top))] z-20 flex items-center gap-3 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <BotonAtras href="/dashboard/proveedores" />
        <AvatarIniciales nombre={proveedor.nombre} foto={proveedor.logo_url} logo className="size-11 text-base" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-tinta">{proveedor.nombre}</h1>
          <p className="text-sm text-suave">Proveedor{!proveedor.activo ? ', inactivo' : ''}</p>
        </div>
        <Link href={`/dashboard/proveedores/${id}/editar`}
          className="mr-2 inline-flex h-10 items-center gap-1.5 rounded-xl border border-linea bg-superficie px-3 text-[15px] font-semibold text-tinta hover:bg-superficie-2">
          <Pencil className="size-4" strokeWidth={1.75} aria-hidden />Editar
        </Link>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-8 md:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[18px] bg-superficie p-5">
          <p className="text-[15px] font-semibold text-suave">Le debes</p>
          <p className={`cifra text-[48px] font-bold leading-none ${deuda > 0 ? 'text-sale' : 'text-tinta'}`}>{pesos(deuda)}</p>
          <p className="mt-1 text-[15px] text-suave">
            {deuda > 0
              ? `En ${facturasAbiertas.length} ${facturasAbiertas.length === 1 ? 'factura' : 'facturas'}${vencidas > 0 ? `, ${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}` : ''}. Paga desde cada factura, abajo.`
              : 'Todas las facturas están pagadas.'}
          </p>
        </section>

        <section className="space-y-2.5">
          <dl className="overflow-hidden rounded-2xl bg-superficie">
            {datos.filter(([, v]) => v).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex justify-between gap-4 border-b border-linea px-4 py-3 last:border-0">
                <dt className="text-[15px] text-suave">{etiqueta}</dt>
                <dd className="min-w-0 break-words text-right text-[15px] font-semibold text-tinta">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {pagosPendientes.length > 0 && (
        <Aviso icono={CalendarClock} titulo={`${pagosPendientes.length} ${pagosPendientes.length === 1 ? 'pago programado' : 'pagos programados'} para esta semana o vencidos`}>
          <ul className="space-y-1">
            {pagosPendientes.map((p: any) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className={p.fecha_programada < hoy ? 'font-semibold text-sale' : ''}>
                  {p.fecha_programada < hoy ? 'Vencido, ' : ''}{p.fecha_programada}, factura {(p.factura as any).numero_factura ?? 'sin número'}{p.nota ? `: ${p.nota}` : ''}
                </span>
                <span className="cifra text-base font-bold text-tinta">{pesos(Number(p.monto))}</span>
              </li>
            ))}
          </ul>
        </Aviso>
      )}

      {/* Productos asociados */}
      <ProductosProveedorTable
        proveedorTelefono={proveedor.telefono}
        proveedorNombre={proveedor.nombre}
        productos={(productos ?? []).map((pp: any) => ({
          id: pp.id,
          referencia_proveedor: pp.referencia_proveedor,
          precio_costo: Number(pp.precio_costo),
          es_proveedor_principal: pp.es_proveedor_principal,
          producto: {
            id: pp.productos?.id,
            nombre: pp.productos?.nombre ?? '—',
            imagen_url: pp.productos?.imagen_url ?? null,
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
      <div className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
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
              // La recepción de mercancía de la factura, si se abrió desde Recepción (una por factura)
              const recepcion = (Array.isArray(f.recepciones) ? f.recepciones[0] : f.recepciones) as { id: string; estado: EstadoRecepcion } | null | undefined

              return (
                <div key={f.id} className={`space-y-3 rounded-xl border p-4 ${vencida ? 'border-brand-red/30 bg-brand-red/10' : proxima ? 'border-brand-yellow/30 bg-brand-yellow/10' : 'border-linea bg-superficie-2'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-tinta">
                          {f.numero_factura ? `Factura #${f.numero_factura}` : 'Sin número'}
                        </p>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_FACTURA[f.estado]?.className ?? 'border-linea bg-steel-700 text-steel-300'}`}>
                          {ESTADO_FACTURA[f.estado]?.label ?? f.estado}
                        </span>
                        {vencida && <span className="inline-flex items-center rounded-full border border-brand-red/30 bg-brand-red/20 px-2.5 py-0.5 text-xs font-semibold text-sale">Vencida</span>}
                        {proxima && <span className="inline-flex items-center rounded-full border border-brand-yellow/30 bg-brand-yellow/20 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow">Vence pronto</span>}
                        {recepcion && (
                          <Link href={`/dashboard/recepcion/${recepcion.id}`}
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:brightness-125 ${CLASE_ESTADO_RECEPCION[recepcion.estado]}`}>
                            Recepción: {ETIQUETA_ESTADO_RECEPCION[recepcion.estado].toLowerCase()}
                          </Link>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-steel-300">
                        Emitida: {f.fecha_emision}
                        {f.fecha_vencimiento && ` · Vence: ${f.fecha_vencimiento}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-bold text-tinta">${Number(f.monto_total).toLocaleString('es-CO')}</p>
                      {Number(f.saldo_pendiente) > 0 && (
                        <p className="text-xs text-sale">Pendiente: ${Number(f.saldo_pendiente).toLocaleString('es-CO')}</p>
                      )}
                    </div>
                  </div>

                  {(f.pagos_programados_proveedor ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-steel-300">Pagos programados:</p>
                      {(f.pagos_programados_proveedor as any[]).map((pp: any) => (
                        <div key={pp.id} className="flex justify-between rounded-lg border border-linea bg-superficie px-2 py-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={pp.pagado ? 'text-steel-500 line-through' : pp.fecha_programada < hoy ? 'font-medium text-sale' : 'text-steel-300'}>
                              {pp.fecha_programada}
                            </span>
                            {pp.nota && <span className="text-steel-500">{pp.nota}</span>}
                            {pp.pagado && <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">Pagado</span>}
                          </div>
                          <span className="font-medium text-tinta">${Number(pp.monto).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(f.pagos_factura_proveedor ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-steel-300">Pagos realizados:</p>
                      {(f.pagos_factura_proveedor as any[]).map((p: any) => (
                        <div key={p.id} className="flex justify-between border-b border-linea pb-1 text-xs text-steel-300 last:border-0">
                          <span>{p.fecha_pago} · {p.metodo_pago}</span>
                          <span className="font-medium text-tinta">${Number(p.monto).toLocaleString('es-CO')}</span>
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
                        className="rounded-lg border border-linea px-2 py-1 text-xs text-steel-300 hover:bg-velo/5 hover:text-tinta"
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
        <div className="space-y-3 rounded-2xl bg-superficie p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
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
    </div>
  )
}