'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, KeyRound, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Estado = 'verificando' | 'listo' | 'sin-sesion' | 'guardado'

/** Cuánto se espera a que el enlace del correo deje la sesión iniciada antes de declararlo vencido */
const ESPERA_MS = 4000

/**
 * Crear una contraseña nueva (recuperación o primera vez de un empleado invitado).
 * Se llega aquí desde /auth/confirm, o directamente con el enlace antiguo (#access_token o ?code=), que el cliente de
 * Supabase procesa solo. Se espera esa sesión en vez de mandar al login apenas carga la página.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [estado, setEstado] = useState<Estado>('verificando')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    const listo = () => { if (vigente) setEstado(e => (e === 'verificando' ? 'listo' : e)) }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (sesion && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) listo()
    })
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) listo() })
    const limite = setTimeout(() => {
      if (vigente) setEstado(e => (e === 'verificando' ? 'sin-sesion' : e))
    }, ESPERA_MS)
    return () => { vigente = false; clearTimeout(limite); subscription.unsubscribe() }
  }, [supabase])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return }
    setGuardando(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setGuardando(false)
    if (err) {
      setError(err.message.includes('different from the old')
        ? 'La contraseña nueva debe ser distinta a la anterior'
        : 'No se pudo guardar la contraseña: ' + err.message)
      return
    }
    setEstado('guardado')
    setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1500)
  }

  const CAMPO = 'w-full rounded-xl border border-white/10 bg-[#1a2430] px-4 py-3 pr-11 text-[16px] text-white placeholder:text-steel-500 focus:border-brand-yellow/60 focus:outline-none'
  const ETIQUETA = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-steel-300'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a0e14] px-4 py-8 text-white">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-[#111820] p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-yellow text-steel-900">
            <KeyRound className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-yellow">Crear contraseña</h1>
          <p className="text-sm text-steel-300">Escribe la contraseña con la que vas a entrar al sistema</p>
        </div>

        {estado === 'verificando' && (
          <p className="flex items-center justify-center gap-2 text-sm text-steel-300" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-yellow border-t-transparent" aria-hidden />
            Verificando el enlace…
          </p>
        )}

        {estado === 'sin-sesion' && (
          <div className="space-y-4">
            <p className="flex gap-2 rounded-xl border border-brand-red/40 bg-brand-red/10 p-3 text-sm text-white">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
              <span>El enlace venció o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?» y ábrelo apenas te llegue.</span>
            </p>
            <Link href="/login?recuperar=1" className="block w-full rounded-xl bg-brand-yellow px-4 py-3 text-center text-sm font-bold text-steel-900 hover:brightness-95">
              Pedir un enlace nuevo
            </Link>
          </div>
        )}

        {estado === 'guardado' && (
          <p className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-white" role="status">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden />
            Contraseña guardada. Entrando al sistema…
          </p>
        )}

        {estado === 'listo' && (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label htmlFor="clave" className={ETIQUETA}>Contraseña nueva</label>
              <div className="relative">
                <input id="clave" type={ver ? 'text' : 'password'} required autoComplete="new-password" value={password}
                  onChange={e => setPassword(e.target.value)} className={CAMPO} placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-steel-300 hover:text-white">
                  {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmar" className={ETIQUETA}>Repite la contraseña</label>
              <input id="confirmar" type={ver ? 'text' : 'password'} required autoComplete="new-password" value={confirmar}
                onChange={e => setConfirmar(e.target.value)} className={CAMPO} />
            </div>
            {error && <p className="text-sm text-brand-red" role="alert">{error}</p>}
            <button type="submit" disabled={guardando}
              className="w-full rounded-xl bg-brand-yellow px-4 py-3 text-sm font-bold text-steel-900 hover:brightness-95 disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar y entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
