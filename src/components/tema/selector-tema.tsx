'use client'

import { useEffect, useState } from 'react'
import { Moon, Smartphone, Sun } from 'lucide-react'
import { aplicarTema, COOKIE_TEMA, leerTema, type Tema } from '@/lib/tema'

const OPCIONES: { valor: Tema; nombre: string; Icono: typeof Sun }[] = [
  { valor: 'claro', nombre: 'Claro', Icono: Sun },
  { valor: 'oscuro', nombre: 'Oscuro', Icono: Moon },
  { valor: 'sistema', nombre: 'Como el celular', Icono: Smartphone },
]

/** Elegir el modo de la app. Cada persona elige el suyo en su dispositivo. */
export function SelectorTema() {
  const [tema, setTema] = useState<Tema>('oscuro')
  useEffect(() => {
    const c = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_TEMA}=([^;]+)`))
    setTema(leerTema(c?.[1]))
  }, [])

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-base font-semibold text-tinta">Apariencia</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map(({ valor, nombre, Icono }) => {
          const activo = tema === valor
          return (
            <button key={valor} type="button" aria-pressed={activo}
              onClick={() => { setTema(valor); aplicarTema(valor) }}
              className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-sm font-semibold transition-colors ${
                activo ? 'border-accion bg-accion/10 text-tinta' : 'border-linea bg-superficie text-suave hover:text-tinta'}`}>
              <Icono className="size-5" strokeWidth={1.75} aria-hidden />
              {nombre}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
