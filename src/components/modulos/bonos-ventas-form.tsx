'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/avisos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmar } from '@/components/ui/confirmar'
import { leerBonos, MAX_TOPES, validarTopes, type BonosVentas, type TopeBono } from '@/lib/bonos-ventas'

const vacios = (lista: TopeBono[]) => Array.from({ length: MAX_TOPES }, (_, i) => lista[i] ?? { tope: 0, bono: 0 })
const numero = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^0-9]/g, '')) || 0))
const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`

/** Configuración › Bonos por ventas: tres topes para todos (ventas del día) y tres por venta (individual) */
export function BonosVentasForm({ configId, inicial }: { configId: string | null; inicial: unknown }) {
  const supabase = createClient()
  const router = useRouter()
  const actual = leerBonos(inicial)
  const [equipo, setEquipo] = useState(vacios(actual.equipo))
  const [individual, setIndividual] = useState(vacios(actual.individual))
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    const error = validarTopes(equipo, 'Bono para todos') ?? validarTopes(individual, 'Bono individual')
    if (error) { toast.error('Revisa los bonos', { description: error }); return }
    if (!configId) { toast.error('Primero guarda los datos del negocio'); return }
    const datos: BonosVentas = leerBonos({ equipo, individual })
    const ok = await confirmar({
      titulo: '¿Guardar los bonos por ventas?',
      mensaje: 'Desde hoy la nómina los sugiere solos; tú los apruebas o los quitas antes de pagar.',
      detalle: [
        ...datos.equipo.map((t, i) => ({ etiqueta: `Para todos, tope ${i + 1}: ventas del día ≥ ${pesos(t.tope)}`, valor: `${pesos(t.bono)} c/u` })),
        ...datos.individual.map((t, i) => ({ etiqueta: `Individual, tope ${i + 1}: una venta ≥ ${pesos(t.tope)}`, valor: pesos(t.bono) })),
        ...(datos.equipo.length + datos.individual.length === 0 ? [{ etiqueta: 'Sin bonos', valor: 'No se sugiere ninguno' }] : []),
      ],
      textoConfirmar: 'Guardar bonos',
    })
    if (!ok) return
    setGuardando(true)
    const { error: err } = await supabase.from('configuracion_negocio').update({ bonos_ventas: datos as never }).eq('id', configId)
    setGuardando(false)
    if (err) { toast.error('No se pudieron guardar los bonos', { description: err.message }); return }
    toast.success('Bonos por ventas guardados', { description: 'Aparecen como sugeridos en Empleados › Nómina.' })
    router.refresh()
  }

  const bloque = (
    titulo: string, ayuda: string, icono: React.ReactNode, etiquetaTope: string, lista: TopeBono[],
    cambiar: (l: TopeBono[]) => void, sufijoBono: string,
  ) => (
    <fieldset className="space-y-3 rounded-2xl bg-superficie p-4">
      <legend className="sr-only">{titulo}</legend>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-accion/15 text-enlace">{icono}</span>
        <div>
          <p className="font-bold text-tinta">{titulo}</p>
          <p className="text-sm text-suave">{ayuda}</p>
        </div>
      </div>
      <div className="grid grid-cols-[2rem_1fr_1fr] items-end gap-2 text-sm font-semibold text-suave">
        <span />
        <span>{etiquetaTope}</span>
        <span>Bono {sufijoBono}</span>
      </div>
      {lista.map((t, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
          <span className="text-center text-sm font-bold text-tenue">{i + 1}</span>
          <Input inputMode="numeric" aria-label={`${titulo}: tope ${i + 1}`} placeholder="$0" value={t.tope ? t.tope.toLocaleString('es-CO') : ''}
            onChange={e => cambiar(lista.map((x, j) => (j === i ? { ...x, tope: numero(e.target.value) } : x)))}
            className="cifra h-11 border-linea bg-superficie-2 text-right text-tinta placeholder:text-tenue" />
          <Input inputMode="numeric" aria-label={`${titulo}: bono del tope ${i + 1}`} placeholder="$0" value={t.bono ? t.bono.toLocaleString('es-CO') : ''}
            onChange={e => cambiar(lista.map((x, j) => (j === i ? { ...x, bono: numero(e.target.value) } : x)))}
            className="cifra h-11 border-linea bg-superficie-2 text-right text-tinta placeholder:text-tenue" />
        </div>
      ))}
    </fieldset>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">
        Los bonos se sugieren solos en Empleados › Nómina el día que se alcanza el tope. El administrador aprueba o quita
        cada uno antes de pagar. Deja en blanco los topes que no uses.
      </p>
      {bloque('Bono para todos', 'Si las ventas del día llegan al tope, cada empleado que se paga ese día gana el bono del tope más alto alcanzado.',
        <Users className="size-5" aria-hidden />, 'Ventas del día desde', equipo, setEquipo, 'por empleado')}
      {bloque('Bono individual', 'Por cada venta que un vendedor haga desde el tope, gana el bono de ese tope.',
        <Trophy className="size-5" aria-hidden />, 'Una venta desde', individual, setIndividual, 'por venta')}
      <Button type="button" onClick={guardar} disabled={guardando} className="h-12 w-full bg-accion text-base font-bold text-sobre-accion hover:brightness-105">
        {guardando ? 'Guardando…' : 'Guardar bonos'}
      </Button>
    </div>
  )
}
