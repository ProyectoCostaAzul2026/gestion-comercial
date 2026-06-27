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
    <div className="flex min-h-screen">
      {/* Panel de marca — solo en pantallas grandes */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#18222b] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-yellow text-[#18222b]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight">{negocioNombre}</span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
            Tu ferretería,<br />bajo control.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-[#9aa7b0]">
            Ventas, inventario, caja y reportes en un solo lugar. Rápido en el mostrador, claro para el dueño.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="h-1.5 w-8 rounded-full bg-brand-yellow" />
          <span className="h-1.5 w-2 rounded-full bg-white/30" />
          <span className="h-1.5 w-2 rounded-full bg-white/30" />
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-yellow/10" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-brand-blue/10" />
      </div>

      {/* Formulario */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-2 text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="mx-auto h-16 w-auto object-contain"
              />
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-yellow text-[#18222b] lg:hidden">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
            )}
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">{negocioNombre}</h1>
            <p className="text-sm text-steel-500">Inicia sesión para continuar</p>
          </div>

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
              <label className="mb-1 block text-sm font-medium text-steel-700">Contraseña</label>
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
        </div>
      </div>
    </div>
  )
}