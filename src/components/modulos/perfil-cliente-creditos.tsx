'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Abono {
  id: string
  monto: number
  fuentes: any
  observaciones: string | null
  created_at: string
}

interface Credito {
  id: string
  saldo_pendiente: number
  monto_original: number
  fecha_pago_programada: string | null
  estado: string
  notas: string | null
  created_at: string
  ventas: { id: string; numero_ticket: number; fecha: string; total: number } | null
  abonos_credito: Abono[]
}

interface FuentePago {
  key: string
  fuente: string
  monto: number
}

const FUENTES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }

function CreditoCard({ credito }: { credito: Credito }) {
  const supabase = createClient()
  const router = useRouter()
  const [expandido, setExpandido] = useState(credito.estado !== 'pagado')
  const [mostrarAbono, setMostrarAbono] = useState(false)
  const [mostrarFecha, setMostrarFecha] = useState(false)
  const [monto, setMonto] = useState(credito.saldo_pendiente)
  const [fuentes, setFuentes] = useState<FuentePago[]>([{ key: '1', fuente: 'efectivo', monto: credito.saldo_pendiente }])
  const [observaciones, setObservaciones] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(credito.fecha_pago_programada ?? '')
  const [notaFecha, setNotaFecha] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [actualizandoFecha, setActualizandoFecha] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  const handleRegistrarAbono = async () => {
    if (monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (monto > credito.saldo_pendiente) { toast.error('El monto supera el saldo pendiente'); return }
    const suma = fuentes.reduce((s, f) => s + f.monto, 0)
    if (Math.abs(suma - monto) > 1) { toast.error('La suma de fuentes no coincide con el monto'); return }

    setRegistrando(true)
    try {
      const { error } = await supabase.rpc('registrar_abono_credito', {
        p_venta_credito_id: credito.id,
        p_monto: monto,
        p_fuentes: fuentes.map(f => ({ fuente: f.fuente, monto: f.monto })),
        p_observaciones: observaciones || null,
      })
      if (error) throw error
      toast.success('Abono registrado')
      setMostrarAbono(false)
      setConfirmar(false)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setRegistrando(false)
    }
  }

  const handleActualizarFecha = async () => {
    if (!nuevaFecha) { toast.error('Selecciona una fecha'); return }
    setActualizandoFecha(true)
    try {
      const { error } = await supabase.rpc('actualizar_fecha_pago_credito', {
        p_venta_credito_id: credito.id,
        p_fecha_pago: nuevaFecha,
        p_notas: notaFecha || null,
      })
      if (error) throw error
      toast.success('Fecha actualizada')
      setMostrarFecha(false)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setActualizandoFecha(false)
    }
  }

  const esPagado = credito.estado === 'pagado'
  const hoy = new Date().toISOString().slice(0, 10)
  const vencido = credito.fecha_pago_programada && credito.fecha_pago_programada < hoy && !esPagado

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${esPagado ? 'bg-slate-50 opacity-70' : vencido ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900">
              Ticket #{credito.ventas?.numero_ticket ?? '—'}
            </span>
            <Badge variant={esPagado ? 'default' : credito.estado === 'parcial' ? 'secondary' : 'destructive'}>
              {ESTADO_LABEL[credito.estado] ?? credito.estado}
            </Badge>
            {vencido && <Badge variant="destructive">Vencido</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {credito.ventas?.fecha} · Original: {fmt(credito.monto_original)}
            {credito.fecha_pago_programada && ` · Vence: ${credito.fecha_pago_programada}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          {!esPagado && (
            <p className="text-lg font-bold text-red-600">{fmt(credito.saldo_pendiente)}</p>
          )}
          <button type="button" onClick={() => setExpandido(v => !v)} className="text-slate-400 hover:text-slate-600 mt-1">
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expandido && (
        <>
          {/* Historial de abonos */}
          {credito.abonos_credito.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Abonos realizados:</p>
              {credito.abonos_credito.map(a => (
                <div key={a.id} className="flex justify-between text-xs rounded-md bg-white border px-2 py-1.5">
                  <div>
                    <span className="text-slate-500">{new Date(a.created_at).toLocaleDateString('es-CO')}</span>
                    {a.observaciones && <span className="ml-2 text-slate-400">{a.observaciones}</span>}
                  </div>
                  <span className="font-medium text-green-700">{fmt(a.monto)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          {!esPagado && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" onClick={() => { setMostrarAbono(v => !v); setMostrarFecha(false) }}>
                Registrar abono
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setMostrarFecha(v => !v); setMostrarAbono(false) }}>
                {credito.fecha_pago_programada ? 'Cambiar fecha' : 'Programar fecha'}
              </Button>
            </div>
          )}

          {/* Panel abono */}
          {mostrarAbono && !esPagado && (
            <div className="rounded-md border p-3 space-y-3 bg-slate-50">
              <p className="text-xs font-medium text-slate-700">
                Registrar abono · Saldo pendiente: {fmt(credito.saldo_pendiente)}
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Monto a abonar</Label>
                <Input
                  type="number"
                  value={monto || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const m = parseFloat(e.target.value) || 0
                    setMonto(m)
                    setFuentes([{ key: '1', fuente: 'efectivo', monto: m }])
                  }}
                />
              </div>

              {/* Fuentes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Fuentes de pago</Label>
                  <button
                    type="button"
                    onClick={() => setFuentes(prev => [...prev, { key: Date.now().toString(), fuente: 'efectivo', monto: 0 }])}
                    className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />Agregar fuente
                  </button>
                </div>
                {fuentes.map((f, idx) => (
                  <div key={f.key} className="flex gap-2 items-center">
                    <Select
                      items={FUENTES}
                      onValueChange={v => v && setFuentes(prev => prev.map((it, i) => i === idx ? { ...it, fuente: v } : it))}
                      value={f.fuente}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUENTES.map(fd => <SelectItem key={fd.value} value={fd.value}>{fd.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={f.monto || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setFuentes(prev => prev.map((it, i) => i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it))}
                      className="h-8 text-xs"
                    />
                    {fuentes.length > 1 && (
                      <button type="button" onClick={() => setFuentes(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {monto > 0 && Math.abs(fuentes.reduce((s, f) => s + f.monto, 0) - monto) > 0 && (
                  <p className="text-xs text-amber-600">
                    Falta: {fmt(monto - fuentes.reduce((s, f) => s + f.monto, 0))}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observaciones</Label>
                <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} />
              </div>

              {!confirmar ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => setConfirmar(true)}>Registrar abono</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setMostrarAbono(false); setConfirmar(false) }}>Cancelar</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Confirmas el abono de {fmt(monto)}?</p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleRegistrarAbono} disabled={registrando}>
                      {registrando ? 'Registrando…' : 'Sí, registrar'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirmar(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel fecha */}
          {mostrarFecha && !esPagado && (
            <div className="rounded-md border p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-medium text-slate-700">Programar fecha de pago</p>
              <Input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} className="w-44" />
              <div className="space-y-1">
                <Label className="text-xs">Nota (opcional)</Label>
                <Input value={notaFecha} onChange={e => setNotaFecha(e.target.value)} placeholder="Ej: Acordado con el cliente" />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleActualizarFecha} disabled={actualizandoFecha}>
                  {actualizandoFecha ? 'Guardando…' : 'Guardar fecha'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setMostrarFecha(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function PerfilClienteCreditos({ creditos }: { creditos: Credito[] }) {
  const activos = creditos.filter(c => c.estado !== 'pagado')
  const pagados = creditos.filter(c => c.estado === 'pagado')
  const [mostrarPagados, setMostrarPagados] = useState(false)

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">
        Créditos ({activos.length} activo{activos.length !== 1 ? 's' : ''})
      </h2>

      {activos.length === 0 && (
        <p className="text-sm text-slate-400">Sin créditos pendientes.</p>
      )}

      {activos.map(c => <CreditoCard key={c.id} credito={c} />)}

      {pagados.length > 0 && (
        <div>
          <button type="button" onClick={() => setMostrarPagados(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            {mostrarPagados ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {mostrarPagados ? 'Ocultar' : 'Ver'} {pagados.length} crédito{pagados.length !== 1 ? 's' : ''} pagado{pagados.length !== 1 ? 's' : ''}
          </button>
          {mostrarPagados && pagados.map(c => <CreditoCard key={c.id} credito={c} />)}
        </div>
      )}
    </div>
  )
}