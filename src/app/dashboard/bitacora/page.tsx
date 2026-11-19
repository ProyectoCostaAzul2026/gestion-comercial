import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ShieldCheck } from 'lucide-react'
import { BitacoraPanel } from '@/components/modulos/bitacora-panel'
import type { BorradoBitacora, RegistroBitacora } from '@/lib/bitacora'

const LIMITE = 300

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ tabla?: string; origen?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')

  // Las tablas de la bitácora nacen con una migración posterior a los tipos generados
  let consulta = supabase.from('bitacora').select('*').order('numero', { ascending: false }).limit(LIMITE + 1)
  if (sp.tabla) consulta = consulta.eq('tabla', sp.tabla)
  if (sp.origen) consulta = consulta.eq('origen', sp.origen)
  // Fechas del filtro en hora de Bogotá (UTC-5 todo el año)
  if (sp.desde) consulta = consulta.gte('ocurrido_en', `${sp.desde}T00:00:00-05:00`)
  if (sp.hasta) consulta = consulta.lte('ocurrido_en', `${sp.hasta}T23:59:59-05:00`)

  const [{ data: filas, error }, { data: borrados }] = await Promise.all([
    consulta,
    supabase.from('bitacora_borrados').select('*').order('id', { ascending: false }).limit(100),
  ])
  const registros = ((filas ?? []) as unknown as RegistroBitacora[])

  return (
    <div className="space-y-4">
      <div className="relative py-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-tinta md:text-3xl">
          <ShieldCheck className="h-7 w-7" aria-hidden />Bitácora
        </h1>
        <p className="mt-0.5 text-xs text-steel-300">
          Cambios importantes del sistema. Nadie puede modificarla ni borrarla desde aquí, tampoco un administrador.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4 text-sm text-tinta">
          La bitácora todavía no está activada en la base de datos: no se pudo leer la bitácora.
          <span className="mt-1 block text-xs text-steel-300">Detalle: {error.message}</span>
        </p>
      ) : (
        <Suspense fallback={<p className="p-8 text-center text-sm text-steel-500">Cargando bitácora…</p>}>
          <BitacoraPanel
            registros={registros.slice(0, LIMITE)}
            borrados={((borrados ?? []) as unknown as BorradoBitacora[])}
            filtros={{ tabla: sp.tabla ?? '', origen: sp.origen ?? '', desde: sp.desde ?? '', hasta: sp.hasta ?? '' }}
            hayMas={registros.length > LIMITE}
          />
        </Suspense>
      )}
    </div>
  )
}
