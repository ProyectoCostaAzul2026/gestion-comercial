'use client'

import { useState } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const handleCerrarSesion = async () => {
    setCerrandoSesion(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#0a0e14', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: 420, textAlign: 'center', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: '#111820', padding: '2rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Algo salió mal</h1>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
              Hubo un problema al cargar la aplicación. Puedes intentar de nuevo, o cerrar sesión y volver a entrar.
            </p>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => reset()}
                style={{ width: '100%', borderRadius: 12, background: '#ffce00', color: '#111820', border: 'none', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Intentar de nuevo
              </button>
              <button
                onClick={handleCerrarSesion}
                disabled={cerrandoSesion}
                style={{ width: '100%', borderRadius: 12, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', opacity: cerrandoSesion ? 0.5 : 1 }}
              >
                {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}