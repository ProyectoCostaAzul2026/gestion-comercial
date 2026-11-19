import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Imágenes subidas desde el celular o el computador. Se reducen en el navegador antes de subir (lado mayor y calidad
 * según el uso) y se guardan en Supabase Storage, en el bucket público `imagenes`. La URL pública que queda se guarda en
 * el mismo campo de siempre (`imagen_url`, `logo_url`, `foto_url`), así que una imagen subida y una pegada como enlace
 * se usan igual en toda la app.
 */

export const BUCKET_IMAGENES = 'imagenes'

/** Carpeta del bucket según lo que muestra la imagen */
export type CarpetaImagen = 'productos' | 'categorias' | 'familias' | 'grupos' | 'proveedores' | 'negocio' | 'empleados'

export type PerfilImagen = {
  /** Lado mayor en píxeles: la imagen se reduce hasta este tamaño (nunca se agranda) */
  lado: number
  /** Calidad de compresión, de 0 a 1 */
  calidad: number
  /** Conserva el fondo transparente (logos); si no, el fondo transparente queda blanco */
  transparencia: boolean
}

/**
 * 800 px alcanza para la ficha del producto en un computador y pesa entre 40 y 150 KB en WebP. Los logos conservan la
 * transparencia; las fotos de los empleados son pequeñas porque solo se ven en círculos.
 */
export const PERFILES_IMAGEN: Record<CarpetaImagen, PerfilImagen> = {
  productos: { lado: 800, calidad: 0.8, transparencia: false },
  categorias: { lado: 800, calidad: 0.8, transparencia: false },
  familias: { lado: 800, calidad: 0.8, transparencia: false },
  grupos: { lado: 800, calidad: 0.8, transparencia: false },
  proveedores: { lado: 512, calidad: 0.85, transparencia: true },
  negocio: { lado: 512, calidad: 0.9, transparencia: true },
  empleados: { lado: 400, calidad: 0.8, transparencia: false },
}

/** Archivo original más grande que se acepta (las fotos de celular rondan 3 a 12 MB) */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024
/** Lo más que puede pesar lo que se sube; el bucket rechaza más de esto */
export const MAX_SUBIDA_BYTES = 1024 * 1024

export type ImagenReducida = { blob: Blob; ancho: number; alto: number; tipo: string }

/** Ancho y alto finales: el lado mayor queda en `lado` como máximo, sin agrandar */
export function medidasReducidas(ancho: number, alto: number, lado: number): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= lado || mayor === 0) return { ancho, alto }
  const escala = lado / mayor
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) }
}

export function extensionDeTipo(tipo: string): string {
  if (tipo === 'image/webp') return 'webp'
  if (tipo === 'image/png') return 'png'
  return 'jpg'
}

/** "120 KB", "1,2 MB" */
export function formatoPeso(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** URL de una imagen subida al sistema (no un enlace a otra web) */
export function esImagenDelSistema(url: string | null | undefined): boolean {
  return !!url && url.includes(`/storage/v1/object/public/${BUCKET_IMAGENES}/`)
}

/** Lo que guarda un campo de imagen: la foto subida y el enlace de otra web, por aparte */
export type ValorImagen = { subida: string; enlace: string }

/**
 * Valor inicial de un campo de imagen. Con las columnas por aparte (imagen_subida / imagen_enlace) se usan tal cual; si
 * solo se tiene la imagen que se muestra, se reparte según sea una foto del sistema o un enlace.
 */
export function valorImagen(visible: string | null | undefined, subida?: string | null, enlace?: string | null): ValorImagen {
  if (subida != null || enlace != null) return { subida: subida ?? '', enlace: enlace ?? '' }
  const v = (visible ?? '').trim()
  return esImagenDelSistema(v) ? { subida: v, enlace: '' } : { subida: '', enlace: v }
}

/** La imagen que se muestra: la foto subida si hay, si no el enlace. Vacío si no hay ninguna. */
export function imagenVisible(v: ValorImagen): string {
  return v.subida.trim() || v.enlace.trim()
}

/** Revisa el archivo antes de procesarlo; devuelve el error para mostrar o null */
export function validarArchivoImagen(archivo: { type: string; size: number }): string | null {
  if (!archivo.type.startsWith('image/')) return 'El archivo no es una imagen'
  if (archivo.size > MAX_ORIGINAL_BYTES) return `La imagen pesa ${formatoPeso(archivo.size)}; el máximo es ${formatoPeso(MAX_ORIGINAL_BYTES)}`
  return null
}

async function decodificar(archivo: Blob): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; cerrar: () => void }> {
  // createImageBitmap respeta la orientación de la foto del celular (EXIF) en los navegadores actuales
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(archivo)
      return { fuente: bmp, ancho: bmp.width, alto: bmp.height, cerrar: () => bmp.close() }
    } catch {
      // Algunos navegadores no la decodifican así; se intenta con <img>
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('No se pudo leer la imagen. Prueba con una foto JPG o PNG.'))
      i.src = url
    })
    return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, tipo, calidad))
}

/**
 * Reduce la imagen en el navegador: la escala al lado mayor del perfil y la guarda en WebP. Si el navegador no sabe
 * escribir WebP (Safari viejo), usa JPEG, o PNG cuando hay que conservar la transparencia.
 */
export async function reducirImagen(archivo: Blob, perfil: PerfilImagen): Promise<ImagenReducida> {
  const { fuente, ancho, alto, cerrar } = await decodificar(archivo)
  try {
    if (!ancho || !alto) throw new Error('La imagen está vacía')
    const m = medidasReducidas(ancho, alto, perfil.lado)
    const canvas = document.createElement('canvas')
    canvas.width = m.ancho
    canvas.height = m.alto
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('El navegador no pudo procesar la imagen')
    if (!perfil.transparencia) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, m.ancho, m.alto)
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(fuente, 0, 0, m.ancho, m.alto)

    let blob = await aBlob(canvas, 'image/webp', perfil.calidad)
    if (!blob || blob.type !== 'image/webp') {
      blob = perfil.transparencia
        ? await aBlob(canvas, 'image/png', perfil.calidad)
        : await aBlob(canvas, 'image/jpeg', perfil.calidad)
    }
    if (!blob) throw new Error('El navegador no pudo comprimir la imagen')
    return { blob, ancho: m.ancho, alto: m.alto, tipo: blob.type }
  } finally {
    cerrar()
  }
}

export type ImagenSubida = { url: string; bytes: number; ancho: number; alto: number; bytesOriginal: number }

/** Reduce la imagen y la sube al bucket; devuelve la URL pública para guardar en el campo de imagen */
export async function subirImagen(supabase: SupabaseClient, archivo: File, carpeta: CarpetaImagen): Promise<ImagenSubida> {
  const error = validarArchivoImagen(archivo)
  if (error) throw new Error(error)
  const r = await reducirImagen(archivo, PERFILES_IMAGEN[carpeta])
  if (r.blob.size > MAX_SUBIDA_BYTES) {
    throw new Error(`La imagen reducida todavía pesa ${formatoPeso(r.blob.size)}; prueba con otra foto`)
  }
  const ruta = `${carpeta}/${crypto.randomUUID()}.${extensionDeTipo(r.tipo)}`
  const { error: errSubida } = await supabase.storage.from(BUCKET_IMAGENES).upload(ruta, r.blob, {
    contentType: r.tipo,
    // El nombre es único y no se reescribe: el navegador puede guardarla en caché un año
    cacheControl: '31536000',
    upsert: false,
  })
  if (errSubida) throw new Error(errSubida.message)
  const { data } = supabase.storage.from(BUCKET_IMAGENES).getPublicUrl(ruta)
  return { url: data.publicUrl, bytes: r.blob.size, ancho: r.ancho, alto: r.alto, bytesOriginal: archivo.size }
}
