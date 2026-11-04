'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cuadraConTotal, diferenciaRenglon, hayDiferencias, pendientesParaCerrar, sumaRenglones } from '@/lib/recepcion'
import { LABEL_CLS } from './producto-form'
import { nombreConMedida, pesos, type RecepcionVista, type RenglonVista } from './recepcion-tipos'

const ESTADO_PAGO: Record<string, string> = { pendiente: 'Pendiente de pago', parcial: 'Pago parcial', pagada: 'Pagada' }
const AREA_CLS = 'border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500 focus:border-brand-yellow/60'

/**
 * Pestaña "Cierre" (solo administrador): revisa la suma de la factura, lo que falta, las diferencias y cierra la
 * recepción (cerrar_recepcion). Con diferencias pide la nota de reclamación o devolución, que luego se marca resuelta.
 */
export function RecepcionCierre({ recepcion, renglones, totalFactura, estadoPago }: {
  recepcion: RecepcionVista
  renglones: RenglonVista[]
  totalFactura: number
  estadoPago: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  const suma = sumaRenglones(renglones.map(r => ({
    cantidad_facturada: r.cantidad_facturada,
    costo_unitario: r.costo_unitario,
    porcentajeIva: r.producto ? (r.producto.tiene_iva ? r.producto.porcentaje_iva : 0) : null,
  })), recepcion.costos_con_iva)
  const cuadra = cuadraConTotal(suma.conIva, totalFactura)
  const pendientes = pendientesParaCerrar(renglones)
  const conDiferencias = hayDiferencias(renglones)
  const lineasConDiferencia = renglones.filter(r => diferenciaRenglon(r)?.cuadra === false)

  const cerrar = async () => {
    if (conDiferencias && !nota.trim()) { toast.error('Escribe la nota de reclamación o devolución'); return }
    setGuardando(true)
    const { data, error } = await supabase.rpc('cerrar_recepcion', { p_recepcion_id: recepcion.id, p_nota: nota.trim() || undefined })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success(data === 'reclamacion' ? 'Recepción cerrada con la reclamación pendiente' : 'Recepción cerrada')
    setNota('')
    router.refresh()
  }

  const resolver = async () => {
    if (!nota.trim()) { toast.error('Escribe cómo se resolvió la reclamación'); return }
    setGuardando(true)
    const { error } = await supabase.rpc('resolver_reclamacion_recepcion', { p_recepcion_id: recepcion.id, p_nota: nota.trim() })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success('Reclamación resuelta')
    setNota('')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-white">Factura</h3>
          <Link href={`/dashboard/proveedores/${recepcion.proveedor_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline">
            {ESTADO_PAGO[estadoPago] ?? estadoPago}: ver pagos <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className={LABEL_CLS}>Total de la factura</dt><dd className="text-white">{pesos(totalFactura)}</dd></div>
          <div>
            <dt className={LABEL_CLS}>Suma de renglones{recepcion.costos_con_iva ? '' : ' con IVA'}</dt>
            <dd className="text-white">{pesos(suma.conIva)}</dd>
          </div>
        </dl>
        {!recepcion.costos_con_iva && (
          <p className="text-xs text-steel-500">Los costos vienen sin IVA ({pesos(suma.valor)}); el IVA se estima con el de cada producto (19 % en los pendientes).</p>
        )}
        <p className={`flex items-center gap-1.5 text-sm ${cuadra ? 'text-emerald-400' : 'text-brand-yellow'}`}>
          {cuadra ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {cuadra ? 'La suma cuadra con el total' : `No cuadra: diferencia de ${pesos(Math.abs(suma.conIva - totalFactura))}. Revisa la transcripción.`}
        </p>
      </div>

      {lineasConDiferencia.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-brand-red/30 bg-brand-red/5 p-4">
          <h3 className="font-display font-bold text-white">Diferencias</h3>
          <ul className="space-y-1 text-sm">
            {lineasConDiferencia.map(r => {
              const d = diferenciaRenglon(r)!
              const partes = [d.faltan > 0 && `faltan ${d.faltan}`, d.sobran > 0 && `sobran ${d.sobran}`, d.averiadas > 0 && `${d.averiadas} averiadas`].filter(Boolean)
              return (
                <li key={r.id} className="text-steel-300">
                  <span className="text-white">{r.producto ? nombreConMedida(r.producto) : r.descripcion}</span>: {partes.join(', ')}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {recepcion.estado === 'abierta' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          {pendientes.length > 0 ? (
            <ul className="space-y-1">
              {pendientes.map(p => (
                <li key={p} className="flex items-center gap-1.5 text-sm text-brand-yellow"><AlertTriangle className="h-4 w-4 shrink-0" />{p}</li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" />Todo contado y con precio aprobado</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="recepcion-nota" className={LABEL_CLS}>
              {conDiferencias ? 'Nota de reclamación o devolución (obligatoria)' : 'Nota (opcional)'}
            </Label>
            <Textarea id="recepcion-nota" rows={3} value={nota} onChange={e => setNota(e.target.value)} className={AREA_CLS}
              placeholder={conDiferencias ? 'Qué falta o llegó averiado y qué se le pidió al proveedor' : ''} />
          </div>
          <Button type="button" onClick={cerrar} disabled={guardando || pendientes.length > 0}
            className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
            {guardando ? 'Cerrando…' : conDiferencias ? 'Cerrar con reclamación' : 'Cerrar recepción'}
          </Button>
        </div>
      )}

      {recepcion.estado === 'reclamacion' && (
        <div className="space-y-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4">
          <h3 className="font-display font-bold text-brand-yellow">Reclamación pendiente</h3>
          <p className="whitespace-pre-line text-sm text-white">{recepcion.nota_cierre}</p>
          <p className="text-xs text-steel-300">Si llega lo que faltaba, corrígelo en Conteo. Cuando el proveedor responda (nota crédito, reposición o devolución), márcala resuelta.</p>
          <div className="space-y-1">
            <Label htmlFor="recepcion-resolucion" className={LABEL_CLS}>Cómo se resolvió</Label>
            <Textarea id="recepcion-resolucion" rows={3} value={nota} onChange={e => setNota(e.target.value)} className={AREA_CLS} />
          </div>
          <Button type="button" onClick={resolver} disabled={guardando}
            className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
            {guardando ? 'Guardando…' : 'Marcar resuelta'}
          </Button>
        </div>
      )}

      {recepcion.estado === 'cerrada' && (
        <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-400"><CheckCircle2 className="h-4 w-4" />Recepción cerrada</p>
          {recepcion.nota_cierre && <p className="whitespace-pre-line text-white"><span className="text-steel-300">Nota: </span>{recepcion.nota_cierre}</p>}
          {recepcion.nota_resolucion && <p className="whitespace-pre-line text-white"><span className="text-steel-300">Resolución: </span>{recepcion.nota_resolucion}</p>}
        </div>
      )}
    </div>
  )
}
