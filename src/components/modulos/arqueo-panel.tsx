'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle } from 'lucide-react'

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
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b">
            <th className="text-left pb-1">Denominación</th>
            <th className="text-right pb-1">Cantidad</th>
            <th className="text-right pb-1">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={`${item.es_moneda}-${item.denominacion}`} className="border-b last:border-0">
              <td className="py-1 text-slate-600">{item.es_moneda ? '🪙' : '💵'} ${item.denominacion.toLocaleString('es-CO')}</td>
              <td className="py-1 text-right">
                <Input type="number" min={0} value={item.cantidad || ''}
                  onChange={e => actualizar(idx, parseInt(e.target.value) || 0)}
                  className="w-20 h-7 text-xs text-right ml-auto" />
              </td>
              <td className="py-1 text-right font-medium">${item.subtotal.toLocaleString('es-CO')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold border-t">
            <td className="pt-2">Total</td>
            <td></td>
            <td className={`pt-2 text-right ${diferencia === null ? 'text-slate-900' : Math.abs(diferencia) < 1 ? 'text-green-700' : 'text-red-600'}`}>
              ${total.toLocaleString('es-CO')}
            </td>
          </tr>
          {totalEsperado !== undefined && (
            <tr className="text-xs">
              <td colSpan={2} className="pt-1 text-slate-500">Esperado: ${totalEsperado.toLocaleString('es-CO')}</td>
              <td className={`pt-1 text-right font-medium ${Math.abs(diferencia ?? 0) < 1 ? 'text-green-700' : 'text-red-600'}`}>
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
        p_observacion_diferencia: observacion || null,
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-red-800">Arqueo y Cierre de Caja — {fechaHoy}</h2>
        <button type="button" onClick={onCerrar} className="text-xs text-red-600 hover:underline">Cancelar</button>
      </div>

      <div className="rounded-md bg-white border p-3 text-sm space-y-1">
        <p className="font-medium text-slate-700 mb-1">Saldo calculado por el sistema</p>
        <div className="flex justify-between">
          <span className="text-slate-500">Ingresos en efectivo</span>
          <span>${ventasEfectivo.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Egresos en efectivo</span>
          <span>-${egresosEfectivo.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-1">
          <span>Saldo neto en efectivo</span>
          <span>${saldoSistema.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <p className="text-xs text-red-700 bg-red-100 rounded p-2">
        <strong>Instrucciones:</strong> Cuenta todo el efectivo disponible. Separa ${montoBase.toLocaleString('es-CO')} para la caja base del próximo día y regístralos en el primer recuadro. El resto es el sobrante — regístralo en el segundo recuadro.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TablaConteo titulo={`Recuadro 1 — Caja base próximo día ($${montoBase.toLocaleString('es-CO')})`}
          items={conteoBase} onChange={setConteoBase} totalEsperado={montoBase} />
        <TablaConteo titulo="Recuadro 2 — Sobrante (a transferir a Caja Mayor)"
          items={conteoSobrante} onChange={setConteoSobrante} totalEsperado={saldoSistema} />
      </div>

      {!cadraCaja && totalSobrante > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {diferencia > 0
                ? `Sobrante de $${diferencia.toLocaleString('es-CO')} — hay más efectivo del esperado`
                : `Faltante de $${Math.abs(diferencia).toLocaleString('es-CO')} — hay menos efectivo del esperado`}
            </span>
          </div>
          <p className="text-xs text-amber-700">Verifica los movimientos del día. Si la diferencia persiste, ingresa una observación para cerrar.</p>
          <div className="space-y-1">
            <label className="text-xs text-amber-800 font-medium">Observación obligatoria</label>
            <Textarea value={observacion} onChange={e => setObservacion(e.target.value)}
              rows={2} placeholder="Explica el motivo de la diferencia…" className="bg-white" />
          </div>
        </div>
      )}

      {!confirmando ? (
        <Button onClick={() => setConfirmando(true)}
          disabled={!baseValida || (!cadraCaja && !observacion.trim())}
          className="w-full bg-red-600 hover:bg-red-700 text-white">
          Proceder al cierre
        </Button>
      ) : (
        <div className="rounded-md bg-white border p-3 space-y-3">
          <p className="text-sm font-medium">¿Confirmas el cierre de caja?</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            <li>• Base para mañana: ${totalBase.toLocaleString('es-CO')}</li>
            <li>• Sobrante a Caja Mayor: ${totalSobrante.toLocaleString('es-CO')}</li>
            {!cadraCaja && <li className="text-amber-700">• Diferencia: ${diferencia.toLocaleString('es-CO')}</li>}
          </ul>
          <div className="flex gap-2">
            <Button onClick={handleCerrar} disabled={cerrando} className="bg-red-600 hover:bg-red-700 text-white">
              {cerrando ? 'Cerrando…' : 'Sí, cerrar caja'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}