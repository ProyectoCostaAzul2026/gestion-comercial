'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Coins, Banknote, Check } from 'lucide-react'

const DENOMINACIONES_BILLETES = [100000, 50000, 20000, 10000, 5000, 2000, 1000]
const DENOMINACIONES_MONEDAS = [1000, 500, 200, 100, 50]

interface ConteoItem {
  denominacion: number
  es_moneda: boolean
  cantidad: number
  subtotal: number
}

function TablaConteo({ titulo, items, onChange, totalEsperado }: {
  titulo: string; items: ConteoItem[]
  onChange: (items: ConteoItem[]) => void; totalEsperado?: number
}) {
  const total = items.reduce((s, i) => s + i.subtotal, 0)
  const diferencia = totalEsperado !== undefined ? total - totalEsperado : null
  const actualizar = (idx: number, cantidad: number) => {
    onChange(items.map((it, i) => i === idx ? { ...it, cantidad, subtotal: cantidad * it.denominacion } : it))
  }
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a2430] p-4">
      <h3 className="font-display font-bold text-white">{titulo}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 text-xs text-steel-300">
            <th className="pb-1 text-left">Denominación</th>
            <th className="pb-1 text-right">Cantidad</th>
            <th className="pb-1 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={`${item.es_moneda}-${item.denominacion}`} className="border-b border-white/8 last:border-0">
              <td className="py-1 text-steel-300">
                <span className="inline-flex items-center gap-1.5">
                  {item.es_moneda ? <Coins className="h-3.5 w-3.5 text-amber-400" /> : <Banknote className="h-3.5 w-3.5 text-emerald-400" />}
                  ${item.denominacion.toLocaleString('es-CO')}
                </span>
              </td>
              <td className="py-1 text-right">
                <Input type="number" min={0} value={item.cantidad || ''}
                  onChange={e => actualizar(idx, parseInt(e.target.value) || 0)}
                  className="ml-auto h-7 w-20 border-white/10 bg-[#111820] text-right text-xs text-white" />
              </td>
              <td className="py-1 text-right font-medium text-white">${item.subtotal.toLocaleString('es-CO')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/8 font-bold">
            <td className="pt-2 text-white">Total</td>
            <td></td>
            <td className={`pt-2 text-right font-display ${diferencia === null ? 'text-white' : Math.abs(diferencia) < 1 ? 'text-emerald-400' : 'text-brand-red'}`}>
              ${total.toLocaleString('es-CO')}
            </td>
          </tr>
          {totalEsperado !== undefined && (
            <tr className="text-xs">
              <td colSpan={2} className="pt-1 text-steel-300">Esperado: ${totalEsperado.toLocaleString('es-CO')}</td>
              <td className={`pt-1 text-right font-medium ${Math.abs(diferencia ?? 0) < 1 ? 'text-emerald-400' : 'text-brand-red'}`}>
                {diferencia === null ? '' : diferencia > 0 ? `+$${diferencia.toLocaleString('es-CO')}` : diferencia < 0 ? `-$${Math.abs(diferencia).toLocaleString('es-CO')}` : '✓ Cuadrada'}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}

function crearConteoVacio(): ConteoItem[] {
  return [
    ...DENOMINACIONES_BILLETES.map(d => ({ denominacion: d, es_moneda: false, cantidad: 0, subtotal: 0 })),
    ...DENOMINACIONES_MONEDAS.map(d => ({ denominacion: d, es_moneda: true, cantidad: 0, subtotal: 0 })),
  ]
}

export function ArqueoPanel({ ventasEfectivo, egresosEfectivo, montoBase, fechaHoy, onCerrar }: {
  ventasEfectivo: number
  egresosEfectivo: number
  montoBase: number
  fechaHoy: string
  onCerrar: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [conteoBase, setConteoBase] = useState<ConteoItem[]>(crearConteoVacio())
  const [conteoSobrante, setConteoSobrante] = useState<ConteoItem[]>(crearConteoVacio())
  const [observacion, setObservacion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  // Saldo sistema: solo efectivo (cash in - cash out)
  const saldoSistema = ventasEfectivo - egresosEfectivo
  const totalBase = useMemo(() => conteoBase.reduce((s, i) => s + i.subtotal, 0), [conteoBase])
  const totalSobrante = useMemo(() => conteoSobrante.reduce((s, i) => s + i.subtotal, 0), [conteoSobrante])
  const diferencia = totalSobrante - saldoSistema
  const baseValida = Math.abs(totalBase - montoBase) < 1
  const cadraCaja = Math.abs(diferencia) < 1

  const handleCerrar = async () => {
    if (!baseValida) {
      toast.error(`La caja base debe sumar $${montoBase.toLocaleString('es-CO')}. Actual: $${totalBase.toLocaleString('es-CO')}`)
      return
    }
    if (!cadraCaja && !observacion.trim()) {
      toast.error('Hay una diferencia. Debes ingresar una observación.')
      return
    }
    setCerrando(true)
    try {
      const { error } = await supabase.rpc('cerrar_caja_arqueo', {
        p_conteo_base: conteoBase.filter(i => i.cantidad > 0).map(i => ({ denominacion: i.denominacion, es_moneda: i.es_moneda, cantidad: i.cantidad, subtotal: i.subtotal })) as any,
        p_conteo_sobrante: conteoSobrante.filter(i => i.cantidad > 0).map(i => ({ denominacion: i.denominacion, es_moneda: i.es_moneda, cantidad: i.cantidad, subtotal: i.subtotal })) as any,
        p_observacion_diferencia: observacion || undefined,
      })
      if (error) throw error
      toast.success('Caja cerrada y sobrante transferido a Caja Mayor')
      router.refresh()
      onCerrar()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setCerrando(false)
      setConfirmando(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-brand-red">Arqueo y Cierre de Caja — {fechaHoy}</h2>
        <button type="button" onClick={onCerrar} className="text-xs text-brand-red hover:underline">Cancelar</button>
      </div>

      <div className="space-y-1 rounded-xl border border-white/10 bg-[#111820] p-3 text-sm">
        <p className="mb-1 font-medium text-steel-300">Saldo calculado por el sistema</p>
        <div className="flex justify-between">
          <span className="text-steel-300">Ingresos en efectivo</span>
          <span className="text-white">${ventasEfectivo.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-steel-300">Egresos en efectivo</span>
          <span className="text-white">-${egresosEfectivo.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between border-t border-white/8 pt-1 font-bold">
          <span className="text-white">Saldo neto en efectivo</span>
          <span className="font-display text-white">${saldoSistema.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <p className="rounded-xl bg-brand-red/10 p-2 text-xs text-brand-red">
        <strong>Instrucciones:</strong> Cuenta todo el efectivo disponible. Separa ${montoBase.toLocaleString('es-CO')} para la caja base del próximo día y regístralos en el primer recuadro. El resto es el sobrante — regístralo en el segundo recuadro.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TablaConteo titulo={`Recuadro 1 — Caja base próximo día ($${montoBase.toLocaleString('es-CO')})`}
          items={conteoBase} onChange={setConteoBase} totalEsperado={montoBase} />
        <TablaConteo titulo="Recuadro 2 — Sobrante (a transferir a Caja Mayor)"
          items={conteoSobrante} onChange={setConteoSobrante} totalEsperado={saldoSistema} />
      </div>

      {!cadraCaja && totalSobrante > 0 && (
        <div className="space-y-2 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3">
          <div className="flex items-center gap-2 text-brand-yellow">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {diferencia > 0
                ? `Sobrante de $${diferencia.toLocaleString('es-CO')} — hay más efectivo del esperado`
                : `Faltante de $${Math.abs(diferencia).toLocaleString('es-CO')} — hay menos efectivo del esperado`}
            </span>
          </div>
          <p className="text-xs text-brand-yellow/80">Verifica los movimientos del día. Si la diferencia persiste, ingresa una observación para cerrar.</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-brand-yellow">Observación obligatoria</label>
            <Textarea value={observacion} onChange={e => setObservacion(e.target.value)}
              rows={2} placeholder="Explica el motivo de la diferencia…" className="border-white/10 bg-[#111820] text-white placeholder:text-steel-500" />
          </div>
        </div>
      )}

      {!confirmando ? (
        <Button onClick={() => setConfirmando(true)}
          disabled={!baseValida || (!cadraCaja && !observacion.trim())}
          className="h-12 w-full bg-brand-red text-base font-bold text-white hover:bg-brand-red hover:brightness-95">
          Proceder al cierre
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/10 bg-[#111820] p-3">
          <p className="text-sm font-medium text-white">¿Confirmas el cierre de caja?</p>
          <ul className="space-y-0.5 text-xs text-steel-300">
            <li>• Base para mañana: ${totalBase.toLocaleString('es-CO')}</li>
            <li>• Sobrante a Caja Mayor: ${totalSobrante.toLocaleString('es-CO')}</li>
            {!cadraCaja && <li className="text-brand-yellow">• Diferencia: ${diferencia.toLocaleString('es-CO')}</li>}
          </ul>
          <div className="flex gap-2">
            <Button onClick={handleCerrar} disabled={cerrando} className="bg-brand-red font-bold text-white hover:bg-brand-red hover:brightness-95">
              {cerrando ? 'Cerrando…' : 'Sí, cerrar caja'}
            </Button>
            <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" onClick={() => setConfirmando(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}