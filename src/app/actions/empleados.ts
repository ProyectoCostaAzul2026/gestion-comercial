'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function invitarEmpleado(data: {
  email: string
  nombre_completo: string
  telefono: string | null
  rol: string
  salario_base: number | null
  foto_url?: string | null
}) {
  const cookieStore = await cookies()

  // Cliente admin con service_role — solo disponible en servidor
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  // Verificar que quien llama es admin
  const { data: { user } } = await supabaseAdmin.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabaseAdmin
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'administrador') throw new Error('Solo un administrador puede crear empleados')

  // Enviar invitación — Supabase manda el email automáticamente
  const { data: invitado, error: invError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: {
        nombre_completo: data.nombre_completo,
        foto_url: data.foto_url || null,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    }
  )

  if (invError) throw new Error(invError.message)

  // Crear perfil
const { error: perfilError } = await supabaseAdmin.from('profiles').upsert({
    id: invitado.user.id,
    nombre_completo: data.nombre_completo,
    telefono: data.telefono,
    email: data.email,
    rol: data.rol,
    salario_base: data.salario_base,
    activo: true,
  })

  if (perfilError) throw new Error(perfilError.message)

  return { id: invitado.user.id }
}

export async function desactivarEmpleado(empleadoId: string) {
  const cookieStore = await cookies()

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseAdmin.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabaseAdmin
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'administrador') throw new Error('Solo un administrador puede desactivar empleados')

  // Deshabilitar en Auth (no puede iniciar sesión)
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(empleadoId, {
    ban_duration: '876600h', // ~100 años = efectivamente desactivado
  })
  if (authError) throw new Error(authError.message)

  // Marcar inactivo en profiles
  const { error: perfilError } = await supabaseAdmin
    .from('profiles')
    .update({ activo: false })
    .eq('id', empleadoId)
  if (perfilError) throw new Error(perfilError.message)
}

export async function reactivarEmpleado(empleadoId: string) {
  const cookieStore = await cookies()

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseAdmin.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabaseAdmin
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'administrador') throw new Error('Solo un administrador puede reactivar empleados')

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(empleadoId, {
    ban_duration: 'none',
  })
  if (authError) throw new Error(authError.message)

  const { error: perfilError } = await supabaseAdmin
    .from('profiles')
    .update({ activo: true })
    .eq('id', empleadoId)
  if (perfilError) throw new Error(perfilError.message)
}