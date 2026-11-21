'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/avisos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { hoyBogota } from '@/lib/fechas'
import { enlaceWhatsApp, textoRecordatorioCredito } from '@/lib/whatsapp'

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
  anulado: 'Anulado',
}

/** Créditos sin deuda que cobrar: pagados o anulados (la venta se anuló o se devolvió completa) */
const esCerrado = (estado: string) => estado === 'pagado' || estado === 'anulado'

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }

function CreditoCard({ credito }: { credito: Credito }) {
  const supabase = createClient()
  const router = useRouter()
  const [expandido, setExpandido] = useState(!esCerrado(credito.estado))
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
        p_observaciones: observaciones || undefined,
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
        p_notas: notaFecha || undefined,
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
  const cerrado = esCerrado(credito.estado)
  const hoy = hoyBogota()
  const vencido = credito.fecha_pago_programada && credito.fecha_pago_programada < hoy && !cerrado

  return (
    <div className={`space-y-3 rounded-2xl p-4 ${cerrado ? 'bg-superficie-2 opacity-70' : 'bg-superficie'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {credito.ventas?.id
              ? <Link href={`/dashboard/ventas/${credito.ventas.id}`} className="text-[16px] font-semibold text-tinta underline-offset-2 hover:text-enlace hover:underline">Ticket {credito.ventas.numero_ticket}</Link>
              : <span className="text-[16px] font-semibold text-tinta">Ticket {credito.ventas?.numero_ticket ?? '—'}</span>}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${esPagado ? 'bg-[color-mix(in_oklab,var(--entra)_13%,transparent)] text-entra' : credito.estado === 'anulado' ? 'bg-realce text-suave' : 'bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)] text-aviso'}`}>
              {ESTADO_LABEL[credito.estado] ?? credito.estado}
            </span>
            {vencido && <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] px-2.5 py-0.5 text-sm font-semibold text-sale"><AlertTriangle className="size-3.5" aria-hidden />Vencido</span>}
          </div>
          <p className="mt-0.5 text-sm text-suave">
            {credito.ventas?.fecha}, de {fmt(credito.monto_original)}
            {credito.fecha_pago_programada && `, vence el ${credito.fecha_pago_programada}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {!cerrado && (
            <p className="cifra text-[22px] font-bold text-sale">{fmt(credito.saldo_pendiente)}</p>
          )}
          <button type="button" onClick={() => setExpandido(v => !v)} aria-expanded={expandido} aria-label={expandido ? 'Ocultar detalle' : 'Ver abonos y acciones'}
            className="mt-1 flex size-10 items-center justify-center rounded-xl text-suave hover:bg-velo/5 hover:text-tinta">
            {expandido ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>
      </div>

      {expandido && (
        <>
          {/* Historial de abonos */}
          {credito.abonos_credito.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-steel-300">Abonos realizados:</p>
              {credito.abonos_credito.map(a => (
                <div key={a.id} className="flex justify-between rounded-xl border border-linea bg-superficie-2 px-2 py-1.5 text-xs">
                  <div>
                    <span className="text-steel-300">{new Date(a.created_at).toLocaleDateString('es-CO')}</span>
                    {a.observaciones && <span className="ml-2 text-steel-500">{a.observaciones}</span>}
                  </div>
                  <span className="font-medium text-emerald-400">{fmt(a.monto)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          {!cerrado && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => { setMostrarAbono(v => !v); setMostrarFecha(false) }}>
                Registrar abono
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-linea bg-superficie-2 text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => { setMostrarFecha(v => !v); setMostrarAbono(false) }}>
                {credito.fecha_pago_programada ? 'Cambiar fecha' : 'Programar fecha'}
              </Button>
            </div>
          )}

          {/* Panel abono */}
          {mostrarAbono && !cerrado && (
            <div className="space-y-3 rounded-xl border border-linea bg-superficie-2 p-3">
              <p className="text-xs font-medium text-steel-300">
                Registrar abono · Saldo pendiente: {fmt(credito.saldo_pendiente)}
              </p>
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-suave">Monto a abonar</Label>
                <Input
                  type="number"
                  className="border-linea bg-superficie text-tinta"
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
                  <Label className="text-sm font-semibold text-suave">Fuentes de pago</Label>
                  <button
                    type="button"
                    onClick={() => setFuentes(prev => [...prev, { key: Date.now().toString(), fuente: 'efectivo', monto: 0 }])}
                    className="flex items-center gap-1 text-xs text-steel-300 hover:text-tinta"
                  >
                    <Plus className="h-3 w-3" />Agregar fuente
                  </button>
                </div>
                {fuentes.map((f, idx) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <Select
                      items={FUENTES}
                      onValueChange={v => v && setFuentes(prev => prev.map((it, i) => i === idx ? { ...it, fuente: v } : it))}
                      value={f.fuente}
                    >
                      <SelectTrigger className="h-8 w-32 border-linea bg-superficie text-xs text-tinta"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUENTES.map(fd => <SelectItem key={fd.value} value={fd.value}>{fd.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={f.monto || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setFuentes(prev => prev.map((it, i) => i === idx ? { ...it, monto: parseFloat(e.target.value) || 0 } : it))}
                      className="h-8 border-linea bg-superficie text-xs text-tinta"
                    />
                    {fuentes.length > 1 && (
                      <button type="button" onClick={() => setFuentes(prev => prev.filter((_, i) => i !== idx))} className="text-steel-300 hover:text-sale">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {monto > 0 && Math.abs(fuentes.reduce((s, f) => s + f.monto, 0) - monto) > 0 && (
                  <p className="text-xs text-brand-yellow">
                    Falta: {fmt(monto - fuentes.reduce((s, f) => s + f.monto, 0))}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold text-suave">Observaciones</Label>
                <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className="border-linea bg-superficie text-tinta placeholder:text-tenue" />
              </div>

              {!confirmar ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={() => setConfirmar(true)}>Registrar abono</Button>
                  <Button type="button" size="sm" variant="outline" className="border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => { setMostrarAbono(false); setConfirmar(false) }}>Cancelar</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-tinta">¿Confirmas el abono de {fmt(monto)}?</p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleRegistrarAbono} disabled={registrando}>
                      {registrando ? 'Registrando…' : 'Sí, registrar'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => setConfirmar(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel fecha */}
          {mostrarFecha && !cerrado && (
            <div className="space-y-2 rounded-xl border border-linea bg-superficie-2 p-3">
              <p className="text-xs font-medium text-steel-300">Programar fecha de pago</p>
              <Input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} className="w-44 border-linea bg-superficie text-tinta" />
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-suave">Nota (opcional)</Label>
                <Input value={notaFecha} onChange={e => setNotaFecha(e.target.value)} placeholder="Ej: Acordado con el cliente" className="border-linea bg-superficie text-tinta placeholder:text-tenue" />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="bg-brand-yellow font-bold text-steel-900 hover:brightness-105" onClick={handleActualizarFecha} disabled={actualizandoFecha}>
                  {actualizandoFecha ? 'Guardando…' : 'Guardar fecha'}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-linea bg-transparent text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => setMostrarFecha(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function PerfilClienteCreditos({ creditos, cliente, negocio }: {
  creditos: Credito[]
  /** Para el recordatorio por WhatsApp */
  cliente?: { nombre: string; telefono: string | null }
  negocio?: string
}) {
  const activos = creditos.filter(c => !esCerrado(c.estado))
  const recordar = () => {
    if (!cliente) return
    const texto = textoRecordatorioCredito(
      negocio || 'Ferreléctricos Costa Azul',
      cliente.nombre,
      activos.map(c => ({ ticket: c.ventas?.numero_ticket ?? null, saldo: Number(c.saldo_pendiente), vence: c.fecha_pago_programada })),
      hoyBogota(),
    )
    const enlace = enlaceWhatsApp(cliente.telefono, texto)
    if (!enlace) { toast.error('Este cliente no tiene un teléfono válido: agrégalo en "Editar"'); return }
    window.open(enlace, '_blank')
  }
  const pagados = creditos.filter(c => esCerrado(c.estado))
  const [mostrarPagados, setMostrarPagados] = useState(false)

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
        Créditos ({activos.length} activo{activos.length !== 1 ? 's' : ''})
      </h2>

      {activos.length === 0 && (
        <p className="text-sm text-steel-500">Sin créditos pendientes.</p>
      )}

      {activos.length > 0 && cliente && (
        <button type="button" onClick={recordar}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-linea bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2">
          <MessageCircle className="size-5 text-entra" strokeWidth={1.75} aria-hidden /> Recordarle el pago por WhatsApp ({fmt(activos.reduce((s, c) => s + Number(c.saldo_pendiente), 0))})
        </button>
      )}

      {activos.map(c => <CreditoCard key={c.id} credito={c} />)}

      {pagados.length > 0 && (
        <div>
          <button type="button" onClick={() => setMostrarPagados(v => !v)}
            className="flex items-center gap-1 text-xs text-steel-300 hover:text-tinta">
            {mostrarPagados ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {mostrarPagados ? 'Ocultar' : 'Ver'} {pagados.length} crédito{pagados.length !== 1 ? 's' : ''} pagado{pagados.length !== 1 ? 's' : ''} o anulado{pagados.length !== 1 ? 's' : ''}
          </button>
          {mostrarPagados && pagados.map(c => <CreditoCard key={c.id} credito={c} />)}
        </div>
      )}
    </div>
  )
}