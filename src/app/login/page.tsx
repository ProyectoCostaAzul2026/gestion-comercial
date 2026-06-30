'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('Gestión Comercial')
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [recuperarEmail, setRecuperarEmail] = useState('')
  const [recuperarMsg, setRecuperarMsg] = useState('')
  const [recuperarLoading, setRecuperarLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('configuracion_negocio')
      .select('logo_url, nombre')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url)
        if (data?.nombre) setNegocioNombre(data.nombre)
      })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecuperarMsg('')
    setRecuperarLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(recuperarEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    setRecuperarLoading(false)

    if (error) {
      setRecuperarMsg('Error al enviar el correo: ' + error.message)
      return
    }

    setRecuperarMsg('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.')
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e14] text-white">
      {/* Panel de marca — solo en pantallas grandes */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#111820] p-12 lg:flex">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-yellow text-steel-900">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <span className="font-display text-2xl font-black tracking-tight">{negocioNombre}</span>
        </div>
        <div className="relative z-10">
          <h2 className="font-display text-4xl font-black leading-tight tracking-tight">
            Tu ferretería,<br /><span className="text-brand-yellow">bajo control.</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm text-steel-300">
            Ventas, inventario, caja y reportes en un solo lugar. Rápido en el mostrador, claro para el dueño.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          <span className="h-1.5 w-8 rounded-full bg-brand-yellow" />
          <span className="h-1.5 w-2 rounded-full bg-white/20" />
          <span className="h-1.5 w-2 rounded-full bg-white/20" />
        </div>

        {/* Decoración diagonal */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-48 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-32 -skew-x-12 translate-x-14 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-10 -skew-x-12 translate-x-2 bg-brand-blue" />
        </div>
      </div>

      {/* Formulario */}
      <div className="flex w-full items-center justify-center bg-[#0a0e14] px-4 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-[#111820] p-8">
          <div className="space-y-2 text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="mx-auto h-16 w-auto object-contain"
              />
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-yellow text-steel-900 lg:hidden">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
            )}
            <h1 className="font-display text-2xl font-bold tracking-tight text-brand-yellow">{negocioNombre}</h1>
            <p className="text-sm text-steel-300">Inicia sesión para continuar</p>
          </div>

          {modoRecuperar ? (
            <form onSubmit={handleRecuperar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-steel-700">Correo</label>
                <input
                  type="email"
                  required
                  value={recuperarEmail}
                  onChange={(e) => setRecuperarEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              {recuperarMsg && (
                <p className="text-sm text-steel-700">{recuperarMsg}</p>
              )}

              <button
                type="submit"
                disabled={recuperarLoading}
                className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-bold text-[#18222b] transition-colors hover:brightness-95 disabled:opacity-50"
              >
                {recuperarLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>

              <button
                type="button"
                onClick={() => { setModoRecuperar(false); setRecuperarMsg('') }}
                className="w-full text-center text-sm font-medium text-brand-blue hover:underline"
              >
                Volver a iniciar sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-steel-700">Correo</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-steel-700">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => { setModoRecuperar(true); setRecuperarEmail(email) }}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="********"
                />
              </div>

              {error && <p className="text-sm text-brand-red">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-bold text-[#18222b] transition-colors hover:brightness-95 disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}