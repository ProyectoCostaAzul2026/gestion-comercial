'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verClave, setVerClave] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [recuperarEmail, setRecuperarEmail] = useState('')
  const [recuperarMsg, setRecuperarMsg] = useState('')
  const [recuperarLoading, setRecuperarLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('error') === 'perfil_no_encontrado') {
      setError('Tu cuenta no tiene un perfil configurado todavía. Pídele a un administrador que revise tu usuario, o intenta iniciar sesión de nuevo en unos minutos.')
    } else if (sp.get('error') === 'enlace_invalido') {
      setModoRecuperar(true)
      setRecuperarMsg('El enlace venció o ya se usó. Escribe tu correo para recibir uno nuevo.')
    } else if (sp.get('recuperar') === '1') {
      setModoRecuperar(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.')
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
      // La dirección de esta misma app (no depende de una variable de entorno que puede faltar o estar mal)
      redirectTo: `${window.location.origin}/auth/confirm`,
    })

    setRecuperarLoading(false)

    if (error) {
      setRecuperarMsg('Error al enviar el correo: ' + error.message)
      return
    }

    setRecuperarMsg('Si el correo existe, te enviamos un enlace. Si no te llega en unos minutos, pídele al administrador un enlace para crear tu contraseña: lo genera desde tu ficha en Empleados.')
  }

  const inputCls = 'h-[52px] w-full rounded-[10px] border border-linea-fuerte bg-superficie px-3.5 text-[17px] text-tinta placeholder:text-tenue focus:border-accion focus:outline-none focus:ring-3 focus:ring-accion/30'
  const labelCls = 'mb-1.5 block text-sm font-semibold text-suave'
  const botonCls = 'h-14 w-full rounded-xl bg-accion text-lg font-bold text-sobre-accion transition hover:brightness-105 active:scale-[.99] disabled:opacity-60'

  return (
    <div className="flex min-h-dvh justify-center bg-fondo px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-tinta">
      <div className="flex w-full max-w-[420px] flex-col">
        {/* El letrero de la ferretería, colgado con cuatro tornillos */}
        <div className="anim-letrero relative rounded-md bg-letrero px-4 pb-5 pt-6 shadow-[0_10px_24px_rgba(0,0,0,.25)]">
          {['left-2 top-2 rotate-[35deg]', 'right-2 top-2 -rotate-[20deg]', 'bottom-2 left-2 rotate-[80deg]', 'bottom-2 right-2 rotate-[10deg]'].map(pos => (
            <span key={pos} aria-hidden className={`absolute flex size-3 items-center justify-center rounded-full bg-[#d8bc00] shadow-[inset_0_0_0_1.5px_#a88f00] ${pos.split(' ').slice(0, 2).join(' ')}`}>
              <span className={`h-[1.5px] w-[7px] bg-[#8c7700] ${pos.split(' ')[2]}`} />
            </span>
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-costa-azul.webp" alt="Ferreléctricos Costa Azul. No solo vendemos, damos soluciones." width={1200} height={400} className="mx-auto h-auto w-full max-w-[340px]" />
        </div>

        {/* Cinta métrica que sale de su carcasa */}
        <div aria-hidden className="mt-7 flex h-14 items-center">
          <div className="anim-carcasa z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#12263a] shadow-[inset_0_0_0_3px_#27405a]">
            <div className="flex size-[26px] items-center justify-center rounded-full bg-brand-red shadow-[inset_0_0_0_4px_#e8382b]">
              <span className="size-1.5 rounded-full bg-[#12263a]" />
            </div>
          </div>
          <div className="anim-cinta relative -ml-1 flex h-[34px] flex-1 items-end overflow-visible rounded-r-[3px] bg-letrero">
            <div className="regla-mm absolute inset-0" />
            <div className="regla-cm absolute inset-0" />
            <div className="flex w-full overflow-hidden pb-0.5">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className="cifra w-[30px] shrink-0 pl-[3px] text-[13px] font-bold text-[#12263a]">{i + 1}</span>
              ))}
            </div>
            <span className="absolute -right-1.5 -top-1 h-[42px] w-[7px] rounded-sm bg-[#8a97a5]" />
          </div>
        </div>

        <div className="anim-formulario mt-9 flex flex-1 flex-col">
          {modoRecuperar ? (
            <form onSubmit={handleRecuperar} className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">Recupera tu contraseña</h1>
                <p className="text-base text-suave">Te enviamos un enlace al correo para crear una nueva.</p>
              </div>
              <div>
                <label htmlFor="correo-recuperar" className={labelCls}>Correo</label>
                <input id="correo-recuperar" type="email" required autoComplete="email" value={recuperarEmail}
                  onChange={(e) => setRecuperarEmail(e.target.value)} className={inputCls} placeholder="nombre@correo.com" />
              </div>
              {recuperarMsg && <p role="status" className="rounded-xl bg-superficie px-4 py-3 text-[15px] text-tinta">{recuperarMsg}</p>}
              <button type="submit" disabled={recuperarLoading} className={botonCls}>
                {recuperarLoading ? 'Enviando…' : 'Enviar enlace'}
              </button>
              <button type="button" onClick={() => { setModoRecuperar(false); setRecuperarMsg('') }}
                className="mx-auto block h-12 px-3 text-base font-semibold text-enlace">
                Volver a ingresar
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">Ingresa a la tienda</h1>
                <p className="text-base text-suave">Con el correo y la contraseña que te dio el administrador.</p>
              </div>
              <div>
                <label htmlFor="correo" className={labelCls}>Correo</label>
                <input id="correo" type="email" required autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="nombre@correo.com" />
              </div>
              <div>
                <label htmlFor="clave" className={labelCls}>Contraseña</label>
                <div className="relative">
                  <input id="clave" type={verClave ? 'text' : 'password'} required autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-14`} />
                  <button type="button" onClick={() => setVerClave(v => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-0.5 top-0.5 flex size-12 items-center justify-center rounded-lg text-suave hover:text-tinta">
                    {verClave ? <EyeOff className="size-[22px]" strokeWidth={1.75} /> : <Eye className="size-[22px]" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="rounded-xl bg-[color-mix(in_oklab,var(--sale)_13%,transparent)] px-4 py-3 text-[15px] text-tinta">{error}</p>}
              <button type="submit" disabled={loading} className={botonCls}>
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <button type="button" onClick={() => { setModoRecuperar(true); setRecuperarEmail(email) }}
                className="mx-auto block h-12 px-3 text-base font-semibold text-enlace">
                Olvidé mi contraseña
              </button>
            </form>
          )}
          <p className="mt-auto pt-8 text-center text-[13px] text-suave">Ferreléctricos Costa Azul, Bogotá</p>
        </div>
      </div>
    </div>
  )
}
