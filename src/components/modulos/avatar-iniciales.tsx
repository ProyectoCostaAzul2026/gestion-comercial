/** Foto redonda de una persona o empresa; sin foto, sus iniciales sobre un color fijo según el nombre */
const COLORES = [
  'bg-brand-yellow/20 text-brand-yellow',
  'bg-brand-blue/20 text-brand-blue',
  'bg-emerald-500/20 text-emerald-400',
  'bg-brand-red/20 text-brand-red',
  'bg-amber-500/20 text-amber-400',
]

export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(p => /[\p{L}\p{N}]/u.test(p))
  return ((palabras[0]?.[0] ?? '') + (palabras[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** Número para un enlace tel: (solo dígitos y +) */
export function telefonoMarcable(telefono: string): string {
  return telefono.replace(/[^\d+]/g, '')
}

function colorDe(nombre: string): string {
  let suma = 0
  for (const c of nombre) suma = (suma + c.charCodeAt(0)) % 997
  return COLORES[suma % COLORES.length]
}

export function AvatarIniciales({ nombre, foto, className = 'h-12 w-12 text-base' }: {
  nombre: string
  foto?: string | null
  className?: string
}) {
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={nombre} className={`shrink-0 rounded-full object-cover ${className}`} />
  }
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${colorDe(nombre)} ${className}`}>
      {iniciales(nombre)}
    </span>
  )
}
