'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

/** Avisos (sonner) con el mismo modo que la app: sigue la clase "dark" del documento. */
export function ToasterTema() {
  const [oscuro, setOscuro] = useState(true)
  useEffect(() => {
    const raiz = document.documentElement
    const leer = () => setOscuro(raiz.classList.contains('dark'))
    leer()
    const obs = new MutationObserver(leer)
    obs.observe(raiz, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return <Toaster position="top-center" richColors theme={oscuro ? 'dark' : 'light'} />
}
