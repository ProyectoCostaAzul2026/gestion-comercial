import { BotonAtras } from '@/components/ui/boton-atras'

/** Encabezado de página: título, texto de apoyo, texto de apoyo, botón atrás y acciones opcionales */
export function EncabezadoPagina({ titulo, subtitulo, atras, acciones }: {
  titulo: string
  subtitulo?: React.ReactNode
  /** Ruta a la que vuelve si no hay página anterior en la app */
  atras?: string
  acciones?: React.ReactNode
}) {
  return (
    <div className="relative py-1">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          {atras && <BotonAtras href={atras} />}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-tinta md:text-3xl">{titulo}</h1>
            {subtitulo && <p className="mt-0.5 text-sm text-suave">{subtitulo}</p>}
          </div>
        </div>
        {acciones}
      </div>
    </div>
  )
}
