'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from 'lucide-react'

/**
 * Avisos (sonner) con el diseño de la app: tarjeta con franja de color, ícono, título en negrita y detalle debajo.
 * La duración la calcula `toast` de `src/lib/avisos.ts` según lo largo del texto. Sigue la clase "dark" del documento.
 */
export function ToasterTema() {
  const [oscuro, setOscuro] = useState(true)
  useEffect(() => {
    const raiz = document.documentElement
    const leer = () => setOscuro(raiz.classList.contains('dark'))
    leer()
    const obs = new MutationObserver(leer)
    obs.observe(raiz, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return (
    <Toaster
      position="top-center"
      theme={oscuro ? 'dark' : 'light'}
      closeButton
      expand
      visibleToasts={3}
      gap={10}
      offset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 10px)', left: '12px', right: '12px' }}
      style={{ '--width': '440px' } as React.CSSProperties}
      icons={{
        success: <CircleCheck className="size-6 text-entra" strokeWidth={2.2} aria-hidden />,
        error: <CircleAlert className="size-6 text-sale" strokeWidth={2.2} aria-hidden />,
        warning: <TriangleAlert className="size-6 text-aviso" strokeWidth={2.2} aria-hidden />,
        info: <Info className="size-6 text-enlace" strokeWidth={2.2} aria-hidden />,
        loading: <LoaderCircle className="size-6 animate-spin text-suave" strokeWidth={2.2} aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'aviso-app relative flex w-full items-start gap-3 rounded-2xl border border-linea border-l-[5px] bg-superficie py-3.5 pr-12 pl-3.5 font-sans text-tinta shadow-[0_14px_36px_rgba(0,0,0,0.22)]',
          success: 'border-l-entra',
          error: 'border-l-sale',
          warning: 'border-l-aviso',
          info: 'border-l-enlace',
          default: 'border-l-linea-fuerte',
          loading: 'border-l-linea-fuerte',
          icon: 'mt-px flex size-6 shrink-0 items-center justify-center [&>svg]:size-6',
          content: 'min-w-0 flex-1',
          title: 'text-[15px] leading-snug font-bold text-tinta',
          description: 'mt-1 text-sm leading-relaxed text-suave',
          actionButton:
            'shrink-0 self-center rounded-lg bg-accion px-3.5 py-2 text-sm font-bold text-sobre-accion transition hover:brightness-105',
          cancelButton:
            'shrink-0 self-center rounded-lg border border-linea bg-superficie-2 px-3 py-2 text-sm font-semibold text-tinta',
          closeButton:
            '!absolute !top-2.5 !right-2.5 !left-auto !flex !size-8 !translate-x-0 !translate-y-0 !items-center !justify-center !rounded-full !border-0 !bg-transparent text-suave transition-colors hover:!bg-velo/10 hover:text-tinta [&>svg]:size-4',
        },
      }}
    />
  )
}
