'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Verificar que hay una sesión activa por el token del email
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Error al actualizar la contraseña: ' + error.message)
      return
    }

    setListo(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Crear contraseña</h1>
          <p className="mt-1 text-sm text-slate-500">
            Establece tu contraseña para acceder al sistema
          </p>
        </div>

        {listo ? (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-green-700 font-medium">¡Contraseña creada!</p>
            <p className="text-sm text-green-600 mt-1">Redirigiendo al sistema…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="Repite la contraseña"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Crear contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}