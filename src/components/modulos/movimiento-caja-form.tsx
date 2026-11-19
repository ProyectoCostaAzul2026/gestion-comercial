'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNavegacion } from '@/lib/navegacion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ajustarFuenteUnica, FUENTES_DISPONIBLES, FuentesPagoEditor, medioDeFuente, SelectorMedio, validarFuentes, type FuentePago,
} from './fuentes-pago'

export type TipoMovimientoCaja = 'gasto' | 'retiro' | 'traslado'

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

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
        : supabase.rpc('transferir_entre_fondos', {
            p_origen: medioDeFuente(origen), p_destino: medioDeFuente(destino), p_monto: monto, p_observaciones: notas.trim() || undefined,
          })
    const { error: errRpc } = await llamada
    setGuardando(false)
    if (errRpc) { toast.error('No se pudo guardar: ' + errRpc.message); setConfirmando(false); return }
    toast.success(tipo === 'gasto' ? 'Gasto registrado' : tipo === 'retiro' ? 'Retiro registrado' : 'Traslado registrado')
    volver(volverA, { refrescar: true })
  }

  const resumen = tipo === 'traslado'
    ? `Pasar ${pesos(monto)} de ${FUENTES_DISPONIBLES.find(f => f.value === origen)?.label} a ${FUENTES_DISPONIBLES.find(f => f.value === destino)?.label}`
    : `${tipo === 'gasto' ? 'Gasto' : 'Retiro'} de ${pesos(monto)}${fuentes.length > 1 ? ` desde ${fuentes.length} medios` : ` desde ${FUENTES_DISPONIBLES.find(f => f.value === fuentes[0].fuente)?.label}`}`

  const TITULO = 'text-[15px] font-semibold text-tinta'
  const CAMPO_G = 'h-12 border-linea bg-superficie text-[17px] text-tinta placeholder:text-tenue'
  const textoBoton = tipo === 'gasto' ? 'Registrar gasto' : tipo === 'retiro' ? 'Registrar retiro' : 'Registrar traslado'

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      {/* Monto: la cifra principal */}
      <div className="space-y-1.5">
        <Label htmlFor="mc-monto" className={TITULO}>{tipo === 'traslado' ? '¿Cuánto pasas?' : tipo === 'retiro' ? '¿Cuánto se retira?' : '¿Cuánto se gastó?'}</Label>
        <div className="relative">
          <span className="cifra pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[32px] font-bold text-tenue">$</span>
          <Input id="mc-monto" type="number" inputMode="numeric" value={monto || ''} onFocus={e => e.target.select()}
            onChange={e => cambiarMonto(parseFloat(e.target.value) || 0)} placeholder="0"
            autoFocus={tipo !== 'gasto'}
            className="cifra h-16 rounded-2xl border-linea bg-superficie pl-10 text-[34px] font-bold text-tinta" />
        </div>
      </div>

      {tipo === 'gasto' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mc-concepto" className={TITULO}>¿En qué se gastó?</Label>
            <Input id="mc-concepto" value={concepto} onChange={e => setConcepto(e.target.value)} className={CAMPO_G} placeholder="Ej: bolsas y cinta" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className={TITULO}>Categoría</Label>
            <Select items={categoriasGasto.map(c => ({ value: c.nombre, label: c.nombre }))} value={categoria} onValueChange={v => v && setCategoria(v)}>
              <SelectTrigger aria-label="Categoría" className={`${CAMPO_G} w-full`}><SelectValue placeholder="Elige una categoría" /></SelectTrigger>
              <SelectContent>{categoriasGasto.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {proveedores.length > 0 && (
            <div className="space-y-1.5">
              <Label className={TITULO}>Proveedor (opcional)</Label>
              <Select items={[{ value: 'ninguno', label: 'Ninguno' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                value={proveedorId || 'ninguno'} onValueChange={v => setProveedorId(!v || v === 'ninguno' ? '' : v)}>
                <SelectTrigger aria-label="Proveedor" className={`${CAMPO_G} w-full`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {tipo === 'traslado' ? (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <p className={TITULO}>Sale de</p>
            <SelectorMedio valor={origen} saldos={saldos} onElegir={v => { setOrigen(v); setConfirmando(false) }} />
          </div>
          <div className="flex justify-center" aria-hidden><ArrowDown className="size-6 text-tenue" /></div>
          <div className="space-y-2.5">
            <p className={TITULO}>Llega a</p>
            <SelectorMedio valor={destino} saldos={saldos} deshabilitado={origen} onElegir={v => { setDestino(v); setConfirmando(false) }} />
          </div>
        </div>
      ) : (
        <FuentesPagoEditor fuentes={fuentes} setFuentes={setFuentes} montoTotal={monto} saldos={saldos} />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="mc-notas" className={TITULO}>{tipo === 'retiro' ? 'Motivo *' : 'Notas (opcional)'}</Label>
        <Textarea id="mc-notas" value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          placeholder={tipo === 'retiro' ? 'Ej: retiro del dueño, consignación al banco' : 'Algo que convenga recordar'}
          className="border-linea bg-superficie text-[16px] text-tinta placeholder:text-tenue" />
      </div>

      {/* Acción fija abajo en el celular */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-fondo via-fondo/95 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 lg:static lg:bg-none lg:p-0">
        {!confirmando ? (
          <Button onClick={() => { const e = error(); if (e) toast.error(e); else setConfirmando(true) }}
            className="h-14 w-full rounded-xl bg-accion text-lg font-bold text-sobre-accion hover:brightness-105">
            {textoBoton}
          </Button>
        ) : (
          <div className="space-y-3 rounded-2xl border-2 border-accion bg-superficie p-3 shadow-xl">
            <p className="text-[15px] font-semibold text-tinta">{resumen}. ¿Confirmas?</p>
            <div className="flex gap-2">
              <Button onClick={guardar} disabled={guardando} className="h-12 flex-1 bg-accion text-base font-bold text-sobre-accion hover:brightness-105">
                {guardando ? 'Guardando…' : 'Sí, registrar'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmando(false)} className="h-12 border-linea bg-transparent text-tinta hover:bg-velo/5">Revisar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
