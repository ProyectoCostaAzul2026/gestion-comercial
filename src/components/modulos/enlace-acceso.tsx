'use client'

import { useState } from 'react'
import { toast } from '@/lib/avisos'
import { Check, Copy, KeyRound, MessageCircle } from 'lucide-react'
import { enlaceNuevaContrasena } from '@/app/actions/empleados'
import { enlaceWhatsApp } from '@/lib/whatsapp'

/**
 * Enlace para que un empleado cree su contraseña, listo para mandarlo por WhatsApp o copiarlo.
 * Reemplaza al correo: el correo de Supabase del plan gratuito solo llega a los miembros del equipo del proyecto.
 */
export function EnlaceAcceso({ enlace, nombre, telefono, nuevo = false }: {
  enlace: string
  nombre: string
  telefono?: string | null
  /** Empleado recién creado (cambia el texto del mensaje) */
  nuevo?: boolean
}) {
  const [copiado, setCopiado] = useState(false)
  const primerNombre = nombre.trim().split(/\s+/)[0] || ''
  const texto = nuevo
    ? `Hola ${primerNombre}, ya tienes usuario en el sistema de Ferreléctricos Costa Azul. Entra a este enlace para crear tu contraseña: ${enlace}`
    : `Hola ${primerNombre}, entra a este enlace para crear tu nueva contraseña del sistema de Ferreléctricos Costa Azul: ${enlace}`
  const whatsapp = enlaceWhatsApp(telefono, texto) ?? `https://wa.me/?text=${encodeURIComponent(texto)}`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      toast.success('Enlace copiado')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error('No se pudo copiar; mantén presionado el enlace para copiarlo')
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-superficie p-4">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-[22px] shrink-0 text-enlace" strokeWidth={1.75} aria-hidden />
        <div>
          <h2 className="text-lg font-bold text-tinta">{nuevo ? `Envíale a ${primerNombre} su enlace de acceso` : 'Enlace para crear una contraseña nueva'}</h2>
          <p className="text-[15px] text-suave">
            Con este enlace {primerNombre || 'el empleado'} crea su contraseña desde cualquier celular. Sirve una sola vez y
            vence en una hora: mándalo ya.
          </p>
        </div>
      </div>
      <p className="break-all rounded-xl bg-superficie-2 px-3 py-2.5 text-sm text-suave">{enlace}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accion text-[15px] font-bold text-sobre-accion hover:brightness-105">
          <MessageCircle className="size-5" strokeWidth={2} aria-hidden />Enviar por WhatsApp
        </a>
        <button type="button" onClick={copiar}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-linea bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2">
          {copiado ? <Check className="size-5 text-entra" aria-hidden /> : <Copy className="size-5" strokeWidth={1.75} aria-hidden />}
          {copiado ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>
    </section>
  )
}

/** Botón de la ficha del empleado: genera un enlace nuevo para cambiar la contraseña */
export function GenerarEnlaceContrasena({ empleadoId, nombre, telefono }: { empleadoId: string; nombre: string; telefono?: string | null }) {
  const [enlace, setEnlace] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)

  const generar = async () => {
    setGenerando(true)
    try {
      const r = await enlaceNuevaContrasena(empleadoId)
      setEnlace(r.enlace)
    } catch (e) {
      toast.error('No se pudo generar el enlace: ' + (e as Error).message)
    } finally {
      setGenerando(false)
    }
  }

  if (enlace) return <EnlaceAcceso enlace={enlace} nombre={nombre} telefono={telefono} />
  return (
    <button type="button" onClick={generar} disabled={generando}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-linea bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2 disabled:opacity-60">
      <KeyRound className="size-5 text-enlace" strokeWidth={1.75} aria-hidden />
      {generando ? 'Generando…' : 'Generar enlace para cambiar la contraseña'}
    </button>
  )
}
