'use client'

import * as React from 'react'
import { AlertTriangle, CircleHelp, Info, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DetalleDialogo, Dialogo, PieDialogo } from '@/components/ui/dialogo'
import { cn } from '@/lib/utils'

/**
 * Confirmaciones y preguntas en ventana modal, desde cualquier parte del código:
 *
 *   if (!(await confirmar({ titulo: '¿Pagar la nómina?', detalle: [...], textoConfirmar: 'Pagar' }))) return
 *   const opcion = await elegir({ titulo: 'Venta en borrador', opciones: [{ valor: 'ir', texto: 'Registrarla' }, ...] })
 *
 * `ProveedorConfirmaciones` (en el layout raíz) dibuja la ventana. Reemplaza a window.confirm y a los "¿Seguro? Sí / No"
 * pequeños: la persona ve qué va a pasar (montos, a quién) antes de aceptar.
 */

export type TonoConfirmacion = 'normal' | 'peligro' | 'aviso' | 'info'

export interface OpcionEleccion<T extends string = string> {
  valor: T
  texto: string
  /** principal: botón de color; peligro: rojo; secundaria: con borde */
  estilo?: 'principal' | 'peligro' | 'secundaria'
}

interface PeticionBase {
  titulo: React.ReactNode
  mensaje?: React.ReactNode
  /** Filas etiqueta / valor con lo que va a pasar */
  detalle?: { etiqueta: React.ReactNode; valor: React.ReactNode; fuerte?: boolean }[]
  tono?: TonoConfirmacion
  /** Obliga a elegir: no se cierra tocando fuera ni con Escape */
  obligatoria?: boolean
}

export interface OpcionesConfirmar extends PeticionBase {
  textoConfirmar?: string
  textoCancelar?: string
  /** Solo un botón (informar algo importante) */
  soloAceptar?: boolean
}

export interface OpcionesElegir<T extends string> extends PeticionBase {
  opciones: OpcionEleccion<T>[]
  /** Las opciones van una debajo de otra (útil con tres o más, o textos largos) */
  enColumna?: boolean
}

type Peticion = PeticionBase & {
  id: number
  opciones: OpcionEleccion[]
  enColumna?: boolean
  resolver: (valor: string | null) => void
}

// ── Almacén sencillo fuera de React, para poder llamar confirmar() desde cualquier función ──
let cola: Peticion[] = []
let siguienteId = 1
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach(o => o())

function pedir(p: Omit<Peticion, 'id' | 'resolver'>): Promise<string | null> {
  return new Promise(resolver => {
    cola = [...cola, { ...p, id: siguienteId++, resolver }]
    avisar()
  })
}

export function elegir<T extends string>(o: OpcionesElegir<T>): Promise<T | null> {
  return pedir(o) as Promise<T | null>
}

export async function confirmar(o: OpcionesConfirmar): Promise<boolean> {
  const tono = o.tono ?? 'normal'
  const opciones: OpcionEleccion[] = o.soloAceptar
    ? [{ valor: 'si', texto: o.textoConfirmar ?? 'Entendido', estilo: 'principal' }]
    : [
        { valor: 'no', texto: o.textoCancelar ?? 'Cancelar', estilo: 'secundaria' },
        { valor: 'si', texto: o.textoConfirmar ?? 'Confirmar', estilo: tono === 'peligro' ? 'peligro' : 'principal' },
      ]
  return (await pedir({ ...o, tono, opciones })) === 'si'
}

const ICONOS: Record<TonoConfirmacion, { icono: React.ElementType; clase: string }> = {
  normal: { icono: CircleHelp, clase: 'bg-enlace/12 text-enlace' },
  peligro: { icono: Trash2, clase: 'bg-sale/12 text-sale' },
  aviso: { icono: AlertTriangle, clase: 'bg-aviso/15 text-aviso' },
  info: { icono: Info, clase: 'bg-enlace/12 text-enlace' },
}

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}
const primera = () => cola[0] ?? null
const ninguna = () => null

export function ProveedorConfirmaciones() {
  const actual = React.useSyncExternalStore(suscribir, primera, ninguna)
  // Mientras se cierra (animación de salida) la petición sigue en la cola, pero la ventana ya va cerrada
  const [cerrando, setCerrando] = React.useState<number | null>(null)

  const responder = (valor: string | null) => {
    if (!actual || cerrando === actual.id) return
    actual.resolver(valor)
    setCerrando(actual.id)
    const id = actual.id
    window.setTimeout(() => {
      cola = cola.filter(p => p.id !== id)
      setCerrando(null)
      avisar()
    }, 180)
  }

  if (!actual) return null
  const { icono: Icono, clase } = ICONOS[actual.tono ?? 'normal']
  const estiloBoton = (e: OpcionEleccion['estilo']) =>
    e === 'principal'
      ? 'bg-accion font-bold text-sobre-accion hover:brightness-105'
      : e === 'peligro'
        ? 'bg-sale font-bold text-white hover:brightness-110'
        : 'border-linea bg-superficie-2 text-tinta hover:bg-velo/5 hover:text-tinta'

  return (
    <Dialogo
      abierto={cerrando !== actual.id}
      alCambiar={a => { if (!a) responder(null) }}
      titulo={actual.titulo}
      descripcion={actual.mensaje}
      obligatoria={actual.obligatoria}
      sinCerrar={actual.obligatoria}
      icono={<span className={cn('flex size-11 items-center justify-center rounded-full', clase)}><Icono className="size-5.5" strokeWidth={2} aria-hidden /></span>}
    >
      {actual.detalle && <DetalleDialogo filas={actual.detalle} />}
      <PieDialogo className={actual.enColumna ? 'grid-flow-row auto-rows-fr' : undefined}>
        {actual.opciones.map(op => (
          <Button
            key={op.valor}
            type="button"
            variant={op.estilo === 'secundaria' || !op.estilo ? 'outline' : 'default'}
            className={estiloBoton(op.estilo ?? 'secundaria')}
            onClick={() => responder(op.valor)}
            autoFocus={op.estilo === 'principal'}
          >
            {op.texto}
          </Button>
        ))}
      </PieDialogo>
    </Dialogo>
  )
}
