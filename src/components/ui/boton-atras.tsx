'use client'

import { ChevronLeft } from 'lucide-react'
import { useNavegacion } from '@/lib/navegacion'

/**
 * Botón Atrás de las páginas internas. Vuelve a la página anterior de la app; si se entró directo por un enlace, va a
 * `href` (la sección superior). Así se comporta igual que el botón Atrás del celular.
 */
export function BotonAtras({ href, etiqueta = 'Volver', texto }: { href: string; etiqueta?: string; texto?: string }) {
  const { volver } = useNavegacion()
  return (
    <button type="button" onClick={() => volver(href)} aria-label={texto ? undefined : etiqueta}
      className={texto
        ? 'inline-flex min-h-11 items-center gap-1 rounded-xl px-1 text-[15px] font-semibold text-suave hover:text-tinta'
        : 'flex size-12 shrink-0 items-center justify-center rounded-xl text-tinta hover:bg-velo/5'}>
      <ChevronLeft className={texto ? 'size-5' : 'size-6'} strokeWidth={2} aria-hidden />
      {texto}
    </button>
  )
}
