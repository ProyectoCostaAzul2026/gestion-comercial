'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingBasket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/avisos'
import { elegir } from '@/components/ui/confirmar'
import {
  avisarVentas, describirVenta, eliminarVentaEnCurso, MINUTO_RECORDATORIO, MINUTOS_TRANSFERENCIA,
  minutosRestantesBorrador, misVentasEnCurso, type VentaEnCurso,
} from '@/lib/ventas-en-curso'

const CADA_MS = 15000
const CLAVE_AVISOS = 'ventas-en-curso-avisos'

/**
 * Revisa cada 15 segundos (y al volver a la app) las ventas sin registrar de quien usa la app y avisa con una ventana:
 * - una venta que pasó a borrador (15 minutos sin cambios): registrarla o eliminarla; al minuto 12 del borrador, un
 *   último aviso;
 * - una venta que otro vendedor le pasó: aceptarla o rechazarla;
 * - una venta suya que volvió (rechazada o no aceptada a tiempo).
 * Además muestra el botón «Ventas abiertas» fuera de Nueva venta.
 */
export function VigilanteVentas({ usuarioId }: { usuarioId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const ruta = usePathname()
  const [ventas, setVentas] = useState<VentaEnCurso[]>([])
  const enVenta = ruta?.startsWith('/dashboard/ventas/nueva') ?? false
  const enVentaRef = useRef(enVenta)
  useEffect(() => { enVentaRef.current = enVenta }, [enVenta])
  const ocupado = useRef(false)
  const sinTabla = useRef(false)
  const anteriores = useRef<Map<string, VentaEnCurso>>(new Map())

  const yaAvisado = (clave: string) => {
    try { return (JSON.parse(sessionStorage.getItem(CLAVE_AVISOS) || '[]') as string[]).includes(clave) } catch { return false }
  }
  const marcar = (clave: string) => {
    try {
      const lista = (JSON.parse(sessionStorage.getItem(CLAVE_AVISOS) || '[]') as string[]).slice(-80)
      sessionStorage.setItem(CLAVE_AVISOS, JSON.stringify([...lista, clave]))
    } catch { /* sin almacenamiento: puede repetir un aviso */ }
  }

  const abrirVenta = useCallback((id: string) => {
    if (enVentaRef.current) avisarVentas({ tipo: 'abrir', id })
    else router.push(`/dashboard/ventas/nueva?venta=${id}`)
  }, [router])

  const revisar = useCallback(async () => {
    if (ocupado.current || sinTabla.current || document.visibilityState === 'hidden') return
    ocupado.current = true
    try {
      let lista: VentaEnCurso[]
      try {
        lista = await misVentasEnCurso(supabase, usuarioId)
      } catch (e) {
        // Mientras la tabla no exista (migración sin aplicar) no se revisa más
        if ((e as { code?: string }).code === '42P01' || (e as { code?: string }).code === 'PGRST205') sinTabla.current = true
        return
      }
      setVentas(lista)

      // Ventas que desaparecieron siendo borrador: se eliminaron por tiempo
      const ids = new Set(lista.map(v => v.id))
      for (const [id, v] of anteriores.current) {
        if (!ids.has(id) && v.estado === 'borrador') {
          toast.info('Se eliminó una venta en borrador', { description: `${describirVenta(v)}. Pasaron 15 minutos sin registrarla.` })
          avisarVentas({ tipo: 'eliminada', id })
        }
      }
      for (const v of lista) {
        const antes = anteriores.current.get(v.id)
        if (antes && antes.estado !== v.estado) avisarVentas({ tipo: 'actualizar', id: v.id })
      }
      anteriores.current = new Map(lista.map(v => [v.id, v]))

      for (const v of lista) {
        // 1) Una venta que le pasaron
        const claveTransfer = `transfer:${v.id}:${v.transferida_en}`
        if (v.estado === 'transferida' && !yaAvisado(claveTransfer)) {
          marcar(claveTransfer)
          const quien = v.quien_paso?.nombre_completo ?? 'Otro vendedor'
          const r = await elegir({
            titulo: `${quien} te pasó una venta`,
            mensaje: `${describirVenta(v)}. Si la aceptas, la terminas tú. Si no respondes en ${MINUTOS_TRANSFERENCIA} minutos, vuelve a ${quien}.`,
            tono: 'info',
            obligatoria: true,
            opciones: [
              { valor: 'rechazar', texto: 'Rechazar', estilo: 'secundaria' },
              { valor: 'aceptar', texto: 'Aceptar venta', estilo: 'principal' },
            ],
          })
          if (r === 'aceptar') {
            const { error } = await supabase.rpc('aceptar_venta_en_curso', { p_id: v.id })
            if (error) toast.error('No se pudo aceptar la venta', { description: error.message })
            else { toast.success('Venta aceptada', { description: 'Ya está en tus ventas abiertas.' }); abrirVenta(v.id) }
          } else if (r === 'rechazar') {
            const { error } = await supabase.rpc('rechazar_venta_en_curso', { p_id: v.id })
            if (error) toast.error('No se pudo rechazar la venta', { description: error.message })
            else toast.info(`La venta volvió a ${quien}`)
          }
          continue
        }

        // 2) Una venta suya que volvió
        if (v.nota && v.estado !== 'transferida' && !yaAvisado(`nota:${v.id}:${v.nota}`)) {
          marcar(`nota:${v.id}:${v.nota}`)
          toast.warning('Te devolvieron una venta', { description: `${v.nota}. ${describirVenta(v)}.`, action: { label: 'Abrirla', onClick: () => abrirVenta(v.id) } })
          await supabase.from('ventas_en_curso').update({ nota: null }).eq('id', v.id)
        }

        // 3) Borrador: registrar o eliminar
        if (v.estado === 'borrador') {
          const claveBorrador = `borrador:${v.id}:${v.borrador_desde}`
          const quedan = minutosRestantesBorrador(v.borrador_desde)
          if (!yaAvisado(claveBorrador)) {
            marcar(claveBorrador)
            const r = await elegir({
              titulo: 'Tienes una venta sin registrar',
              mensaje: `${describirVenta(v)}. Lleva 15 minutos sin cambios y quedó en borrador: si no la registras, se elimina en ${quedan} minuto${quedan === 1 ? '' : 's'}.`,
              tono: 'aviso',
              opciones: [
                { valor: 'eliminar', texto: 'Eliminarla', estilo: 'peligro' },
                { valor: 'registrar', texto: 'Ir a registrarla', estilo: 'principal' },
              ],
            })
            if (r === 'registrar') abrirVenta(v.id)
            else if (r === 'eliminar') {
              try {
                await eliminarVentaEnCurso(supabase, v.id)
                avisarVentas({ tipo: 'eliminada', id: v.id })
                anteriores.current.delete(v.id)
                toast.success('Venta eliminada')
              } catch (e) { toast.error('No se pudo eliminar la venta', { description: (e as Error).message }) }
            }
          } else if (15 - quedan >= MINUTO_RECORDATORIO && !yaAvisado(`recordar:${v.id}:${v.borrador_desde}`)) {
            marcar(`recordar:${v.id}:${v.borrador_desde}`)
            toast.warning(`Una venta se elimina en ${quedan} minuto${quedan === 1 ? '' : 's'}`, { description: describirVenta(v), action: { label: 'Registrarla', onClick: () => abrirVenta(v.id) } })
          }
        }
      }
    } finally {
      ocupado.current = false
    }
  }, [supabase, usuarioId, abrirVenta])

  useEffect(() => {
    revisar()
    const t = setInterval(revisar, CADA_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') revisar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver) }
  }, [revisar])

  // Al salir de Nueva venta, revisar enseguida (pudo dejar ventas abiertas)
  useEffect(() => { if (!enVenta) revisar() }, [enVenta, revisar])

  const abiertas = ventas.filter(v => v.estado !== 'transferida')
  if (enVenta || abiertas.length === 0) return null
  const borradores = abiertas.filter(v => v.estado === 'borrador').length
  return (
    <Link href="/dashboard/ventas/nueva?venta=" onClick={e => { e.preventDefault(); router.push(`/dashboard/ventas/nueva?venta=${abiertas[0].id}`) }}
      className="fixed right-3 bottom-[calc(var(--abajo-nav,0px)+5.25rem)] z-40 flex items-center gap-2 rounded-full bg-tinta-fija py-2.5 pr-4 pl-3 text-sm font-bold text-letrero shadow-[0_10px_28px_rgba(0,0,0,.3)] lg:bottom-6">
      <ShoppingBasket className="size-5" aria-hidden />
      {abiertas.length === 1 ? '1 venta abierta' : `${abiertas.length} ventas abiertas`}
      {borradores > 0 && <span className="rounded-full bg-aviso px-1.5 text-xs text-tinta-fija">{borradores} en borrador</span>}
    </Link>
  )
}
