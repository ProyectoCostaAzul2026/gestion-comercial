import type { Metadata } from "next"
import { Geist_Mono, Barlow, Barlow_Semi_Condensed } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-barlow',
})

const barlowSemi = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-barlow-semi',
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ferreléctricos Costa Azul",
  description: "Sistema de gestión comercial",
}

// Tema oscuro por defecto; respeta el modo claro solo si el SO lo pide explícitamente.
const themeScript = `
(function () {
  try {
    var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (!prefersLight) document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${barlow.variable} ${barlowSemi.variable} ${geistMono.variable} min-h-full flex flex-col antialiased font-sans`}>
        {children}
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  )
}