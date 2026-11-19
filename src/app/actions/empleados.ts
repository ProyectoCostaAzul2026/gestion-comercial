'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

/** Dirección de la app que está atendiendo (sirve en producción y en vistas previas); si falta, la de la variable */
async function origenApp(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) return `${h.get('x-forwarded-proto') ?? 'https'}://${host}`
  return process.env.NEXT_PUBLIC_SITE_URL ?? ''
}

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

  // Crea el usuario y arma su enlace para crear la contraseña, SIN mandar correo: el correo de Supabase del plan
  // gratuito solo llega a los miembros del equipo del proyecto. El administrador comparte el enlace por WhatsApp.
  const { data: generado, error: invError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: data.email,
    options: {
      data: {
        nombre_completo: data.nombre_completo,
        foto_url: data.foto_url || null,
      },
      redirectTo: `${await origenApp()}/auth/confirm`,
    },
  })

  if (invError) throw new Error(invError.message)
  const invitado = { user: generado.user }

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

  return { id: invitado.user.id, enlace: await enlaceConfirmar(generado.properties.hashed_token, 'invite') }
}

/** Enlace de la app que entra con el token y lleva a crear la contraseña (sirve en cualquier celular) */
async function enlaceConfirmar(tokenHash: string, tipo: 'invite' | 'recovery'): Promise<string> {
  return `${await origenApp()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${tipo}`
}

/**
 * Enlace para que un empleado cree una contraseña nueva, sin depender del correo. Solo el administrador lo genera y
 * lo comparte (WhatsApp o copiar). Vence como los enlaces de correo de Supabase (una hora por defecto) y sirve una vez.
 */
export async function enlaceNuevaContrasena(empleadoId: string): Promise<{ enlace: string }> {
  const cookieStore = await cookies()
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabaseAdmin.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: perfil } = await supabaseAdmin.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') throw new Error('Solo un administrador puede generar este enlace')

  const { data: empleado, error: errUsuario } = await supabaseAdmin.auth.admin.getUserById(empleadoId)
  if (errUsuario || !empleado.user?.email) throw new Error('Este empleado no tiene un correo de acceso')

  const { data: generado, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: empleado.user.email,
    options: { redirectTo: `${await origenApp()}/auth/confirm` },
  })
  if (error) throw new Error(error.message)
  return { enlace: await enlaceConfirmar(generado.properties.hashed_token, 'recovery') }
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