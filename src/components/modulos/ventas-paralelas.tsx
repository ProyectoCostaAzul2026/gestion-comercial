'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/avisos'
import { useNavegacion } from '@/lib/navegacion'
import { confirmar, elegir } from '@/components/ui/confirmar'
import { Dialogo } from '@/components/ui/dialogo'
import { cn } from '@/lib/utils'
import {
  avisarVentas, describirVenta, eliminarVentaEnCurso, EVENTO_VENTAS, guardarVentaEnCurso, MAX_VENTAS_PARALELAS,
  MINUTOS_TRANSFERENCIA, pesosVenta, type DetalleEventoVentas, type VentaEnCurso, COLUMNAS_VENTA_EN_CURSO,
} from '@/lib/ventas-en-curso'
import { NuevaVentaForm, type EstadoVenta, type ResumenVenta } from './nueva-venta-form'

type PropsForm = Pick<React.ComponentProps<typeof NuevaVentaForm>, 'clienteGeneral' | 'catalogo' | 'maxDescuentoPct' | 'whatsappNegocio'>

interface Pestana {
  id: string
  inicial?: Partial<EstadoVenta>
  resumen: ResumenVenta
  borrador: boolean
}

const nuevaId = () => crypto.randomUUID()
const VACIA: ResumenVenta = { cliente: 'Mostrador', lineas: 0, total: 0 }

/**
 * Nueva venta con ventas paralelas: hasta tres ventas abiertas en pestañas, que se cambian sin perder nada.
 *
 * - Con una sola venta (venta normal) nada se guarda: al salir con productos se pregunta si se cancela.
 * - Al abrir una venta paralela, todas las ventas con productos se guardan en ventas_en_curso. Si se sale, siguen
 *   abiertas (el vigilante de la app muestra cuántas hay) y pasan a borrador tras 15 minutos sin cambios.
 * - "Pasar" manda la venta a otro vendedor, que la acepta o la rechaza.
 */
export function VentasParalelas({ usuarioId, guardadas, abrir, vendedores, ...form }: PropsForm & {
  usuarioId: string
  /** Ventas abiertas o en borrador del vendedor (de la base) */
  guardadas: VentaEnCurso[]
  /** Venta que se abre al entrar (?venta=) */
  abrir?: string
  /** A quién se le puede pasar una venta */
  vendedores: { id: string; nombre_completo: string }[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { volver, reemplazar } = useNavegacion()

  const desdeBase = (v: VentaEnCurso): Pestana => ({
    id: v.id,
    inicial: v.datos as Partial<EstadoVenta>,
    resumen: { cliente: v.cliente_nombre || 'Mostrador', lineas: v.lineas, total: Number(v.total) },
    borrador: v.estado === 'borrador',
  })

  const [pestanas, setPestanas] = useState<Pestana[]>(() => {
    const abiertas = guardadas.filter(v => v.estado !== 'transferida').map(desdeBase)
    // Entrar a Nueva venta con ventas guardadas abre una nueva al lado, si cabe (salvo que se pida una en particular)
    if (abiertas.length === 0) return [{ id: nuevaId(), resumen: VACIA, borrador: false }]
    if (!abrir && abiertas.length < MAX_VENTAS_PARALELAS) return [...abiertas, { id: nuevaId(), resumen: VACIA, borrador: false }]
    return abiertas
  })
  const [activa, setActiva] = useState<string>(() => {
    if (abrir && pestanas.some(p => p.id === abrir)) return abrir
    return pestanas[pestanas.length - 1].id
  })
  // En modo paralelo las ventas se guardan en la base
  const [paralelo, setParalelo] = useState(guardadas.some(v => v.estado !== 'transferida'))
  const [pasando, setPasando] = useState(false)

  const estados = useRef<Record<string, { estado: EstadoVenta; resumen: ResumenVenta }>>({})
  const guardadasIds = useRef(new Set(guardadas.map(v => v.id)))
  const temporizadores = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const paraleloRef = useRef(paralelo)
  useEffect(() => { paraleloRef.current = paralelo }, [paralelo])

  // ── Guardar en la base (solo en modo paralelo y con algo en la venta) ──
  const guardarAhora = useCallback(async (id: string) => {
    clearTimeout(temporizadores.current[id])
    const e = estados.current[id]
    if (!e || !paraleloRef.current) return
    try {
      if (e.resumen.lineas === 0) {
        if (guardadasIds.current.has(id)) { await eliminarVentaEnCurso(supabase, id); guardadasIds.current.delete(id) }
        return
      }
      await guardarVentaEnCurso(supabase, { id, vendedorId: usuarioId, datos: e.estado, cliente: e.resumen.cliente, lineas: e.resumen.lineas, total: e.resumen.total })
      guardadasIds.current.add(id)
    } catch (err) {
      toast.error('No se pudo guardar la venta abierta', { description: (err as Error).message })
    }
  }, [supabase, usuarioId])

  const alCambiar = (id: string, estado: EstadoVenta, resumen: ResumenVenta) => {
    estados.current[id] = { estado, resumen }
    setPestanas(ps => ps.map(p => (p.id === id ? { ...p, resumen, borrador: false } : p)))
    if (!paraleloRef.current) return
    clearTimeout(temporizadores.current[id])
    temporizadores.current[id] = setTimeout(() => guardarAhora(id), 800)
  }

  useEffect(() => {
    const t = temporizadores.current
    return () => Object.values(t).forEach(clearTimeout)
  }, [])

  // Venta normal con productos: avisa antes de cerrar o recargar la página
  const lineasActiva = pestanas.find(p => p.id === activa)?.resumen.lineas ?? 0
  useEffect(() => {
    if (paralelo || lineasActiva === 0) return
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [paralelo, lineasActiva])

  // ── Lo que avisa el vigilante: una venta eliminada, una que hay que abrir (aceptada o en borrador) ──
  useEffect(() => {
    const oir = async (ev: Event) => {
      const { tipo, id } = (ev as CustomEvent<DetalleEventoVentas>).detail
      if (tipo === 'eliminada') {
        guardadasIds.current.delete(id)
        setPestanas(ps => {
          const quedan = ps.filter(p => p.id !== id)
          if (quedan.length === ps.length) return ps
          const lista = quedan.length ? quedan : [{ id: nuevaId(), resumen: VACIA, borrador: false }]
          setActiva(a => (a === id ? lista[0].id : a))
          return lista
        })
        return
      }
      if (pestanas.some(p => p.id === id)) {
        if (tipo === 'abrir') setActiva(id)
        if (tipo === 'actualizar') {
          const { data } = await supabase.from('ventas_en_curso').select('estado').eq('id', id).maybeSingle()
          if (data) setPestanas(ps => ps.map(p => (p.id === id ? { ...p, borrador: data.estado === 'borrador' } : p)))
        }
        return
      }
      if (tipo !== 'abrir') return
      const { data } = await supabase.from('ventas_en_curso').select(COLUMNAS_VENTA_EN_CURSO).eq('id', id).maybeSingle()
      if (!data) return
      const v = data as unknown as VentaEnCurso
      guardadasIds.current.add(v.id)
      setParalelo(true)
      setPestanas(ps => {
        // Una venta vacía sin tocar se reemplaza por la que llega
        const sinVacias = ps.filter(p => p.resumen.lineas > 0 || guardadasIds.current.has(p.id))
        return [...sinVacias, desdeBase(v)].slice(-MAX_VENTAS_PARALELAS)
      })
      setActiva(v.id)
    }
    window.addEventListener(EVENTO_VENTAS, oir)
    return () => window.removeEventListener(EVENTO_VENTAS, oir)
  })

  // ── Acciones ──
  const nuevaParalela = async () => {
    if (pestanas.length >= MAX_VENTAS_PARALELAS) {
      toast.warning(`Ya tienes ${MAX_VENTAS_PARALELAS} ventas abiertas`, { description: 'Registra o cancela una para abrir otra.' })
      return
    }
    setParalelo(true)
    paraleloRef.current = true
    await Promise.all(pestanas.map(p => guardarAhora(p.id)))
    const id = nuevaId()
    setPestanas(ps => [...ps, { id, resumen: VACIA, borrador: false }])
    setActiva(id)
    if (!paralelo) toast.info('Venta paralela abierta', { description: 'Cambia de venta con las pestañas. Las ventas abiertas se guardan solas.' })
  }

  const quitarPestana = (id: string) => {
    clearTimeout(temporizadores.current[id])
    delete estados.current[id]
    setPestanas(ps => {
      const quedan = ps.filter(p => p.id !== id)
      const lista = quedan.length ? quedan : [{ id: nuevaId(), resumen: VACIA, borrador: false }]
      setActiva(a => (a === id ? lista[Math.max(0, ps.findIndex(p => p.id === id) - 1)]?.id ?? lista[0].id : a))
      return lista
    })
  }

  const cancelarVenta = async (id: string) => {
    const p = pestanas.find(x => x.id === id)
    if (!p) return
    if (p.resumen.lineas > 0) {
      const ok = await confirmar({
        titulo: '¿Cancelar esta venta?',
        mensaje: `${describirVenta({ cliente_nombre: p.resumen.cliente, lineas: p.resumen.lineas, total: p.resumen.total })}. Se pierde lo que tiene.`,
        tono: 'peligro', textoConfirmar: 'Cancelar venta', textoCancelar: 'Seguir con ella',
      })
      if (!ok) return
    }
    if (guardadasIds.current.has(id)) {
      try { await eliminarVentaEnCurso(supabase, id); guardadasIds.current.delete(id) } catch (err) {
        toast.error('No se pudo cancelar la venta', { description: (err as Error).message }); return
      }
    }
    quitarPestana(id)
    if (p.resumen.lineas > 0) toast.success('Venta cancelada')
  }

  const salir = async () => {
    if (!paralelo) {
      if (lineasActiva > 0) {
        const r = await elegir({
          titulo: '¿Cancelar esta venta?',
          mensaje: 'Si sales, la venta no se guarda. Para dejarla guardada mientras haces otra, usa Venta paralela.',
          tono: 'aviso',
          opciones: [
            { valor: 'seguir', texto: 'Seguir vendiendo', estilo: 'secundaria' },
            { valor: 'cancelar', texto: 'Cancelar venta', estilo: 'peligro' },
          ],
        })
        if (r !== 'cancelar') return
      }
      volver('/dashboard/ventas')
      return
    }
    await Promise.all(pestanas.map(p => guardarAhora(p.id)))
    const abiertas = pestanas.filter(p => p.resumen.lineas > 0).length
    if (abiertas > 0) toast.info(`${abiertas === 1 ? 'Tu venta sigue abierta' : `Tus ${abiertas} ventas siguen abiertas`}`, { description: 'Vuelve a ellas con el botón «Ventas abiertas». Sin cambios en 15 minutos pasan a borrador.' })
    volver('/dashboard/ventas')
  }

  const alRegistrar = async (id: string, ventaId: string, conRecibo: boolean) => {
    if (guardadasIds.current.has(id)) {
      await eliminarVentaEnCurso(supabase, id).catch(() => {})
      guardadasIds.current.delete(id)
    }
    const quedan = pestanas.filter(p => p.id !== id && (p.resumen.lineas > 0 || guardadasIds.current.has(p.id)))
    quitarPestana(id)
    if (conRecibo) { reemplazar(`/dashboard/ventas/${ventaId}?recibo=1`); return }
    if (quedan.length === 0) { volver('/dashboard/ventas', { refrescar: true }); return }
    router.refresh()
  }

  const pasarA = async (destino: { id: string; nombre_completo: string }) => {
    const e = estados.current[activa]
    const p = pestanas.find(x => x.id === activa)
    if (!p || p.resumen.lineas === 0 || !e) { toast.error('La venta está vacía', { description: 'Agrega al menos un producto antes de pasarla.' }); return }
    const ok = await confirmar({
      titulo: `¿Pasar la venta a ${destino.nombre_completo}?`,
      mensaje: `Le llega un aviso para aceptarla y terminarla. Si no la acepta en ${MINUTOS_TRANSFERENCIA} minutos, vuelve a ti.`,
      detalle: [
        { etiqueta: 'Cliente', valor: p.resumen.cliente },
        { etiqueta: 'Líneas', valor: String(p.resumen.lineas) },
        { etiqueta: 'Total', valor: pesosVenta(p.resumen.total), fuerte: true },
      ],
      textoConfirmar: 'Pasar venta',
    })
    if (!ok) return
    setPasando(false)
    try {
      paraleloRef.current = true
      await guardarVentaEnCurso(supabase, { id: activa, vendedorId: usuarioId, datos: e.estado, cliente: p.resumen.cliente, lineas: p.resumen.lineas, total: p.resumen.total })
      const { error } = await supabase.rpc('transferir_venta_en_curso', { p_id: activa, p_destino: destino.id })
      if (error) throw error
      guardadasIds.current.delete(activa)
      quitarPestana(activa)
      toast.success(`Venta enviada a ${destino.nombre_completo}`, { description: `Cuando la acepte, la termina desde su celular. Si no la acepta en ${MINUTOS_TRANSFERENCIA} minutos, vuelve a ti.` })
      avisarVentas({ tipo: 'actualizar', id: activa })
    } catch (err) {
      toast.error('No se pudo pasar la venta', { description: (err as Error).message })
    }
  }

  // ── Encabezado: pasar la venta y abrir una paralela ──
  const acciones = (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={() => setPasando(true)} aria-label="Pasar la venta a otro vendedor" title="Pasar a otro vendedor"
        className="flex size-11 items-center justify-center rounded-xl text-tinta hover:bg-velo/5">
        <Send className="size-5" strokeWidth={1.9} aria-hidden />
      </button>
      {!paralelo && (
        <button type="button" onClick={nuevaParalela}
          aria-label="Abrir una venta paralela" title="Venta paralela"
          className="flex h-10 items-center gap-1 rounded-full bg-accion px-2.5 text-sm font-bold text-sobre-accion hover:brightness-105">
          <Plus className="size-4" strokeWidth={2.5} aria-hidden /><span className="hidden min-[400px]:inline">Paralela</span>
        </button>
      )}
    </div>
  )

  const barra = paralelo ? (
    <nav aria-label="Ventas abiertas" className="sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-10 -mt-1 bg-fondo/95 px-3 pb-2 backdrop-blur md:px-4 lg:top-[4.5rem]">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {pestanas.map((p, i) => {
          const esActiva = p.id === activa
          return (
            <div key={p.id} className={cn('flex min-w-0 shrink-0 items-stretch rounded-xl border transition-colors', esActiva ? 'border-accion bg-accion/12' : 'border-linea bg-superficie')}>
              <button type="button" onClick={() => setActiva(p.id)} aria-current={esActiva ? 'true' : undefined}
                className="flex min-w-0 flex-col items-start py-1.5 pr-1 pl-3 text-left">
                <span className={cn('flex items-center gap-1.5 text-xs font-semibold', esActiva ? 'text-enlace' : 'text-suave')}>
                  Venta {i + 1}
                  {p.borrador && <span className="rounded bg-aviso/20 px-1 text-[10px] font-bold text-aviso">Borrador</span>}
                </span>
                <span className="max-w-[9.5rem] truncate text-sm font-bold text-tinta">
                  {p.resumen.lineas ? `${p.resumen.cliente} · ${pesosVenta(p.resumen.total)}` : 'Vacía'}
                </span>
              </button>
              <button type="button" onClick={() => cancelarVenta(p.id)} aria-label={`Cancelar la venta ${i + 1}`}
                className="flex w-9 items-center justify-center rounded-r-xl text-suave hover:text-sale">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )
        })}
        {pestanas.length < MAX_VENTAS_PARALELAS && (
          <button type="button" onClick={nuevaParalela}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-dashed border-linea-fuerte px-3 text-sm font-semibold text-tinta hover:bg-velo/5">
            <Plus className="size-4" aria-hidden />Venta paralela
          </button>
        )}
      </div>
    </nav>
  ) : null

  const otros = vendedores.filter(v => v.id !== usuarioId)

  return (
    <>
      {pestanas.map((p, i) => (
        <div key={p.id} hidden={p.id !== activa}>
          <NuevaVentaForm
            {...form}
            prefijoId={`v${i}-`}
            inicial={p.inicial}
            onCambio={(estado, resumen) => alCambiar(p.id, estado, resumen)}
            onRegistrada={(ventaId, conRecibo) => alRegistrar(p.id, ventaId, conRecibo)}
            onSalir={salir}
            accionesCabecera={acciones}
            pestanas={barra}
          />
        </div>
      ))}

      <Dialogo abierto={pasando} alCambiar={setPasando} titulo="Pasar la venta a otro vendedor"
        descripcion="Elige a quién. La venta le llega con todo lo pedido y la puede terminar.">
        {otros.length === 0
          ? <p className="text-[15px] text-suave">No hay otros vendedores activos.</p>
          : (
            <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea">
              {otros.map(v => (
                <li key={v.id}>
                  <button type="button" onClick={() => pasarA(v)} className="flex min-h-13 w-full items-center gap-3 px-3.5 py-3 text-left text-[15px] font-semibold text-tinta hover:bg-velo/5">
                    <Send className="size-4 text-enlace" aria-hidden />{v.nombre_completo}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Dialogo>
    </>
  )
}
