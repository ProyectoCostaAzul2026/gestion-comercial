import { createClient } from '@/lib/supabase/server'
import { AvatarIniciales, telefonoMarcable } from '@/components/modulos/avatar-iniciales'
import { Pencil } from 'lucide-react'
import { MedioPagoIcono } from '@/components/ui/medio-pago-icono'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BotonAtras } from '@/components/ui/boton-atras'
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
    { data: negocio },
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
    supabase.from('configuracion_negocio').select('nombre').maybeSingle(),
  ])

  const totalDeuda = (creditos ?? [])
    .filter((c: any) => c.estado !== 'pagado' && c.estado !== 'anulado')
    .reduce((s: number, c: any) => s + Number(c.saldo_pendiente), 0)

  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  const creditosActivos = (creditos ?? []).filter((c: any) => c.estado !== 'pagado' && c.estado !== 'anulado').length
  const totalComprado = (ventas ?? []).filter((v: any) => v.estado !== 'anulada').reduce((s: number, v: any) => s + Number(v.total) - Number(v.monto_devolucion ?? 0), 0)
  const ENLACE = 'text-enlace underline-offset-2 hover:underline'
  const datos: [string, React.ReactNode][] = [
    ['Teléfono', cliente.telefono ? <a href={`tel:${telefonoMarcable(cliente.telefono)}`} className={ENLACE}>{cliente.telefono}</a> : null],
    ['Correo', cliente.email ? <a href={`mailto:${cliente.email}`} className={ENLACE}>{cliente.email}</a> : null],
    ['NIT o cédula', cliente.nit_cc],
    ['Dirección', cliente.direccion],
    ['Notas', cliente.notas],
  ]
  const ESTADO: Record<string, string> = {
    anulada: 'bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] text-sale',
    credito: 'bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)] text-aviso',
  }

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex items-center gap-3 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <BotonAtras href="/dashboard/clientes" />
        <AvatarIniciales nombre={cliente.nombre} className="size-11 text-base" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-tinta">{cliente.nombre}</h1>
          <p className="text-sm text-suave">{cliente.es_cliente_generico ? 'Cliente de mostrador' : 'Cliente'}</p>
        </div>
        {!cliente.es_cliente_generico && (
          <Link href={`/dashboard/clientes/${cliente.id}/editar`}
            className="mr-2 inline-flex h-10 items-center gap-1.5 rounded-xl border border-linea bg-superficie px-3 text-[15px] font-semibold text-tinta hover:bg-superficie-2">
            <Pencil className="size-4" strokeWidth={1.75} aria-hidden />Editar
          </Link>
        )}
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-8 md:px-6 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Lo principal: cuánto debe */}
          {totalDeuda > 0 ? (
            <section className="rounded-[18px] bg-superficie p-5">
              <p className="text-[15px] font-semibold text-suave">Debe</p>
              <p className="cifra text-[48px] font-bold leading-none text-sale">{pesos(totalDeuda)}</p>
              <p className="mt-1 text-[15px] text-suave">{creditosActivos} {creditosActivos === 1 ? 'crédito activo' : 'créditos activos'}. Abona en cada crédito, abajo.</p>
            </section>
          ) : (
            <section className="rounded-[18px] bg-superficie p-5">
              <p className="text-[15px] font-semibold text-suave">Ha comprado</p>
              <p className="cifra text-[44px] font-bold leading-none text-tinta">{pesos(totalComprado)}</p>
              <p className="mt-1 text-[15px] text-suave">En {(ventas ?? []).length} {(ventas ?? []).length === 1 ? 'compra' : 'compras'}. No debe nada.</p>
            </section>
          )}

          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-tinta">Datos</h2>
            <dl className="overflow-hidden rounded-2xl bg-superficie">
              {datos.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4 border-b border-linea px-4 py-3 last:border-0">
                  <dt className="text-[15px] text-suave">{etiqueta}</dt>
                  <dd className="text-right text-[15px] font-semibold text-tinta">{valor || <span className="font-normal text-tenue">Sin dato</span>}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(creditos ?? []).length > 0 && (
            <PerfilClienteCreditos creditos={creditos as any} cliente={{ nombre: cliente.nombre, telefono: cliente.telefono }} negocio={negocio?.nombre ?? undefined} />
          )}
        </div>

        <section className="space-y-2.5">
          <h2 className="text-lg font-bold text-tinta">Compras ({ventas?.length ?? 0})</h2>
          {(ventas ?? []).length === 0 ? (
            <p className="rounded-2xl bg-superficie px-4 py-8 text-center text-[15px] text-suave">Aún no tiene compras registradas.</p>
          ) : (
            <ul className="overflow-hidden rounded-2xl bg-superficie">
              {(ventas ?? []).map((v: any) => (
                <li key={v.id} className="border-b border-linea last:border-0">
                  <Link href={`/dashboard/ventas/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-velo/5">
                    <MedioPagoIcono medio={v.tipo_pago === 'mixto' ? 'varios' : v.tipo_pago} className="h-7 w-[42px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-tinta">Ticket {v.numero_ticket}</p>
                      <p className="text-sm text-suave">{v.fecha}</p>
                    </div>
                    {ESTADO[v.estado] && (
                      <span className={`rounded-full px-2.5 py-1 text-sm font-semibold capitalize ${ESTADO[v.estado]}`}>{v.estado === 'credito' ? 'Crédito' : 'Anulada'}</span>
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
