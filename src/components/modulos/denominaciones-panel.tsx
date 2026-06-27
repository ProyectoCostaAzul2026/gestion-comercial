'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface FondoDenominacion {
  tipo: string
  denominacion: number
  cantidad: number
  billetes_acumulados: number
}

interface DenominacionesPanelProps {
  fondos: FondoDenominacion[]
  config: { monto_base_caja_menor: number; monto_inicial_monedas: number; monto_inicial_sencillo: number }
}

const DENOMINACIONES_MONEDAS = [50, 100, 200, 500, 1000]
const DENOMINACIONES_SENCILLO = [1000, 2000, 5000, 10000, 20000, 50000, 100000]

function formatCOP(valor: number) {
  return `$${valor.toLocaleString('es-CO')}`
}

function FondoEditor({
  tipo,
  titulo,
  montoInicial,
  fondos,
  denominaciones,
}: {
  tipo: string
  titulo: string
  montoInicial: number
  fondos: FondoDenominacion[]
  denominaciones: number[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [modo, setModo] = useState<null | 'intercambio' | 'modificar'>(null)
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [billetesAcumulados, setBilletesAcumulados] = useState(0)
  const [guardando, setGuardando] = useState(false)

  const getBilletesActuales = () => {
    const f = fondos.find(f => f.tipo === tipo && f.denominacion === denominaciones[0])
    return f?.billetes_acumulados ?? 0
  }

  const getCantidad = (d: number) => fondos.find(f => f.tipo === tipo && f.denominacion === d)?.cantidad ?? 0

  const totalMonedas = denominaciones.reduce((s, d) => s + getCantidad(d) * d, 0)
  const totalActual = tipo === 'monedas' ? totalMonedas + getBilletesActuales() : totalMonedas

  const abrir = (m: 'intercambio' | 'modificar') => {
    const init = Object.fromEntries(denominaciones.map(d => [d, getCantidad(d)]))
    setCantidades(init)
    setBilletesAcumulados(getBilletesActuales())
    setModo(m)
  }

  // Para intercambio: calcula cuánto valor de monedas sale
  const valorMonedas = (cant: Record<number, number>) =>
    denominaciones.reduce((s, d) => s + (cant[d] ?? 0) * d, 0)

  const valorMonedasActual = denominaciones.reduce((s, d) => s + getCantidad(d) * d, 0)
  const valorMonedasEditor = valorMonedas(cantidades)
  const diferenciaBilletes = tipo === 'monedas' ? valorMonedasActual - valorMonedasEditor : 0

  const totalEditor = tipo === 'monedas'
    ? valorMonedasEditor + (billetesAcumulados + diferenciaBilletes)
    : valorMonedas(cantidades)

  const handleGuardar = async () => {
    // Validación
    if (modo === 'modificar') {
      const totalMod = tipo === 'monedas'
        ? valorMonedas(cantidades) + billetesAcumulados
        : valorMonedas(cantidades)
      if (Math.abs(totalMod - montoInicial) > 0) {
        toast.error(`El total debe ser exactamente ${formatCOP(montoInicial)}. Actual: ${formatCOP(totalMod)}`)
        return
      }
    }

    setGuardando(true)
    try {
      const payload = denominaciones.map(d => ({
        denominacion: d,
        cantidad: cantidades[d] ?? 0,
      }))

      // Para monedas, incluir billetes acumulados en la primera denominación como campo extra
      const payloadConBilletes = tipo === 'monedas'
        ? payload.map((p, i) => i === 0 ? { ...p, billetes_acumulados: modo === 'intercambio' ? billetesAcumulados + diferenciaBilletes : billetesAcumulados } : p)
        : payload

      const { error } = await supabase.rpc('actualizar_denominaciones', {
        p_tipo: tipo,
        p_denominaciones: payloadConBilletes as any,
      })
      if (error) throw error
      toast.success('Denominaciones actualizadas')
      setModo(null)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-steel-900">{titulo}</h3>
          <p className="text-xs text-steel-500">
            Monto inicial: {formatCOP(montoInicial)} · Actual: {formatCOP(totalActual)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => abrir('intercambio')}>Intercambiar</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => abrir('modificar')}>Modificar</Button>
        </div>
      </div>

      {/* Vista actual */}
      {modo === null && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-steel-500">
              <th className="pb-1 text-left">Denominación</th>
              <th className="pb-1 text-right">Cantidad</th>
              <th className="pb-1 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {denominaciones.map(d => {
              const cant = getCantidad(d)
              return (
                <tr key={d} className="border-b border-slate-100 last:border-0">
                  <td className="py-1 text-steel-700">{formatCOP(d)}</td>
                  <td className="py-1 text-right text-steel-900">{cant}</td>
                  <td className="py-1 text-right font-medium text-steel-900">{formatCOP(cant * d)}</td>
                </tr>
              )
            })}
            {tipo === 'monedas' && (
              <tr className="border-b border-slate-100">
                <td className="py-1 text-steel-700">Billetes acumulados</td>
                <td className="py-1 text-right text-steel-300">—</td>
                <td className="py-1 text-right font-medium text-steel-900">{formatCOP(getBilletesActuales())}</td>
              </tr>
            )}
            <tr className="font-bold">
              <td className="pt-2 text-steel-900">Total</td>
              <td></td>
              <td className="pt-2 text-right text-steel-900">{formatCOP(totalActual)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Editor */}
      {modo !== null && (
        <div className="space-y-3">
          <p className="rounded-lg bg-slate-50 p-2 text-xs text-steel-700">
            {modo === 'intercambio' && tipo === 'monedas' && 'Ingresa las nuevas cantidades de monedas. El valor restante se suma automáticamente a Billetes acumulados.'}
            {modo === 'intercambio' && tipo === 'sencillo' && 'Ajusta las cantidades de billetes. El total debe mantenerse en ' + formatCOP(montoInicial) + '.'}
            {modo === 'modificar' && 'Ajuste externo — ingresa los valores reales. El total debe ser exactamente ' + formatCOP(montoInicial) + '.'}
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-steel-500">
                <th className="pb-1 text-left">Denominación</th>
                <th className="pb-1 text-right">Actual</th>
                <th className="pb-1 text-right">Nueva cant.</th>
                <th className="pb-1 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {denominaciones.map(d => (
                <tr key={d} className="border-b border-slate-100 last:border-0">
                  <td className="py-1 text-steel-700">{formatCOP(d)}</td>
                  <td className="py-1 text-right text-steel-300">{getCantidad(d)}</td>
                  <td className="py-1 text-right">
                    <Input
                      type="number" min={0}
                      value={cantidades[d] ?? ''}
                      onChange={e => setCantidades(prev => ({ ...prev, [d]: parseInt(e.target.value) || 0 }))}
                      className="ml-auto h-7 w-20 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 text-right font-medium text-steel-900">{formatCOP((cantidades[d] ?? 0) * d)}</td>
                </tr>
              ))}
              {tipo === 'monedas' && (
                <tr className="border-b border-slate-100">
                  <td className="py-1 text-steel-700">Billetes acumulados</td>
                  <td className="py-1 text-right text-steel-300">{formatCOP(getBilletesActuales())}</td>
                  <td className="py-1 text-right">
                    {modo === 'intercambio' ? (
                      <span className="block text-right text-xs text-steel-500">
                        {formatCOP(billetesAcumulados + diferenciaBilletes)}
                        <br /><span className="text-steel-300">(auto)</span>
                      </span>
                    ) : (
                      <Input
                        type="number" min={0}
                        value={billetesAcumulados || ''}
                        onChange={e => setBilletesAcumulados(parseFloat(e.target.value) || 0)}
                        className="ml-auto h-7 w-24 text-right text-xs"
                      />
                    )}
                  </td>
                  <td className="py-1 text-right font-medium text-steel-900">
                    {modo === 'intercambio'
                      ? formatCOP(billetesAcumulados + diferenciaBilletes)
                      : formatCOP(billetesAcumulados)}
                  </td>
                </tr>
              )}
              <tr className="font-bold">
                <td className="pt-2 text-steel-900">Total</td>
                <td></td>
                <td></td>
                <td className={`pt-2 text-right ${Math.abs(totalEditor - montoInicial) > 0 ? 'text-amber-600' : 'text-green-700'}`}>
                  {formatCOP(totalEditor)}
                </td>
              </tr>
            </tbody>
          </table>

          {Math.abs(totalEditor - montoInicial) > 0 && modo === 'modificar' && (
            <p className="flex items-center gap-1.5 rounded-lg bg-brand-red-soft p-2 text-xs text-brand-red">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> El total ({formatCOP(totalEditor)}) debe ser exactamente {formatCOP(montoInicial)}.
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleGuardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setModo(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DenominacionesPanel({ fondos, config }: DenominacionesPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-display font-bold text-steel-900">
        <span className="h-4 w-1 rounded-full bg-brand-yellow" />Fondos fijos
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FondoEditor tipo="monedas" titulo="Monedas" montoInicial={config.monto_inicial_monedas} fondos={fondos} denominaciones={DENOMINACIONES_MONEDAS} />
        <FondoEditor tipo="sencillo" titulo="Sencillo" montoInicial={config.monto_inicial_sencillo} fondos={fondos} denominaciones={DENOMINACIONES_SENCILLO} />
      </div>
    </div>
  )
}