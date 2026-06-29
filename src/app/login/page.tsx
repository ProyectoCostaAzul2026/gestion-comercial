'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('Gestión Comercial')
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-steel-300">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#1a2430] px-4 text-[16px] text-white placeholder:text-steel-500 focus:border-brand-yellow/60 focus:outline-none"
                placeholder="tucorreo@ejemplo.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-steel-300">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#1a2430] px-4 text-[16px] text-white placeholder:text-steel-500 focus:border-brand-yellow/60 focus:outline-none"
                placeholder="********"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-brand-red/30 bg-brand-red/15 px-3 py-2 text-sm font-medium text-brand-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-brand-yellow text-base font-bold text-steel-900 transition-[filter] hover:brightness-95 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}