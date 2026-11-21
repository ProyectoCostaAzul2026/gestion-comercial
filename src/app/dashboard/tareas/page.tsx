import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListChecks } from 'lucide-react'
import { hoyBogota, bogotaEnDias } from '@/lib/fechas'
import { TareasPanel } from '@/components/modulos/tareas-panel'
import type { PlantillaTarea, Tarea } from '@/lib/tareas'

const CAMPOS = 'id, titulo, descripcion, prioridad, asignado_a, fecha_limite, estado, hecha_por, hecha_en, nota, plantilla_id, created_at'

export default async function TareasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  const esAdmin = perfil?.rol === 'administrador'

  // Las tablas de tareas nacen con una migración posterior a los tipos generados
  const [pendientes, hechas, plantillas, { data: empleados }] = await Promise.all([
    supabase.from('tareas').select(CAMPOS).eq('estado', 'pendiente').order('created_at').limit(500),
    supabase.from('tareas').select(CAMPOS).eq('estado', 'hecha')
      .gte('hecha_en', `${bogotaEnDias(-30)}T00:00:00-05:00`).order('hecha_en', { ascending: false }).limit(200),
    esAdmin
      ? supabase.from('tareas_plantillas').select('id, titulo, descripcion, prioridad, asignado_a, veces_usada').order('veces_usada', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('profiles').select('id, nombre_completo, rol, foto_url').eq('activo', true).order('nombre_completo'),
  ])

  const error = pendientes.error ?? hechas.error
  return (
    <div className="space-y-4">
      <div className="relative py-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-tinta md:text-3xl">
          <ListChecks className="h-7 w-7" aria-hidden />Tareas
        </h1>
        <p className="mt-0.5 text-xs text-steel-300">
          {esAdmin ? 'Crea tareas, asígnalas o déjalas libres y mira quién las hizo.' : 'Tus tareas y las libres. Márcalas cuando las termines.'}
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4 text-sm text-tinta">
          La hoja de tareas todavía no está activada en la base de datos.
          <span className="mt-1 block text-xs text-steel-300">Detalle: {error.message}</span>
        </p>
      ) : (
        <TareasPanel
          pendientes={(pendientes.data ?? []) as unknown as Tarea[]}
          hechas={(hechas.data ?? []) as unknown as Tarea[]}
          plantillas={(plantillas.data ?? []) as unknown as PlantillaTarea[]}
          personas={(empleados ?? []).map(e => ({ id: e.id, nombre: e.nombre_completo, rol: e.rol, foto: (e as any).foto_url ?? null }))}
          esAdmin={esAdmin}
          usuarioId={user.id}
          hoy={hoyBogota()}
        />
      )}
    </div>
  )
}
