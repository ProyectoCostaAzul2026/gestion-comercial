import { createClient } from '@/lib/supabase/server'
import { AvatarIniciales, telefonoMarcable } from '@/components/modulos/avatar-iniciales'
import { Pencil } from 'lucide-react'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BotonAtras } from '@/components/ui/boton-atras'
import { EmpleadoFiltros } from '@/components/modulos/empleado-filtros'
import { hoyBogota } from '@/lib/fechas'

export default async function PerfilEmpleadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    venta_desde?: string
    venta_hasta?: string
    nomina_desde?: string
    nomina_hasta?: string
  }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empleado, error } = await supabase
    .from('profiles')
    .select('id, nombre_completo, rol, telefono, salario_base, activo, created_at')
    .eq('id', id)
    .single()

  if (error || !empleado) notFound()

  const hoy = hoyBogota()
  const inicioMes = hoy.slice(0, 8) + '01'

  // Ventas
  let ventasQuery = supabase
    .from('ventas')
    .select('id, numero_ticket, fecha, total, tipo_pago, estado')
    .eq('empleado_id', id)
    .order('fecha', { ascending: false })
    .limit(50)

  if (sp.venta_desde) ventasQuery = ventasQuery.gte('fecha', sp.venta_desde)
  if (sp.venta_hasta) ventasQuery = ventasQuery.lte('fecha', sp.venta_hasta)

  // Nóminas
  let nominasQuery = supabase
    .from('nominas')
    .select('id, periodo_inicio, periodo_fin, total_pago, estado, fecha_pago, horas_trabajadas')
    .eq('empleado_id', id)
    .order('periodo_inicio', { ascending: false })

  if (sp.nomina_desde) nominasQuery = nominasQuery.gte('periodo_inicio', sp.nomina_desde)
  if (sp.nomina_hasta) nominasQuery = nominasQuery.lte('periodo_inicio', sp.nomina_hasta)

  const [{ data: ventas }, { data: nominas }, { data: ventasHoy }, { data: ventasMes }] = await Promise.all([
    ventasQuery,
    nominasQuery,
    supabase
      .from('ventas')
      .select('total')
      .eq('empleado_id', id)
      .eq('fecha', hoy)
      .in('estado', ['completada', 'modificada']),
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('ventas')
        .select('total')
        .eq('empleado_id', id)
        .gte('fecha', inicioMes)
        .lte('fecha', hoy)
        .in('estado', ['completada', 'modificada'])
        .order('id')
        .range(filaDesde, filaHasta)
    ),
  ])

  const totalVentasHoy = (ventasHoy ?? []).reduce((s, v) => s + Number(v.total), 0)
  const numVentasHoy = ventasHoy?.length ?? 0
  const totalVentasMes = (ventasMes ?? []).reduce((s, v) => s + Number(v.total), 0)
  const numVentasMes = ventasMes?.length ?? 0

  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  const TITULO = 'text-lg font-bold text-tinta'
  const CHIP_ESTADO = (bien: boolean) => bien
    ? 'bg-[color-mix(in_oklab,var(--entra)_13%,transparent)] text-entra'
    : 'bg-realce text-suave'

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(var(--alto-barra,3.5rem)+env(safe-area-inset-top))] z-20 flex items-center gap-3 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <BotonAtras href="/dashboard/empleados" />
        <AvatarIniciales nombre={empleado.nombre_completo} className="size-11 text-base" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-tinta">{empleado.nombre_completo}</h1>
          <p className="flex items-center gap-2 text-sm text-suave">
            <span>{empleado.rol === 'administrador' ? 'Administrador' : 'Empleado'}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP_ESTADO(!!empleado.activo)}`}>{empleado.activo ? 'Activo' : 'Inactivo'}</span>
          </p>
        </div>
        <Link href={`/dashboard/empleados/${id}/editar`}
          className="mr-2 inline-flex h-10 items-center gap-1.5 rounded-xl border border-linea bg-superficie px-3 text-[15px] font-semibold text-tinta hover:bg-superficie-2">
          <Pencil className="size-4" strokeWidth={1.75} aria-hidden />Editar
        </Link>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-8 md:px-6 lg:grid-cols-2">
        <div className="space-y-5">
          <section className="rounded-[18px] bg-superficie p-5">
            <p className="text-[15px] font-semibold text-suave">Ha vendido este mes</p>
            <p className="cifra text-[48px] font-bold leading-none text-tinta">{pesos(totalVentasMes)}</p>
            <p className="mt-1 text-[15px] text-suave">
              {numVentasMes} {numVentasMes === 1 ? 'venta' : 'ventas'}. {numVentasHoy > 0 ? <>Hoy: <span className="cifra text-lg font-bold text-tinta">{pesos(totalVentasHoy)}</span> en {numVentasHoy} {numVentasHoy === 1 ? 'venta' : 'ventas'}.</> : 'Hoy aún no ha vendido.'}
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className={TITULO}>Datos</h2>
            <dl className="overflow-hidden rounded-2xl bg-superficie">
              <div className="flex justify-between gap-4 border-b border-linea px-4 py-3">
                <dt className="text-[15px] text-suave">Teléfono</dt>
                <dd className="text-[15px] font-semibold text-tinta">{empleado.telefono
                  ? <a href={`tel:${telefonoMarcable(empleado.telefono)}`} className="text-enlace underline-offset-2 hover:underline">{empleado.telefono}</a>
                  : <span className="font-normal text-tenue">Sin dato</span>}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-[15px] text-suave">Salario base por día</dt>
                <dd className="cifra text-lg font-bold text-tinta">{empleado.salario_base ? pesos(Number(empleado.salario_base)) : 'Sin dato'}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2.5">
            <h2 className={TITULO}>Nómina ({(nominas ?? []).length})</h2>
            <EmpleadoFiltros desdeKey="nomina_desde" hastaKey="nomina_hasta" desdeValue={sp.nomina_desde ?? ''} hastaValue={sp.nomina_hasta ?? ''} />
            {(nominas ?? []).length === 0 ? (
              <p className="rounded-2xl bg-superficie px-4 py-8 text-center text-[15px] text-suave">No hay pagos de nómina en estas fechas.</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl bg-superficie">
                {(nominas ?? []).map(n => (
                  <li key={n.id} className="flex items-center gap-3 border-b border-linea px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-tinta">{n.periodo_inicio}</p>
                      <p className="text-sm text-suave">{n.horas_trabajadas != null ? `${n.horas_trabajadas} horas` : 'Sin horas'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${CHIP_ESTADO(n.estado === 'pagada')}`}>{n.estado === 'pagada' ? 'Pagada' : 'Pendiente'}</span>
                    <span className="cifra text-xl font-bold text-tinta">{pesos(Number(n.total_pago))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="space-y-2.5">
          <h2 className={TITULO}>Ventas ({(ventas ?? []).length})</h2>
          <EmpleadoFiltros desdeKey="venta_desde" hastaKey="venta_hasta" desdeValue={sp.venta_desde ?? ''} hastaValue={sp.venta_hasta ?? ''} />
          {(ventas ?? []).length === 0 ? (
            <p className="rounded-2xl bg-superficie px-4 py-8 text-center text-[15px] text-suave">No tiene ventas en estas fechas.</p>
          ) : (
            <ul className="overflow-hidden rounded-2xl bg-superficie">
              {(ventas ?? []).map(v => (
                <li key={v.id} className="border-b border-linea last:border-0">
                  <Link href={`/dashboard/ventas/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-velo/5">
                    <MedioPagoIcono medio={v.tipo_pago === 'mixto' ? 'varios' : v.tipo_pago} className="h-7 w-[42px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-tinta">Ticket {v.numero_ticket}</p>
                      <p className="text-sm text-suave">{v.fecha}</p>
                    </div>
                    {v.estado === 'anulada' && (
                      <span className="rounded-full bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] px-2.5 py-1 text-sm font-semibold text-sale">Anulada</span>
                    )}
                    <span className={`cifra text-xl font-bold ${v.estado === 'anulada' ? 'text-tenue line-through' : 'text-tinta'}`}>{pesos(Number(v.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
