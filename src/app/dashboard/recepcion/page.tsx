import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { esAdmin } from '@/lib/permissions'
import { ETIQUETA_ESTADO_RECEPCION, diferenciaRenglon, type EstadoRecepcion } from '@/lib/recepcion'
import { RecepcionNuevaForm } from '@/components/modulos/recepcion-nueva-form'
import { CLASE_ESTADO_RECEPCION } from '@/components/modulos/recepcion-tipos'

// Fecha de hoy en Bogotá (la del servidor puede ir adelantada)
const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

export default async function RecepcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  const administrador = esAdmin(perfil?.rol)

  // Los empleados ven las recepciones por trabajar; el administrador, también las cerradas más recientes
  let consulta = supabase
    .from('recepciones')
    .select('id, numero_factura, fecha_factura, estado, created_at, proveedores(nombre), recepcion_items(producto_id, cantidad_facturada, cantidad_contada, cantidad_averiada)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!administrador) consulta = consulta.in('estado', ['abierta', 'reclamacion'])
  const [{ data: recepciones, error }, { data: proveedores }] = await Promise.all([
    consulta,
    administrador
      ? supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre')
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ])

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Recepción de mercancía</h1>
          <p className="text-sm text-steel-300">Transcribe la factura, cuenta lo que llegó y deja todo en el inventario.</p>
        </div>
      </div>

      {administrador && <RecepcionNuevaForm proveedores={proveedores ?? []} hoy={hoyBogota()} />}

      {error && <p className="text-sm text-brand-red">No se pudieron cargar las recepciones: {error.message}</p>}

      {(recepciones ?? []).length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#111820] p-4 text-sm text-steel-500">
          {administrador ? 'No hay recepciones. Abre una cuando llegue una factura.' : 'No hay recepciones por trabajar.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {(recepciones ?? []).map(r => {
            const renglones = r.recepcion_items ?? []
            const contados = renglones.filter(x => x.cantidad_contada != null).length
            const pendientes = renglones.filter(x => !x.producto_id).length
            const diferencias = renglones.filter(x => diferenciaRenglon(x)?.cuadra === false).length
            const estado = r.estado as EstadoRecepcion
            return (
              <li key={r.id}>
                <Link href={`/dashboard/recepcion/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111820] p-4 hover:bg-white/5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{r.proveedores?.nombre ?? 'Proveedor'}</p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLASE_ESTADO_RECEPCION[estado]}`}>
                        {ETIQUETA_ESTADO_RECEPCION[estado]}
                      </span>
                    </div>
                    <p className="text-xs text-steel-300">
                      {r.numero_factura ? `Factura N° ${r.numero_factura}` : 'Factura sin número'} · {r.fecha_factura}
                    </p>
                    <p className="text-xs text-steel-300">
                      {renglones.length === 0 ? 'Sin renglones' : `Contados ${contados} de ${renglones.length}`}
                      {pendientes > 0 && <span className="text-brand-yellow"> · {pendientes} sin producto</span>}
                      {diferencias > 0 && <span className="text-brand-red"> · {diferencias} con diferencia</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-steel-500" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
