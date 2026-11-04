'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ETIQUETA_DESTINO, diferenciaRenglon, unidadesBuenas, type DestinoRecepcion } from '@/lib/recepcion'
import { INPUT_CLS, LABEL_CLS } from './producto-form'
import { nombreConMedida, type RecepcionVista, type RenglonVista } from './recepcion-tipos'

const OPCIONES_DESTINO = [
  { value: 'bodega', label: 'Bodega' },
  { value: 'almacen', label: 'Almacén' },
]

/** Conteo de un renglón: contadas, averiadas (de esas) y destino. Nunca muestra lo facturado (conteo ciego). */
function FilaConteo({ renglon, onListo }: { renglon: RenglonVista; onListo: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [contadas, setContadas] = useState(renglon.cantidad_contada != null ? String(renglon.cantidad_contada) : '')
  const [averiadas, setAveriadas] = useState(renglon.cantidad_averiada > 0 ? String(renglon.cantidad_averiada) : '')
  const [destino, setDestino] = useState<DestinoRecepcion>(renglon.destino)
  const [guardando, setGuardando] = useState(false)
  const destinoFijo = renglon.stock_ingresado > 0

  const marcar = async () => {
    const nContadas = Number(contadas)
    const nAveriadas = averiadas.trim() === '' ? 0 : Number(averiadas)
    if (contadas.trim() === '' || !Number.isInteger(nContadas) || nContadas < 0) { toast.error('Escribe cuántas unidades contaste'); return }
    if (!Number.isInteger(nAveriadas) || nAveriadas < 0 || nAveriadas > nContadas) { toast.error('Las averiadas no pueden ser más que las contadas'); return }
    setGuardando(true)
    const { data, error } = await supabase.rpc('contar_renglon_recepcion', {
      p_renglon_id: renglon.id,
      p_cantidad_contada: nContadas,
      p_cantidad_averiada: nAveriadas,
      p_destino: destinoFijo ? undefined : destino,
    })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    const lugar = ETIQUETA_DESTINO[destinoFijo ? renglon.destino : destino].toLowerCase()
    const movidas = Number(data ?? 0)
    if (!renglon.producto_id) toast.success('Conteo guardado. Entra al inventario cuando se asocie el producto.')
    else if (movidas > 0) toast.success(`Entraron ${movidas} a ${lugar}`)
    else if (movidas < 0) toast.success(`Salieron ${-movidas} de ${lugar}`)
    else toast.success('Conteo guardado')
    onListo()
    router.refresh()
  }

  const id = `conteo-${renglon.id}`
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-contadas`} className={LABEL_CLS}>Contadas</Label>
          <Input id={`${id}-contadas`} type="number" inputMode="numeric" min={0} step={1} value={contadas} onChange={e => setContadas(e.target.value)} className={`h-11 ${INPUT_CLS}`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-averiadas`} className={LABEL_CLS}>Averiadas</Label>
          <Input id={`${id}-averiadas`} type="number" inputMode="numeric" min={0} step={1} value={averiadas} onChange={e => setAveriadas(e.target.value)}
            placeholder="0" className={`h-11 ${INPUT_CLS}`} />
        </div>
        <div className="space-y-1">
          <Label className={LABEL_CLS}>Entra a</Label>
          {destinoFijo ? (
            <p className="flex h-11 items-center text-sm text-white">{ETIQUETA_DESTINO[renglon.destino]}</p>
          ) : (
            <Select value={destino} onValueChange={v => v && setDestino(v as DestinoRecepcion)} items={OPCIONES_DESTINO}>
              <SelectTrigger className="h-11 w-full border-white/10 bg-[#1a2430] text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{OPCIONES_DESTINO.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      </div>
      <Button type="button" onClick={marcar} disabled={guardando}
        className="h-11 w-full bg-brand-yellow font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
        {guardando ? 'Guardando…' : renglon.cantidad_contada != null ? 'Guardar corrección' : 'Marcar contado'}
      </Button>
    </div>
  )
}

function Encabezado({ renglon }: { renglon: RenglonVista }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-white">{renglon.producto ? nombreConMedida(renglon.producto) : renglon.descripcion}</p>
        {!renglon.producto_id && <span className="rounded-full border border-brand-yellow/40 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">Pendiente</span>}
      </div>
      <p className="text-xs text-steel-300">
        {[renglon.producto?.marca, renglon.referencia ? `Ref. ${renglon.referencia}` : null].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

/**
 * Pestaña "Conteo": lo que falta contar, lo que no cuadra con la factura (para volver a contarlo) y lo ya contado.
 * Quien cuenta no ve lo facturado; el administrador ve las diferencias con sus números.
 */
export function RecepcionConteo({ recepcion, renglones, esAdmin }: {
  recepcion: RecepcionVista
  renglones: RenglonVista[]
  esAdmin: boolean
}) {
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)
  const editable = recepcion.estado !== 'cerrada'
  const porContar = renglones.filter(r => r.cantidad_contada == null)
  const conDiferencia = renglones.filter(r => diferenciaRenglon(r)?.cuadra === false)
  const contados = renglones.filter(r => diferenciaRenglon(r)?.cuadra === true)

  const resumenContado = (r: RenglonVista) => {
    const buenas = unidadesBuenas(r)
    const partes = [`${r.cantidad_contada} contadas`]
    if (r.cantidad_averiada > 0) partes.push(`${r.cantidad_averiada} averiadas`)
    partes.push(r.producto_id ? `${buenas} en ${ETIQUETA_DESTINO[r.destino].toLowerCase()}` : 'entra al asociar el producto')
    return partes.join(' · ')
  }

  const botonCorregir = (r: RenglonVista) => editable && corrigiendo !== r.id && (
    <button type="button" onClick={() => setCorrigiendo(r.id)} className="shrink-0 text-xs font-semibold text-brand-blue hover:underline">Corregir</button>
  )

  return (
    <div className="space-y-5">
      {recepcion.estado === 'reclamacion' && (
        <p className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-3 text-sm text-brand-blue">
          La recepción tiene una reclamación pendiente. Si llega mercancía que faltaba, corrige aquí su conteo y entra al inventario.
        </p>
      )}

      {conDiferencia.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-red">
            <AlertTriangle className="h-4 w-4" />Diferencias ({conDiferencia.length})
          </h3>
          <ul className="space-y-2">
            {conDiferencia.map(r => {
              const d = diferenciaRenglon(r)!
              return (
                <li key={r.id} className="space-y-2 rounded-2xl border border-brand-red/30 bg-brand-red/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Encabezado renglon={r} />
                    {botonCorregir(r)}
                  </div>
                  {esAdmin ? (
                    <p className="text-xs text-white">
                      Facturadas {r.cantidad_facturada} · Contadas {r.cantidad_contada}
                      {d.faltan > 0 && <span className="text-brand-red"> · Faltan {d.faltan}</span>}
                      {d.sobran > 0 && <span className="text-brand-yellow"> · Sobran {d.sobran}</span>}
                      {d.averiadas > 0 && <span className="text-brand-red"> · Averiadas {d.averiadas}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-white">
                      {d.faltan > 0 || d.sobran > 0 ? 'No cuadra con la factura: vuelve a contarlo y corrige si hace falta.' : 'Tiene unidades averiadas.'}
                      {' '}{resumenContado(r)}
                    </p>
                  )}
                  {corrigiendo === r.id && <FilaConteo renglon={r} onListo={() => setCorrigiendo(null)} />}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-yellow">Por contar ({porContar.length})</h3>
        {porContar.length === 0 ? (
          <p className="text-sm text-steel-500">{renglones.length === 0 ? 'Primero agrega los renglones de la factura.' : 'Todo está contado.'}</p>
        ) : (
          <ul className="space-y-2">
            {porContar.map(r => (
              <li key={r.id} className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-3">
                <Encabezado renglon={r} />
                {editable ? <FilaConteo renglon={r} onListo={() => {}} /> : <p className="text-xs text-steel-500">Sin contar</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {contados.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-emerald-400">Contados ({contados.length})</h3>
          <ul className="space-y-2">
            {contados.map(r => (
              <li key={r.id} className="space-y-2 rounded-2xl border border-emerald-500/20 bg-[#111820] p-3">
                <div className="flex items-start justify-between gap-2">
                  <Encabezado renglon={r} />
                  {botonCorregir(r)}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-steel-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {resumenContado(r)}{r.contado_por_nombre ? ` · ${r.contado_por_nombre}` : ''}
                </p>
                {corrigiendo === r.id && <FilaConteo renglon={r} onListo={() => setCorrigiendo(null)} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
