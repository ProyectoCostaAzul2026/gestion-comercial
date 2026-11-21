import { cn } from '@/lib/utils'

const TAM = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
} as const

/** Iniciales de un nombre (dos letras) */
export function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'
}

/**
 * Foto de una persona (empleado o administrador) en un círculo. Sin foto, sus iniciales sobre azul.
 * Usarla en todo lugar que muestre a una persona (la consulta debe traer `foto_url` de profiles).
 */
export function AvatarPersona({ nombre, foto, tam = 'md', className }: {
  nombre: string
  foto?: string | null
  tam?: keyof typeof TAM
  className?: string
}) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue font-bold text-white', TAM[tam], className)} aria-hidden={!foto}>
      {foto
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={foto} alt={nombre} loading="lazy" className="size-full object-cover" />
        : iniciales(nombre)}
    </span>
  )
}
