'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, Package, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type CarpetaImagen, esImagenDelSistema, formatoPeso, PERFILES_IMAGEN, subirImagen, type ValorImagen } from '@/lib/imagenes'

/**
 * Campo de imagen con las dos opciones: subir una foto (o tomarla con la cámara del celular), que se reduce sola y se
 * guarda en Supabase Storage, y el enlace de una imagen de otra web. La foto subida tiene prioridad: si hay, es la que
 * se muestra y el enlace queda de respaldo.
 */
export function CampoImagen({
  etiqueta,
  valor,
  onCambio,
  carpeta,
  forma = 'cuadrada',
  vistaPrevia = true,
  enlaceDeRespaldo = true,
  placeholderEnlace = 'https://…',
  ayudaEnlace,
  claseCampo = 'h-12 border-linea-fuerte bg-superficie text-[16px] text-tinta placeholder:text-tenue',
  claseEtiqueta = 'text-[15px] font-semibold text-tinta',
  deshabilitado = false,
}: {
  etiqueta: string
  valor: ValorImagen
  onCambio: (valor: ValorImagen) => void
  /** Carpeta del bucket; define también el tamaño final (ver PERFILES_IMAGEN) */
  carpeta: CarpetaImagen
  /** Cómo se ve la vista previa: foto de producto, foto de persona o logo */
  forma?: 'cuadrada' | 'redonda' | 'logo'
  /** Falso cuando el formulario ya muestra su propia vista previa */
  vistaPrevia?: boolean
  /**
   * Falso donde el formulario solo guarda la imagen que se muestra (pasa por funciones de la base que no conocen el
   * enlace de respaldo): con una foto subida, el enlace no se puede editar hasta quitarla.
   */
  enlaceDeRespaldo?: boolean
  placeholderEnlace?: string
  ayudaEnlace?: string
  claseCampo?: string
  claseEtiqueta?: string
  deshabilitado?: boolean
}) {
  const id = useId()
  const supabase = useMemo(() => createClient(), [])
  const archivoRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const perfil = PERFILES_IMAGEN[carpeta]
  const subida = valor.subida.trim()
  const enlace = valor.enlace.trim()
  const visible = subida || enlace
  const enlaceBloqueado = !!subida && !enlaceDeRespaldo

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!archivo) return
    setSubiendo(true)
    setError(null)
    try {
      const r = await subirImagen(supabase, archivo, carpeta)
      onCambio({ ...valor, subida: r.url })
      toast.success(`Foto cargada: ${r.ancho}×${r.alto} px, ${formatoPeso(r.bytes)} (antes ${formatoPeso(r.bytesOriginal)})`)
    } catch (err) {
      const msg = (err as Error).message || 'No se pudo subir la imagen'
      setError(msg)
      toast.error('No se pudo subir la imagen: ' + msg)
    } finally {
      setSubiendo(false)
    }
  }

  function alEscribirEnlace(texto: string) {
    setError(null)
    // Si pegan la dirección de una foto ya subida al sistema, cuenta como foto subida
    if (esImagenDelSistema(texto.trim())) onCambio({ subida: texto.trim(), enlace: '' })
    else onCambio({ ...valor, enlace: texto })
  }

  const cajaPrevia = forma === 'redonda' ? 'size-20 rounded-full' : forma === 'logo' ? 'h-20 w-24 rounded-xl' : 'size-20 rounded-2xl'

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-enlace`} className={claseEtiqueta}>{etiqueta}</Label>
      <div className="flex items-start gap-3">
        {vistaPrevia && (
          <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-inset ring-[#12263a]/10 ${cajaPrevia}`}>
            {visible
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={visible} alt="Vista previa" className={`h-full w-full ${forma === 'redonda' ? 'object-cover' : 'object-contain p-1'}`} />
              : <Package className="size-8 text-brand-blue" strokeWidth={1.5} aria-hidden />}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => archivoRef.current?.click()} disabled={subiendo || deshabilitado}
              className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-linea bg-superficie-2 px-3 text-[15px] font-semibold text-tinta hover:bg-superficie disabled:opacity-60">
              {subiendo
                ? <><Loader2 className="size-5 animate-spin" aria-hidden />Reduciendo y subiendo…</>
                : <><ImagePlus className="size-5 text-enlace" strokeWidth={1.75} aria-hidden />{subida ? 'Cambiar' : 'Subir foto'}</>}
            </button>
            {subida && !subiendo && (
              <button type="button" onClick={() => { onCambio({ ...valor, subida: '' }); setError(null) }} disabled={deshabilitado}
                aria-label="Quitar la foto subida" title="Quitar la foto subida"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-linea bg-superficie-2 text-suave hover:text-sale disabled:opacity-60">
                <X className="size-5" aria-hidden />
              </button>
            )}
          </div>
          {subida && (
            <p className="text-xs text-entra">
              Se muestra la foto subida.{enlace ? ' El enlace de abajo queda de respaldo.' : ''}
            </p>
          )}
          <input ref={archivoRef} type="file" accept="image/*" className="hidden" onChange={alElegir} tabIndex={-1} aria-hidden />
          <Input id={`${id}-enlace`} type="url" inputMode="url" autoComplete="off" value={valor.enlace} placeholder={placeholderEnlace}
            onChange={e => alEscribirEnlace(e.target.value)} disabled={subiendo || deshabilitado || enlaceBloqueado}
            className={claseCampo} aria-describedby={`${id}-ayuda`} aria-label="Enlace de una imagen de otra web" />
          <p id={`${id}-ayuda`} className="text-xs text-tenue">
            {enlaceBloqueado
              ? 'Para usar un enlace, quita primero la foto subida.'
              : (ayudaEnlace ?? 'Tómala con la cámara, elígela de la galería o pega el enlace de una imagen de otra web.')}
            {' '}La foto subida se reduce sola a {perfil.lado} px y tiene prioridad sobre el enlace.
          </p>
          {error && <p className="text-xs text-sale" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}
