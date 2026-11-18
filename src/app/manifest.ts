import type { MetadataRoute } from 'next'

// Permite instalar la app en la pantalla de inicio del celular (se abre sin la barra del navegador)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ferreléctricos Costa Azul',
    short_name: 'Costa Azul',
    description: 'Sistema de gestión comercial',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es',
    background_color: '#0a0e14',
    theme_color: '#111820',
    icons: [
      { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
