'use client'

import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialogo, PieDialogo } from '@/components/ui/dialogo'

const MARCO = 288 // lado del marco en pantalla (px)
const ZOOM_MAX = 4

/**
 * Recorte obligatorio de una foto al formato del sistema: un cuadrado (productos, categorías, familias y grupos) o un
 * círculo (personas). Se arrastra para centrar y se acerca con la barra, la rueda del ratón o pellizcando.
 * Devuelve un JPEG cuadrado de `lado` px; luego subirImagen lo reduce y lo pasa a WebP.
 */
export function RecortarDialogo({ archivo, redonda = false, lado, alCancelar, alRecortar }: {
  archivo: File | null
  redonda?: boolean
  lado: number
  alCancelar: () => void
  alRecortar: (recortado: File) => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const dedos = useRef(new Map<number, { x: number; y: number }>())
  const pellizco = useRef<{ dist: number; zoom: number } | null>(null)

  // Carga la imagen y la centra cubriendo el marco
  useEffect(() => {
    if (!archivo) { setImg(null); return }
    const url = URL.createObjectURL(archivo)
    const i = new Image()
    i.onload = () => {
      setImg(i)
      setZoom(1)
      const s = MARCO / Math.min(i.naturalWidth, i.naturalHeight)
      setPos({ x: (MARCO - i.naturalWidth * s) / 2, y: (MARCO - i.naturalHeight * s) / 2 })
    }
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  const base = img ? MARCO / Math.min(img.naturalWidth, img.naturalHeight) : 1
  const escala = base * zoom
  const ancho = img ? img.naturalWidth * escala : MARCO
  const alto = img ? img.naturalHeight * escala : MARCO
  // La foto siempre cubre el marco: no se puede dejar un borde vacío
  const limitar = (x: number, y: number, an = ancho, al = alto) => ({
    x: Math.min(0, Math.max(MARCO - an, x)),
    y: Math.min(0, Math.max(MARCO - al, y)),
  })

  const cambiarZoom = (nuevo: number) => {
    if (!img) return
    const z = Math.min(ZOOM_MAX, Math.max(1, nuevo))
    const e2 = base * z
    // Acerca hacia el centro del marco
    const cx = (MARCO / 2 - pos.x) / escala
    const cy = (MARCO / 2 - pos.y) / escala
    setZoom(z)
    setPos(limitar(MARCO / 2 - cx * e2, MARCO / 2 - cy * e2, img.naturalWidth * e2, img.naturalHeight * e2))
  }

  const alBajar = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dedos.current.size === 2) {
      const [a, b] = [...dedos.current.values()]
      pellizco.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
      arrastre.current = null
    } else {
      arrastre.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    }
  }
  const alMover = (e: React.PointerEvent) => {
    if (!dedos.current.has(e.pointerId)) return
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pellizco.current && dedos.current.size === 2) {
      const [a, b] = [...dedos.current.values()]
      cambiarZoom(pellizco.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pellizco.current.dist))
      return
    }
    const d = arrastre.current
    if (d) setPos(limitar(d.px + e.clientX - d.x, d.py + e.clientY - d.y))
  }
  const alSoltar = (e: React.PointerEvent) => {
    dedos.current.delete(e.pointerId)
    if (dedos.current.size < 2) pellizco.current = null
    if (dedos.current.size === 0) arrastre.current = null
  }

  const recortar = () => {
    if (!img || !archivo) return
    const lienzo = document.createElement('canvas')
    const salida = Math.min(lado, Math.round(MARCO / escala)) || lado
    lienzo.width = salida
    lienzo.height = salida
    const ctx = lienzo.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, salida, salida)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, -pos.x / escala, -pos.y / escala, MARCO / escala, MARCO / escala, 0, 0, salida, salida)
    lienzo.toBlob(b => {
      if (b) alRecortar(new File([b], archivo.name.replace(/\.[^.]+$/, '') + '-recorte.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  return (
    <Dialogo abierto={!!archivo} alCambiar={a => { if (!a) alCancelar() }} titulo="Ajusta la foto"
      descripcion={redonda ? 'Arrastra para centrar la cara y acerca si hace falta. Así se verá en toda la app.' : 'Arrastra para centrar el producto y acerca si hace falta. Así se verá en toda la app.'}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative touch-none overflow-hidden rounded-2xl bg-[repeating-conic-gradient(#e7ebf0_0_25%,#fff_0_50%)] bg-[length:20px_20px] select-none"
          style={{ width: MARCO, height: MARCO, cursor: arrastre.current ? 'grabbing' : 'grab' }}
          onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
          onWheel={e => cambiarZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
          role="img" aria-label="Vista previa del recorte"
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none"
              style={{ left: pos.x, top: pos.y, width: ancho, height: alto }} />
          )}
          {/* Marco: lo de afuera del círculo se oscurece en las fotos de personas */}
          {redonda && <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_200px_rgba(0,0,0,0.5)]" />}
          <div className={`pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/80 ${redonda ? 'rounded-full' : 'rounded-2xl'}`} />
        </div>
        <div className="flex w-full max-w-[18rem] items-center gap-3">
          <button type="button" onClick={() => cambiarZoom(zoom / 1.2)} aria-label="Alejar" className="flex size-10 items-center justify-center rounded-full border border-linea text-tinta hover:bg-velo/5"><Minus className="size-4" /></button>
          <input type="range" min={1} max={ZOOM_MAX} step={0.01} value={zoom} onChange={e => cambiarZoom(Number(e.target.value))} aria-label="Acercar o alejar" className="h-2 flex-1 accent-[var(--accion)]" />
          <button type="button" onClick={() => cambiarZoom(zoom * 1.2)} aria-label="Acercar" className="flex size-10 items-center justify-center rounded-full border border-linea text-tinta hover:bg-velo/5"><Plus className="size-4" /></button>
        </div>
      </div>
      <PieDialogo>
        <Button type="button" variant="outline" className="border-linea bg-superficie-2 text-tinta hover:bg-velo/5 hover:text-tinta" onClick={alCancelar}>Cancelar</Button>
        <Button type="button" className="bg-accion font-bold text-sobre-accion hover:brightness-105" onClick={recortar} disabled={!img}>Usar la foto</Button>
      </PieDialogo>
    </Dialogo>
  )
}
