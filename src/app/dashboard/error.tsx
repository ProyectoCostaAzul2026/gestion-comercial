'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  useEffect(() => {
    console.error('Error en el dashboard:', error)
  }, [error])

  const handleCerrarSesion = async () => {
    setCerrandoSesion(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e14] px-4 text-white">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#111820] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-red/15 text-brand-red">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">Algo salió mal</h1>
          <p className="mt-2 text-sm text-steel-300">
            Hubo un problema al cargar esta página. Puedes intentar de nuevo, o cerrar sesión y volver a entrar.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-xl bg-brand-yellow px-4 py-3 text-sm font-bold text-steel-900 hover:brightness-95"
          >
            Intentar de nuevo
          </button>
          <button
            type="button"
            onClick={handleCerrarSesion}
            disabled={cerrandoSesion}
            className="w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-50"
          >
            {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}