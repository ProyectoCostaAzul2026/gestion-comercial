'use client'

import { ArrowLeft } from 'lucide-react'
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
        ? 'inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm text-steel-300 hover:text-white'
        : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/5'}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {texto}
    </button>
  )
}
