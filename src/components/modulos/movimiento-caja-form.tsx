'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNavegacion } from '@/lib/navegacion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ajustarFuenteUnica, FUENTES_DISPONIBLES, FuentesPagoEditor, medioDeFuente, validarFuentes, type FuentePago,
} from './fuentes-pago'

export type TipoMovimientoCaja = 'gasto' | 'retiro' | 'traslado'

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
const CAMPO = 'h-11 border-linea bg-superficie-2 text-tinta'
const ETIQUETA = 'text-xs font-bold text-steel-300'

/**
 * Formulario de Caja en vista propia: registrar un gasto, un retiro de dinero o un traslado entre medios.
 * Usa las mismas RPC de antes (registrar_gasto_caja, registrar_retiro, transferir_entre_fondos) y, al guardar, vuelve a
 * la página de donde se vino (Caja o Contabilidad) y la recarga.
 */
export function MovimientoCajaForm({ tipo, saldos, categoriasGasto = [], proveedores = [], volverA = '/dashboard/caja' }: {
  tipo: TipoMovimientoCaja
  saldos: Record<string, number>
  categoriasGasto?: { id: string; nombre: string }[]
  /** Para un gasto: a qué proveedor se le pagó (opcional) */
  proveedores?: { id: string; nombre: string }[]
  volverA?: string
}) {
  const supabase = createClient()
  const { volver } = useNavegacion()
  const [monto, setMonto] = useState(0)
  const [fuentes, setFuentes] = useState<FuentePago[]>([{ key: '1', fuente: tipo === 'retiro' ? 'caja_mayor' : 'caja_menor', monto: 0 }])
  const [concepto, setConcepto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [notas, setNotas] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [origen, setOrigen] = useState('nequi')
  const [destino, setDestino] = useState('caja_mayor')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cambiarMonto = (m: number) => { setMonto(m); setFuentes(f => ajustarFuenteUnica(f, m)); setConfirmando(false) }

  const error = (): string | null => {
    if (tipo === 'gasto' && !concepto.trim()) return 'Escribe en qué se gastó'
    if (tipo === 'retiro' && !notas.trim()) return 'Escribe el motivo del retiro'
    if (tipo === 'traslado') {
      if (monto <= 0) return 'El monto debe ser mayor a 0'
      if (medioDeFuente(origen) === medioDeFuente(destino)) return 'El origen y el destino deben ser distintos'
      const hay = saldos[medioDeFuente(origen)] ?? 0
      if (monto > hay) return `No alcanza: hay ${pesos(hay)}`
      return null
    }
    return validarFuentes(fuentes, monto, saldos)
  }

  const guardar = async () => {
    const e = error()
    if (e) { toast.error(e); setConfirmando(false); return }
    setGuardando(true)
    const llamada = tipo === 'gasto'
      ? supabase.rpc('registrar_gasto_caja', {
          p_concepto: concepto.trim(), p_categoria: categoria || 'Otros', p_monto: monto,
          p_fuentes: fuentes.map(f => ({ fuente: f.fuente, monto: f.monto })) as never,
          p_proveedor_id: proveedorId || undefined, p_notas: notas.trim() || undefined,
        })
      : tipo === 'retiro'
        ? supabase.rpc('registrar_retiro', {
            p_monto: monto, p_observaciones: notas.trim(),
            p_fuentes: fuentes.map(f => ({ fuente: f.fuente, monto: f.monto })) as never,
          })
        : supabase.rpc('transferir_entre_fondos' as never, {
            p_origen: medioDeFuente(origen), p_destino: medioDeFuente(destino), p_monto: monto, p_observaciones: notas.trim() || null,
          } as never)
    const { error: errRpc } = await llamada
    setGuardando(false)
    if (errRpc) { toast.error('No se pudo guardar: ' + errRpc.message); setConfirmando(false); return }
    toast.success(tipo === 'gasto' ? 'Gasto registrado' : tipo === 'retiro' ? 'Retiro registrado' : 'Traslado registrado')
    volver(volverA, { refrescar: true })
  }

  const resumen = tipo === 'traslado'
    ? `Pasar ${pesos(monto)} de ${FUENTES_DISPONIBLES.find(f => f.value === origen)?.label} a ${FUENTES_DISPONIBLES.find(f => f.value === destino)?.label}`
    : `${tipo === 'gasto' ? 'Gasto' : 'Retiro'} de ${pesos(monto)}${fuentes.length > 1 ? ` desde ${fuentes.length} medios` : ` desde ${FUENTES_DISPONIBLES.find(f => f.value === fuentes[0].fuente)?.label}`}`

  return (
    <div className="space-y-4 rounded-2xl border border-linea bg-superficie p-4">
      {tipo === 'gasto' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="mc-concepto" className={ETIQUETA}>Concepto *</Label>
            <Input id="mc-concepto" value={concepto} onChange={e => setConcepto(e.target.value)} className={CAMPO} placeholder="Ej: bolsas y cinta" autoFocus />
          </div>
          <div className="space-y-1">
            <Label className={ETIQUETA}>Categoría</Label>
            <Select items={categoriasGasto.map(c => ({ value: c.nombre, label: c.nombre }))} value={categoria} onValueChange={v => v && setCategoria(v)}>
              <SelectTrigger className={`${CAMPO} w-full`}><SelectValue placeholder="Elige una categoría" /></SelectTrigger>
              <SelectContent>{categoriasGasto.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {proveedores.length > 0 && (
            <div className="space-y-1 sm:col-span-2">
              <Label className={ETIQUETA}>Proveedor (opcional)</Label>
              <Select items={[{ value: 'ninguno', label: 'Ninguno' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                value={proveedorId || 'ninguno'} onValueChange={v => setProveedorId(!v || v === 'ninguno' ? '' : v)}>
                <SelectTrigger className={`${CAMPO} w-full`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="mc-monto" className={ETIQUETA}>Monto *</Label>
        <Input id="mc-monto" type="number" inputMode="numeric" value={monto || ''} onFocus={e => e.target.select()}
          onChange={e => cambiarMonto(parseFloat(e.target.value) || 0)} className={`${CAMPO} text-lg font-bold`} placeholder="0"
          autoFocus={tipo !== 'gasto'} />
      </div>

      {tipo === 'traslado' ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          {([['Sale de', origen, setOrigen], ['Llega a', destino, setDestino]] as const).map(([titulo, valor, cambiar], i) => (
            <div key={titulo} className={`space-y-1 ${i === 1 ? 'col-start-3' : ''}`}>
              <Label className={ETIQUETA}>{titulo}</Label>
              <Select items={FUENTES_DISPONIBLES} value={valor} onValueChange={v => v && cambiar(v)}>
                <SelectTrigger className={`${CAMPO} w-full`}><SelectValue /></SelectTrigger>
                <SelectContent>{FUENTES_DISPONIBLES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-steel-500">Hay {pesos(saldos[medioDeFuente(valor)] ?? 0)}</p>
            </div>
          )).flatMap((el, i) => (i === 0 ? [el, <ArrowRight key="flecha" className="mb-8 h-5 w-5 text-steel-500" />] : [el]))}
        </div>
      ) : (
        <FuentesPagoEditor fuentes={fuentes} setFuentes={setFuentes} montoTotal={monto} saldos={saldos} />
      )}

      <div className="space-y-1">
        <Label htmlFor="mc-notas" className={ETIQUETA}>{tipo === 'retiro' ? 'Motivo *' : 'Notas'}</Label>
        <Textarea id="mc-notas" value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          placeholder={tipo === 'retiro' ? 'Ej: retiro del dueño, consignación al banco' : 'Opcional'}
          className="border-linea bg-superficie-2 text-tinta placeholder:text-steel-500" />
      </div>

      {!confirmando ? (
        <Button onClick={() => { const e = error(); if (e) toast.error(e); else setConfirmando(true) }}
          className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:brightness-105">
          {tipo === 'gasto' ? 'Registrar gasto' : tipo === 'retiro' ? 'Registrar retiro' : 'Registrar traslado'}
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-brand-yellow/40 bg-brand-yellow/5 p-3">
          <p className="text-sm font-semibold text-tinta">{resumen}. ¿Confirmas?</p>
          <div className="flex gap-2">
            <Button onClick={guardar} disabled={guardando} className="h-11 flex-1 bg-brand-yellow font-bold text-steel-900 hover:brightness-105">
              {guardando ? 'Guardando…' : 'Sí, registrar'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmando(false)} className="h-11 border-linea bg-transparent text-tinta hover:bg-velo/5">Revisar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
