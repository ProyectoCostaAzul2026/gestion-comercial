import Link from 'next/link'
import { Package } from 'lucide-react'

const TAMANOS = {
  xs: { caja: 'size-9 rounded-lg', icono: 'size-5' },
  sm: { caja: 'size-11 rounded-[9px]', icono: 'size-6' },
  md: { caja: 'size-14 rounded-[10px]', icono: 'size-7' },
  lg: { caja: 'size-24 rounded-2xl', icono: 'size-12' },
} as const

/**
 * Foto del producto sobre baldosa blanca (en los dos modos), entera y sin recortar. Sin foto, el dibujo de un paquete.
 * Todo lugar que muestre un producto la lleva; en un grupo de medidas va una sola, arriba del grupo.
 */
export function MiniaturaProducto({ url, nombre = '', tam = 'sm', className = '' }: {
  url?: string | null
  nombre?: string
  tam?: keyof typeof TAMANOS
  className?: string
}) {
  const t = TAMANOS[tam]
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-inset ring-[#12263a]/10 ${t.caja} ${className}`}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={nombre} loading="lazy" className="h-full w-full object-contain p-0.5" />
        : <Package className={`${t.icono} text-brand-blue`} strokeWidth={1.5} aria-hidden />}
    </span>
  )
}

/** Ruta del detalle de un producto */
export const rutaProducto = (id: string) => `/dashboard/inventario/${id}`

/**
 * Producto con su foto y su nombre, enlazado a su detalle. `detalle` va debajo del nombre (medida, marca, código).
 * Sin `id` (producto borrado o servicio) se muestra igual pero sin enlace.
 */
export function ProductoConFoto({ id, nombre, url, detalle, tam = 'sm', className = '' }: {
  id?: string | null
  nombre: string
  url?: string | null
  detalle?: React.ReactNode
  tam?: keyof typeof TAMANOS
  className?: string
}) {
  const contenido = (
    <>
      <MiniaturaProducto url={url} nombre={nombre} tam={tam} />
      <span className="min-w-0">
        <span className={`block font-semibold leading-tight text-tinta ${id ? 'group-hover/producto:underline' : ''}`}>{nombre}</span>
        {detalle && <span className="mt-0.5 block text-sm text-suave">{detalle}</span>}
      </span>
    </>
  )
  return id
    ? <Link href={rutaProducto(id)} className={`group/producto flex min-w-0 items-center gap-3 ${className}`}>{contenido}</Link>
    : <span className={`flex min-w-0 items-center gap-3 ${className}`}>{contenido}</span>
}

/** Enlace de texto a un registro relacionado (venta, cliente, proveedor, producto) */
export function EnlaceA({ href, children, className = '' }: { href?: string | null; children: React.ReactNode; className?: string }) {
  if (!href) return <>{children}</>
  return <Link href={href} className={`text-enlace underline-offset-2 hover:underline ${className}`}>{children}</Link>
}
