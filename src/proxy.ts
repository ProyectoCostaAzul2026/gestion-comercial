import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { RUTAS_SOLO_ADMIN } from '@/lib/permissions'

export async function proxy(request: NextRequest) {
  // Enlace de un correo de Supabase (recuperar contraseña, invitación) que llegó a otra página, por ejemplo a la raíz
  // cuando la dirección de destino no está permitida en Supabase: se pasa a la ruta que lo procesa.
  const sp = request.nextUrl.searchParams
  if (request.nextUrl.pathname !== '/auth/confirm' && (sp.has('token_hash') || (sp.has('code') && !request.nextUrl.pathname.startsWith('/dashboard')))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/confirm'
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single()

    // Cuenta desactivada: invalidar sesión (spec 4.1.6)
    if (profile && !profile.activo) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('motivo', 'cuenta_desactivada')
      return NextResponse.redirect(url)
    }

    // Ruta exclusiva de Admin pero el usuario es empleado (spec 4.2)
    if (RUTAS_SOLO_ADMIN.some((ruta) => pathname.startsWith(ruta)) && profile?.rol !== 'administrador') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/ventas'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}