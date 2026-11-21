'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Ventana modal centrada (base-ui Dialog). Se usa para confirmaciones importantes y formularios cortos que no
 * merecen página propia. Bloquea el fondo, se cierra con Escape o tocando fuera (salvo `modal="obligatoria"`).
 *
 *   <Dialogo abierto={abierto} alCambiar={setAbierto} titulo="Ajustar pago" descripcion="...">
 *     ...contenido...
 *     <PieDialogo>...botones...</PieDialogo>
 *   </Dialogo>
 */
export function Dialogo({
  abierto,
  alCambiar,
  titulo,
  descripcion,
  icono,
  children,
  className,
  obligatoria = false,
  sinCerrar = false,
}: {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  /** Ícono en un círculo a la izquierda del título */
  icono?: React.ReactNode
  children?: React.ReactNode
  className?: string
  /** No se cierra tocando fuera ni con Escape: hay que elegir una opción */
  obligatoria?: boolean
  /** Oculta la X de la esquina */
  sinCerrar?: boolean
}) {
  return (
    <DialogPrimitive.Root
      open={abierto}
      onOpenChange={(abre, detalles) => {
        if (!abre && obligatoria && detalles?.reason !== 'close-press') return
        alCambiar(abre)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/55 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6">
          <DialogPrimitive.Popup
            className={cn(
              'relative w-full max-w-md rounded-2xl border border-linea bg-superficie text-tinta shadow-2xl outline-none transition duration-200 ease-out data-ending-style:translate-y-4 data-ending-style:opacity-0 data-starting-style:translate-y-4 data-starting-style:opacity-0 sm:data-ending-style:translate-y-0 sm:data-ending-style:scale-95 sm:data-starting-style:translate-y-0 sm:data-starting-style:scale-95',
              className,
            )}
          >
            <div className="flex gap-3.5 px-5 pt-5 pr-12">
              {icono && <div className="mt-0.5 shrink-0">{icono}</div>}
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-lg leading-snug font-bold text-tinta">{titulo}</DialogPrimitive.Title>
                {descripcion && <DialogPrimitive.Description className="mt-1.5 text-[15px] leading-relaxed text-suave">{descripcion}</DialogPrimitive.Description>}
              </div>
            </div>
            <div className="px-5 pt-4 pb-5">{children}</div>
            {!sinCerrar && (
              <DialogPrimitive.Close
                className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-suave transition-colors hover:bg-velo/10 hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label="Cerrar"
              >
                <XIcon className="size-5" />
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Fila de botones al pie de un diálogo: en el celular se reparten el ancho; la acción principal va a la derecha. */
export function PieDialogo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-5 grid auto-cols-fr grid-flow-col gap-2.5 [&>*]:h-12 [&>*]:w-full [&>*]:text-[15px]', className)}>{children}</div>
}

/** Resumen de datos dentro de un diálogo: etiqueta a la izquierda, valor a la derecha */
export function DetalleDialogo({ filas, className }: { filas: { etiqueta: React.ReactNode; valor: React.ReactNode; fuerte?: boolean }[]; className?: string }) {
  if (!filas.length) return null
  return (
    <dl className={cn('divide-y divide-linea rounded-xl border border-linea bg-superficie-2 text-[15px]', className)}>
      {filas.map((f, i) => (
        <div key={i} className={cn('flex items-baseline justify-between gap-4 px-3.5 py-2.5', f.fuerte && 'font-bold')}>
          <dt className={cn('text-suave', f.fuerte && 'text-tinta')}>{f.etiqueta}</dt>
          <dd className="text-right text-tinta tabular-nums">{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
