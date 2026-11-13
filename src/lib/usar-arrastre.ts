'use client'

// Arrastrar una tarjeta sobre otra con el dedo (mantener presionado) o con el ratón.
// Se usa en Inventario para unir un grupo de medidas con otro.
import { useCallback, useEffect, useRef, useState } from 'react'

export interface EstadoArrastre {
  origen: string
  /** Posición del dedo en la pantalla */
  x: number
  y: number
  /** Tarjeta sobre la que está el dedo (nunca la de origen) */
  destino: string | null
}

/** Tiempo que hay que mantener presionado con el dedo para empezar a arrastrar */
const ESPERA_MS = 400
/** Si el dedo se mueve más que esto antes de la espera, es un desplazamiento de la página y no un arrastre */
const HOLGURA_PX = 10
/** Franja de arriba y abajo de la pantalla que desplaza la página mientras se arrastra */
const BORDE_PX = 90
const PASO_PX = 14

interface Gesto {
  clave: string
  tipo: string
  x0: number
  y0: number
  x: number
  y: number
  arrastrando: boolean
  temporizador: ReturnType<typeof setTimeout> | null
}

function tarjetaEn(x: number, y: number, origen: string): string | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-arrastre]')
  const clave = el?.dataset.arrastre
  return clave && clave !== origen ? clave : null
}

/**
 * Devuelve el estado del arrastre y las propiedades que se le ponen a cada tarjeta.
 * `onSoltar(origen, destino)` se llama al soltar una tarjeta sobre otra distinta.
 * Los botones de la tarjeta que no deben iniciar el arrastre llevan `data-sin-arrastre`.
 */
export function useArrastre({ activo, onSoltar }: { activo: boolean; onSoltar: (origen: string, destino: string) => void }) {
  const [estado, setEstado] = useState<EstadoArrastre | null>(null)
  const gesto = useRef<Gesto | null>(null)
  /** El toque que termina un arrastre no debe abrir la tarjeta */
  const sinClic = useRef(false)
  const soltar = useRef(onSoltar)
  const empezarRef = useRef<(() => void) | null>(null)
  useEffect(() => { soltar.current = onSoltar }, [onSoltar])

  const terminar = useCallback(() => {
    const g = gesto.current
    if (g?.temporizador) clearTimeout(g.temporizador)
    gesto.current = null
    setEstado(null)
  }, [])

  useEffect(() => {
    if (!activo) return

    const empezar = () => {
      const g = gesto.current
      if (!g || g.arrastrando) return
      g.arrastrando = true
      if (g.temporizador) clearTimeout(g.temporizador)
      g.temporizador = null
      try { navigator.vibrate?.(25) } catch { /* sin vibración */ }
      // Evita que quede texto seleccionado por mantener presionado
      window.getSelection()?.removeAllRanges()
      setEstado({ origen: g.clave, x: g.x, y: g.y, destino: tarjetaEn(g.x, g.y, g.clave) })
    }

    const alMover = (e: PointerEvent) => {
      const g = gesto.current
      if (!g) return
      g.x = e.clientX
      g.y = e.clientY
      if (!g.arrastrando) {
        if (Math.hypot(g.x - g.x0, g.y - g.y0) < HOLGURA_PX) return
        // Con el ratón, arrastrar empieza al mover; con el dedo, moverse antes de la espera es desplazar la página
        if (g.tipo === 'mouse') empezar()
        else terminar()
        return
      }
      setEstado({ origen: g.clave, x: g.x, y: g.y, destino: tarjetaEn(g.x, g.y, g.clave) })
    }

    const alSoltar = () => {
      const g = gesto.current
      if (!g) return
      const destino = g.arrastrando ? tarjetaEn(g.x, g.y, g.clave) : null
      if (g.arrastrando) {
        sinClic.current = true
        setTimeout(() => { sinClic.current = false }, 350)
      }
      const origen = g.clave
      terminar()
      if (destino) soltar.current(origen, destino)
    }

    // Mientras se arrastra, el dedo no desplaza la página (hay que avisarlo antes de que el navegador empiece a desplazar)
    const alMoverToque = (e: TouchEvent) => {
      if (gesto.current?.arrastrando && e.cancelable) e.preventDefault()
    }
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') terminar() }
    // Si la pestaña pierde el foco a mitad del gesto (llamada, cambio de app), se cancela
    const alOcultar = () => { if (document.hidden) terminar() }

    // Cerca del borde de arriba o de abajo la página se desplaza sola para alcanzar tarjetas que no se ven
    let cuadro = 0
    const desplazar = () => {
      const g = gesto.current
      if (g?.arrastrando) {
        const paso = g.y < BORDE_PX ? -PASO_PX : g.y > window.innerHeight - BORDE_PX ? PASO_PX : 0
        if (paso !== 0) {
          const antes = window.scrollY
          window.scrollBy(0, paso)
          if (window.scrollY !== antes) setEstado({ origen: g.clave, x: g.x, y: g.y, destino: tarjetaEn(g.x, g.y, g.clave) })
        }
      }
      cuadro = requestAnimationFrame(desplazar)
    }
    cuadro = requestAnimationFrame(desplazar)

    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
    window.addEventListener('pointercancel', terminar)
    window.addEventListener('touchmove', alMoverToque, { passive: false })
    window.addEventListener('keydown', alTeclear)
    document.addEventListener('visibilitychange', alOcultar)
    // Lo usa alPresionar para iniciar el arrastre cuando se cumple la espera
    empezarRef.current = empezar
    return () => {
      cancelAnimationFrame(cuadro)
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('pointercancel', terminar)
      window.removeEventListener('touchmove', alMoverToque)
      window.removeEventListener('keydown', alTeclear)
      document.removeEventListener('visibilitychange', alOcultar)
      empezarRef.current = null
      terminar()
    }
  }, [activo, terminar])


  const propsTarjeta = useCallback((clave: string) => {
    if (!activo) return {}
    return {
      'data-arrastre': clave,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (gesto.current) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        if ((e.target as HTMLElement).closest('[data-sin-arrastre]')) return
        const g: Gesto = {
          clave, tipo: e.pointerType, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, arrastrando: false, temporizador: null,
        }
        if (e.pointerType !== 'mouse') g.temporizador = setTimeout(() => empezarRef.current?.(), ESPERA_MS)
        gesto.current = g
      },
      // Mantener presionado no abre el menú del navegador (guardar imagen, copiar…)
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => {
        if (!sinClic.current) return
        sinClic.current = false
        e.preventDefault()
        e.stopPropagation()
      },
    }
  }, [activo])

  return { estado, propsTarjeta }
}
