'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type Estado = 'quieta' | 'cargando' | 'terminando'

/**
 * Barra delgada arriba de la pantalla que aparece apenas se toca un enlace interno y se completa cuando llega la página
 * nueva. Confirma el toque al instante en el celular, antes de que aparezca la silueta de carga.
 */
export function BarraProgreso() {
  const pathname = usePathname()
  const params = useSearchParams()
  const [estado, setEstado] = useState<Estado>('quieta')
  const ruta = `${pathname}?${params.toString()}`
  const anterior = useRef(ruta)
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Llegó la página nueva: se completa y se esconde
  useEffect(() => {
    if (anterior.current === ruta) return
    anterior.current = ruta
    setEstado(e => (e === 'quieta' ? e : 'terminando'))
    const t = setTimeout(() => setEstado('quieta'), 350)
    return () => clearTimeout(t)
  }, [ruta])

  useEffect(() => {
    const empezar = () => {
      setEstado('cargando')
      if (limite.current) clearTimeout(limite.current)
      // Si la navegación se cancela, la barra no se queda pegada
      limite.current = setTimeout(() => setEstado('quieta'), 12000)
    }
    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a')
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return
      const destino = new URL(a.href)
      if (destino.origin !== window.location.origin) return
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return
      empezar()
    }
    document.addEventListener('click', alTocar, true)
    window.addEventListener('popstate', empezar)
    return () => {
      document.removeEventListener('click', alTocar, true)
      window.removeEventListener('popstate', empezar)
      if (limite.current) clearTimeout(limite.current)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full bg-brand-yellow shadow-[0_0_8px_var(--color-brand-yellow)]"
        style={{
          // Visible al instante; avanza despacio mientras carga y se completa y apaga al llegar
          width: estado === 'quieta' ? '0%' : estado === 'cargando' ? '80%' : '100%',
          opacity: estado === 'cargando' ? 1 : 0,
          transition: estado === 'cargando' ? 'width 8s cubic-bezier(.1,.7,.3,1)'
            : estado === 'terminando' ? 'width .25s ease-out, opacity .3s ease .15s' : 'none',
        }}
      />
    </div>
  )
}
