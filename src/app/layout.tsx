import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import { Geist_Mono, Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from "next/font/google"
import { ToasterTema } from "@/components/tema/toaster-tema"
import { COLOR_BARRA, COOKIE_TEMA, leerTema, SCRIPT_TEMA_SISTEMA } from "@/lib/tema"
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

// Cifras de dinero
const barlowCond = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow-cond',
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ferreléctricos Costa Azul",
  description: "Sistema de gestión comercial",
  applicationName: "Costa Azul",
  appleWebApp: { capable: true, title: "Costa Azul", statusBarStyle: "black-translucent" },
}

export async function generateViewport(): Promise<Viewport> {
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value)
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: tema === 'claro' ? COLOR_BARRA.claro : COLOR_BARRA.oscuro,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Claro, oscuro o el del celular (cookie "tema"; por defecto oscuro). Con "sistema", el script decide antes de pintar.
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value)
  return (
    <html lang="es" className={tema === 'claro' ? undefined : 'dark'} suppressHydrationWarning>
      <head>
        {tema === 'sistema' && <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_SISTEMA }} />}
      </head>
      <body className={`${barlow.variable} ${barlowSemi.variable} ${barlowCond.variable} ${geistMono.variable} min-h-full flex flex-col antialiased font-sans`}>
        {children}
        <ToasterTema />
      </body>
    </html>
  )
}
