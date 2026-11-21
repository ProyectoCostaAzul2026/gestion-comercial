'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialogo, PieDialogo } from '@/components/ui/dialogo'

/**
 * Ventana para tomar una foto con la cámara del computador (en el celular se usa la cámara del sistema con
 * `<input capture>`). Muestra la imagen en vivo, captura un cuadro y deja repetir antes de usarla.
 */
export function CamaraDialogo({ abierto, alCerrar, alCapturar, frontal = false }: {
  abierto: boolean
  alCerrar: () => void
  alCapturar: (archivo: File) => void
  /** Empezar con la cámara de frente (fotos de personas) */
  frontal?: boolean
}) {
  const video = useRef<HTMLVideoElement>(null)
  const flujo = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lista, setLista] = useState(false)
  const [captura, setCaptura] = useState<{ url: string; archivo: File } | null>(null)
  const [deFrente, setDeFrente] = useState(frontal)
  const [variasCamaras, setVariasCamaras] = useState(false)

  const apagar = useCallback(() => {
    flujo.current?.getTracks().forEach(t => t.stop())
    flujo.current = null
    setLista(false)
  }, [])

  const encender = useCallback(async (frente: boolean) => {
    apagar()
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara. Usa "Subir foto".')
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: frente ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      flujo.current = s
      if (video.current) {
        video.current.srcObject = s
        await video.current.play().catch(() => {})
      }
      setLista(true)
      const dispositivos = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      setVariasCamaras(dispositivos.filter(d => d.kind === 'videoinput').length > 1)
    } catch (e) {
      const nombre = (e as DOMException).name
      setError(
        nombre === 'NotAllowedError'
          ? 'No hay permiso para usar la cámara. Permítelo en el candado de la barra de direcciones y vuelve a intentar.'
          : nombre === 'NotFoundError' || nombre === 'OverconstrainedError'
            ? 'No se encontró una cámara en este equipo. Usa "Subir foto".'
            : 'No se pudo abrir la cámara. Revisa que otra aplicación no la esté usando.',
      )
    }
  }, [apagar])

  useEffect(() => {
    if (!abierto) { apagar(); setCaptura(null); return }
    encender(deFrente)
    return apagar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => () => { if (captura) URL.revokeObjectURL(captura.url) }, [captura])

  const capturar = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const lienzo = document.createElement('canvas')
    lienzo.width = v.videoWidth
    lienzo.height = v.videoHeight
    const ctx = lienzo.getContext('2d')
    if (!ctx) return
    if (deFrente) { ctx.translate(lienzo.width, 0); ctx.scale(-1, 1) } // como un espejo, igual que la vista previa
    ctx.drawImage(v, 0, 0)
    lienzo.toBlob(b => {
      if (!b) return
      const archivo = new File([b], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setCaptura({ url: URL.createObjectURL(b), archivo })
    }, 'image/jpeg', 0.92)
  }

  const girar = () => {
    const nuevo = !deFrente
    setDeFrente(nuevo)
    encender(nuevo)
  }

  return (
    <Dialogo abierto={abierto} alCambiar={a => { if (!a) alCerrar() }} titulo="Tomar foto" descripcion="Centra el producto o la persona y toca Capturar." className="max-w-xl">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={video} playsInline muted className={`h-full w-full object-cover ${deFrente ? '-scale-x-100' : ''} ${captura ? 'hidden' : ''}`} />
        {captura && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captura.url} alt="Foto tomada" className="h-full w-full object-cover" />
        )}
        {!lista && !captura && !error && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Abriendo la cámara…</p>}
        {error && <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-[15px] text-white">{error}</p>}
        {variasCamaras && !captura && lista && (
          <button type="button" onClick={girar} aria-label="Cambiar de cámara"
            className="absolute right-3 bottom-3 flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/70">
            <SwitchCamera className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <PieDialogo>
        {captura ? (
          <>
            <Button type="button" variant="outline" className="border-linea bg-superficie-2 text-tinta hover:bg-velo/5 hover:text-tinta" onClick={() => setCaptura(null)}>
              <RefreshCw className="size-4" aria-hidden />Repetir
            </Button>
            <Button type="button" className="bg-accion font-bold text-sobre-accion hover:brightness-105" onClick={() => { alCapturar(captura.archivo); alCerrar() }}>
              Usar esta foto
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" className="border-linea bg-superficie-2 text-tinta hover:bg-velo/5 hover:text-tinta" onClick={alCerrar}>Cancelar</Button>
            <Button type="button" className="bg-accion font-bold text-sobre-accion hover:brightness-105" onClick={capturar} disabled={!lista}>
              <Camera className="size-4" aria-hidden />Capturar
            </Button>
          </>
        )}
      </PieDialogo>
    </Dialogo>
  )
}
