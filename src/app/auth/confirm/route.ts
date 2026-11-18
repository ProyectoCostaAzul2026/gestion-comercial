import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Enlaces de los correos de Supabase (recuperar contraseña e invitación de empleados).
// Acepta los dos formatos que puede traer el enlace:
//  - token_hash + type: funciona desde cualquier celular o navegador (plantilla de correo recomendada).
//  - code: el formato por defecto; solo funciona en el mismo navegador donde se pidió el enlace.
// Si el enlace sirve, deja la sesión iniciada y manda a crear la contraseña nueva.
const TIPOS: EmailOtpType[] = ['recovery', 'invite', 'signup', 'magiclink', 'email', 'email_change']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const tipo = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const supabase = await createClient()

  let error: string | null = 'El enlace no es válido.'
  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const r = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
    error = r.error?.message ?? null
  } else if (code) {
    const r = await supabase.auth.exchangeCodeForSession(code)
    error = r.error?.message ?? null
  }

  if (!error) return NextResponse.redirect(`${origin}/auth/reset-password`)

  const destino = new URL('/login', origin)
  destino.searchParams.set('error', 'enlace_invalido')
  return NextResponse.redirect(destino)
}
