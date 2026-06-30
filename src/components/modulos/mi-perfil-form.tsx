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

  return (
    <div className="max-w-md space-y-6">

      {/* Datos del usuario */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-steel-900">
          <span className="h-4 w-1 rounded-full bg-brand-yellow" />
          Información de la cuenta
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-steel-500">Nombre</dt>
            <dd className="text-right font-medium text-steel-900">{perfil.nombre_completo}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-steel-500">Correo</dt>
            <dd className="text-right font-medium text-steel-900">{perfil.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-steel-500">Teléfono</dt>
            <dd className="text-right font-medium text-steel-900">{perfil.telefono ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 pb-2">
            <dt className="text-steel-500">Rol</dt>
            <dd className="text-right font-medium capitalize text-steel-900">{perfil.rol}</dd>
          </div>
        </dl>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-steel-900">
          <span className="h-4 w-1 rounded-full bg-brand-yellow" />
          Cambiar contraseña
        </h2>

        <form onSubmit={handleCambiarPassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-steel-700">Contraseña actual</label>
            <input
              type="password"
              required
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              placeholder="********"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-steel-700">Nueva contraseña</label>
            <input
              type="password"
              required
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-steel-700">Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              value={passwordConfirmar}
              onChange={(e) => setPasswordConfirmar(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              placeholder="Repite la nueva contraseña"
            />
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}
          {exito && <p className="text-sm text-emerald-600">{exito}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-bold text-[#18222b] transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}