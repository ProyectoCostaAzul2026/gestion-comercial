'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Perfil {
  id: string
  nombre_completo: string
  email: string | null
  telefono: string | null
  rol: string
  foto_url: string | null
}

export function MiPerfilForm({ perfil }: { perfil: Perfil }) {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setExito('')

    if (passwordNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (passwordNueva !== passwordConfirmar) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    if (!perfil.email) {
      setError('No se encontró el correo de tu cuenta')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Reautenticar con la contraseña actual antes de cambiarla
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: perfil.email,
      password: passwordActual,
    })

    if (authError) {
      setLoading(false)
      setError('La contraseña actual es incorrecta')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: passwordNueva })
    setLoading(false)

    if (updateError) {
      setError('Error al actualizar la contraseña: ' + updateError.message)
      return
    }

    setExito('Contraseña actualizada correctamente')
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordConfirmar('')
  }

  const iniciales = perfil.nombre_completo
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const inputCls = 'w-full rounded-xl border border-white/10 bg-[#1a2430] px-4 py-3 text-[16px] text-white placeholder:text-steel-500 focus:border-brand-yellow/60 focus:outline-none focus:ring-0'
  const labelCls = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-steel-300'

  return (
    <div className="max-w-md space-y-6">

      {/* Avatar + nombre */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#111820] p-6 text-center">
        {perfil.foto_url ? (
          <img
            src={perfil.foto_url}
            alt={perfil.nombre_completo}
            className="h-20 w-20 rounded-full border-2 border-brand-yellow object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-yellow font-display text-2xl font-black text-steel-900">
            {iniciales}
          </div>
        )}
        <div>
          <p className="font-display text-xl font-bold text-white">{perfil.nombre_completo}</p>
          <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${perfil.rol === 'administrador' ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-white/10 bg-steel-700 text-steel-300'}`}>
            {perfil.rol === 'administrador' ? 'Administrador' : 'Empleado'}
          </span>
        </div>
      </div>

      {/* Datos del usuario */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
          <span className="h-5 w-1 rounded-full bg-brand-yellow" />
          Información de la cuenta
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-white/8 pb-2">
            <dt className="text-steel-300">Nombre</dt>
            <dd className="text-right font-medium text-white">{perfil.nombre_completo}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/8 pb-2">
            <dt className="text-steel-300">Correo</dt>
            <dd className="text-right font-medium text-white">{perfil.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/8 pb-2">
            <dt className="text-steel-300">Teléfono</dt>
            <dd className="text-right font-medium text-white">{perfil.telefono ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 pb-2">
            <dt className="text-steel-300">Rol</dt>
            <dd className="text-right font-medium capitalize text-white">{perfil.rol}</dd>
          </div>
        </dl>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-2xl border border-white/10 bg-[#111820] p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
          <span className="h-5 w-1 rounded-full bg-brand-yellow" />
          Cambiar contraseña
        </h2>

        <form onSubmit={handleCambiarPassword} className="space-y-4">
          <div>
            <label className={labelCls}>Contraseña actual</label>
            <input
              type="password"
              required
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className={inputCls}
              placeholder="********"
            />
          </div>

          <div>
            <label className={labelCls}>Nueva contraseña</label>
            <input
              type="password"
              required
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className={inputCls}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label className={labelCls}>Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              value={passwordConfirmar}
              onChange={(e) => setPasswordConfirmar(e.target.value)}
              className={inputCls}
              placeholder="Repite la nueva contraseña"
            />
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}
          {exito && <p className="text-sm text-emerald-400">{exito}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-yellow px-4 py-3 text-sm font-bold text-steel-900 transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}