'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, RotateCw, X } from 'lucide-react'

/**
 * Gráfica que se puede ver en grande. El botón "Ampliar" la abre a pantalla completa:
 * - Con el celular en horizontal (o en un computador) ocupa toda la pantalla.
 * - Con el celular en vertical, en Android se pide girar la pantalla; si el navegador no deja (iPhone), la gráfica se
 *   dibuja girada para aprovechar el largo de la pantalla. Al girar el celular se acomoda sola.
 * `children` recibe `true` cuando está ampliada, para que la gráfica use todo el alto (height="100%").
 */
export function GraficaAmpliable({ titulo, children }: { titulo: string; children: (ampliada: boolean) => ReactNode }) {
  const [abierta, setAbierta] = useState(false)
  const [vertical, setVertical] = useState(false)

  const medir = useCallback(() => setVertical(window.innerHeight > window.innerWidth), [])

  const cerrar = useCallback(() => {
    setAbierta(false)
    try { screen.orientation?.unlock?.() } catch { /* el navegador no lo permite */ }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  async function abrir() {
    medir()
    setAbierta(true)
    // Android: pantalla completa y orientación horizontal. iPhone no lo permite: ahí se gira la gráfica.
    try {
      if (window.innerHeight > window.innerWidth && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        const orientacion = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
        await orientacion.lock?.('landscape')
      }
    } catch { /* sigue con la gráfica girada */ }
    setTimeout(medir, 350)
  }

  useEffect(() => {
    if (!abierta) return
    const alCambiar = () => medir()
    const alTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    const alSalirPantallaCompleta = () => { if (!document.fullscreenElement) medir() }
    window.addEventListener('resize', alCambiar)
    window.addEventListener('orientationchange', alCambiar)
    window.addEventListener('keydown', alTecla)
    document.addEventListener('fullscreenchange', alSalirPantallaCompleta)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', alCambiar)
      window.removeEventListener('orientationchange', alCambiar)
      window.removeEventListener('keydown', alTecla)
      document.removeEventListener('fullscreenchange', alSalirPantallaCompleta)
      document.body.style.overflow = overflow
    }
  }, [abierta, medir, cerrar])

  // Girada 90°: el contenedor mide el alto de la pantalla de ancho y el ancho de alto, y se rota desde la esquina
  const estiloGirada = vertical
    ? { position: 'fixed' as const, top: 0, left: '100vw', width: '100dvh', height: '100vw', transform: 'rotate(90deg)', transformOrigin: 'top left' }
    : undefined

  return (
    <>
      <div className="relative">
        <button type="button" onClick={abrir} aria-label={`Ampliar la gráfica ${titulo}`} title="Ampliar"
          className="absolute -top-1 right-0 z-10 flex h-9 items-center gap-1.5 rounded-lg border border-linea bg-superficie px-2.5 text-xs font-semibold text-suave hover:text-tinta">
          <Maximize2 className="size-4" aria-hidden />Ampliar
        </button>
        <div className="pt-9">{children(false)}</div>
      </div>
      {abierta && createPortal(
        <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-[100] bg-fondo">
          <div className={vertical ? 'flex flex-col bg-fondo' : 'flex h-full w-full flex-col'} style={estiloGirada}>
            <div className="flex items-center gap-3 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <p className="min-w-0 flex-1 truncate text-base font-bold text-tinta">{titulo}</p>
              {vertical && (
                <p className="flex items-center gap-1 text-xs text-tenue">
                  <RotateCw className="size-3.5" aria-hidden />Gira el celular para tocar las barras
                </p>
              )}
              <button type="button" onClick={cerrar} aria-label="Cerrar la gráfica ampliada"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-linea bg-superficie text-tinta">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {/* Girada, los toques no caen donde se ve la barra: la gráfica solo se mira */}
            <div className={`min-h-0 flex-1 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${vertical ? 'pointer-events-none' : ''}`}>
              {children(true)}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
