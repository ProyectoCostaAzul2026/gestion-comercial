import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

const TONOS = {
  aviso: { fondo: 'bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)]', icono: 'text-aviso' },
  sale: { fondo: 'bg-[color-mix(in_oklab,var(--sale)_12%,transparent)]', icono: 'text-sale' },
  entra: { fondo: 'bg-[color-mix(in_oklab,var(--entra)_13%,transparent)]', icono: 'text-entra' },
  info: { fondo: 'bg-[color-mix(in_oklab,var(--enlace)_12%,transparent)]', icono: 'text-enlace' },
} as const

/**
 * Aviso del sistema: fondo suave del color de su tipo, ícono, una frase de qué pasa y qué hacer, y la acción a la derecha.
 * El color nunca va solo: siempre con ícono y texto.
 */
export function Aviso({ tono = 'aviso', icono: Icono, titulo, children, accion, className = '' }: {
  tono?: keyof typeof TONOS
  icono: LucideIcon
  titulo: React.ReactNode
  children?: React.ReactNode
  accion?: { href: string; texto: string }
  className?: string
}) {
  const t = TONOS[tono]
  return (
    <div className={`rounded-[14px] px-4 py-3.5 ${t.fondo} ${className}`}>
      <div className="flex items-start gap-3">
        <Icono className={`mt-0.5 size-[22px] shrink-0 ${t.icono}`} strokeWidth={2} aria-hidden />
        <p className="flex-1 text-[15px] font-semibold leading-snug text-tinta">{titulo}</p>
        {accion && (
          <Link href={accion.href} className="-my-1.5 shrink-0 py-1.5 pl-2 text-[15px] font-bold text-enlace hover:underline">{accion.texto}</Link>
        )}
      </div>
      {children && <div className="mt-2 pl-[34px] text-sm text-suave">{children}</div>}
    </div>
  )
}
