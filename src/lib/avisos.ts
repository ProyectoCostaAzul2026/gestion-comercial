import { toast as sonner, type ExternalToast } from 'sonner'

/**
 * Avisos (toasts) de la app. Misma forma que `toast` de sonner, pero cada aviso dura lo que toma leerlo:
 * unos 60 ms por letra sobre una base, entre 5 y 12 segundos (los errores, entre 7 y 15). Mientras el dedo o el ratón
 * están encima no se cierran, y todos traen la X para cerrarlos antes.
 *
 *   toast.success('Venta registrada', { description: 'Ticket #1428 · $33.000', action: { label: 'Ver', onClick } })
 *
 * Importar siempre de aquí (no de 'sonner') para que la duración se calcule.
 */

type Tipo = 'success' | 'error' | 'info' | 'warning' | 'message' | 'normal'
type Mensaje = Parameters<typeof sonner>[0]

const textoDe = (m: unknown) => (typeof m === 'string' || typeof m === 'number' ? String(m) : '')

export function duracionLectura(titulo: unknown, descripcion?: unknown, tipo: Tipo = 'normal') {
  const letras = `${textoDe(titulo)} ${textoDe(descripcion)}`.trim().length
  const error = tipo === 'error'
  const ms = (error ? 6000 : 4000) + letras * 60
  return Math.min(error ? 15000 : 12000, Math.max(error ? 7000 : 5000, ms))
}

const con = (tipo: Exclude<Tipo, 'normal'>) => (mensaje: Mensaje, opciones?: ExternalToast) =>
  sonner[tipo](mensaje, { duration: duracionLectura(mensaje, opciones?.description, tipo), ...opciones })

export const toast = Object.assign(
  (mensaje: Mensaje, opciones?: ExternalToast) => sonner(mensaje, { duration: duracionLectura(mensaje, opciones?.description), ...opciones }),
  {
    success: con('success'),
    error: con('error'),
    info: con('info'),
    warning: con('warning'),
    message: con('message'),
    loading: sonner.loading,
    promise: sonner.promise,
    dismiss: sonner.dismiss,
    custom: sonner.custom,
  },
)
