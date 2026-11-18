import { BotonAtras } from '@/components/ui/boton-atras'

/** Encabezado de página con las franjas de la marca, título, texto de apoyo, botón atrás y acciones opcionales */
export function EncabezadoPagina({ titulo, subtitulo, atras, acciones }: {
  titulo: string
  subtitulo?: React.ReactNode
  /** Ruta a la que vuelve si no hay página anterior en la app */
  atras?: string
  acciones?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] py-3 pl-4 pr-14 md:py-4 md:pr-28">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          {atras && <BotonAtras href={atras} />}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-brand-yellow md:text-3xl">{titulo}</h1>
            {subtitulo && <p className="mt-0.5 text-xs text-steel-300">{subtitulo}</p>}
          </div>
        </div>
        {acciones}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 overflow-hidden md:w-24">
        <div className="absolute inset-y-0 right-0 w-9 -skew-x-12 translate-x-4 bg-brand-yellow/80 md:w-20 md:translate-x-8" />
        <div className="absolute inset-y-0 right-0 w-3 -skew-x-12 translate-x-1 bg-brand-blue md:w-7" />
      </div>
    </div>
  )
}
