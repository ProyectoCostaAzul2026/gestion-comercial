'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, LogOut, Settings, Calendar, DollarSign, BookOpen,
  Zap, Menu, X, HelpCircle, ClipboardCheck, Plus, ShieldCheck,
} from 'lucide-react'
import { GRUPOS_NAV, navItems, rutaActiva, type NavItem } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

const iconMap: Record<string, React.ElementType> = {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, Settings, Calendar, DollarSign, BookOpen, HelpCircle, ClipboardCheck, ShieldCheck,
}

const RUTA_VENDER = '/dashboard/ventas/nueva'

function InsigniaRol({ rol, corta = false }: { rol: string; corta?: boolean }) {
  const admin = rol === 'administrador'
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
      admin ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow' : 'border-white/10 bg-steel-700 text-steel-300'
    }`}>
      {admin ? (corta ? 'Admin' : 'Administrador') : 'Empleado'}
    </span>
  )
}

/** Lista del menú por grupos: la usan el menú lateral del PC y el panel "Más" del celular */
function ListaMenu({ items, pathname, onNavegar, onSalir }: {
  items: NavItem[]
  pathname: string
  onNavegar?: () => void
  onSalir: () => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {GRUPOS_NAV.map(grupo => {
        const delGrupo = items.filter(i => i.grupo === grupo)
        if (delGrupo.length === 0) return null
        return (
          <div key={grupo} className="mb-2">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-steel-500">{grupo}</p>
            {delGrupo.map(item => {
              const Icon = iconMap[item.icon]
              // "Nueva venta" tiene su propio botón: Ventas no se marca mientras se vende
              const active = rutaActiva(pathname, item.href) && !(item.href === '/dashboard/ventas' && pathname === RUTA_VENDER)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavegar}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:bg-white/5 hover:text-white active:bg-white/10'
                  }`}
                >
                  {Icon && <Icon size={20} className="shrink-0" />}
                  <span className="flex-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )
      })}
      <button
        onClick={onSalir}
        className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-steel-300 transition-colors hover:bg-brand-red/15 hover:text-brand-red"
      >
        <LogOut size={20} className="shrink-0" />
        <span className="flex-1 text-left">Salir</span>
      </button>
    </nav>
  )
}

function Marca({ nombre, onNavegar }: { nombre: string; onNavegar?: () => void }) {
  return (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow text-steel-900">
        <Zap className="h-6 w-6" />
      </span>
      <Link href="/dashboard/mi-perfil" onClick={onNavegar} className="min-w-0 flex-1">
        <p className="font-display text-xl font-black leading-tight text-white">Costa Azul</p>
        <p className="truncate text-xs text-steel-300 underline-offset-2 hover:underline">{nombre}</p>
      </Link>
    </>
  )
}

export default function NavigationShell({
  rol,
  nombre,
  children,
}: {
  rol: string
  nombre: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const visibleItems = navItems.filter((item) => !item.soloAdmin || rol === 'administrador')
  const cerrar = () => setDrawerOpen(false)

  // Bloquear scroll del body cuando el panel "Más" está abierto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Escape cierra el panel
  useEffect(() => {
    if (!drawerOpen) return
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [drawerOpen])

  const handleLogout = async () => {
    setDrawerOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Barra inferior del celular: lo que más se usa, a un toque del pulgar
  const pestañas = [
    { href: '/dashboard', label: 'Inicio', Icon: Home },
    { href: '/dashboard/ventas', label: 'Ventas', Icon: ShoppingCart },
    { href: '/dashboard/inventario', label: 'Inventario', Icon: Package },
  ]
  const enPestaña = pathname === RUTA_VENDER || pestañas.some(p => rutaActiva(pathname, p.href))
  const moduloActual = visibleItems.find(i => i.href !== '/dashboard' && rutaActiva(pathname, i.href))

  const pestaña = ({ href, label, Icon }: (typeof pestañas)[number]) => {
    const active = rutaActiva(pathname, href) && pathname !== RUTA_VENDER
    return (
      <Link key={href} href={href} aria-current={active ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors active:bg-white/5 ${active ? 'text-brand-yellow' : 'text-steel-300'}`}>
        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0a0e14] font-sans text-white">

      {/* ── MENÚ LATERAL FIJO (PC) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-[#111820] lg:flex print:hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <Marca nombre={nombre} />
        </div>
        <div className="px-4 pt-3">
          <InsigniaRol rol={rol} />
        </div>
        <div className="px-3 pt-3">
          <Link href={RUTA_VENDER}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-yellow text-sm font-bold text-steel-900 hover:brightness-105">
            <Plus size={18} strokeWidth={3} /> Nueva venta
          </Link>
        </div>
        <ListaMenu items={visibleItems} pathname={pathname} onSalir={handleLogout} />
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-[11px] italic text-steel-500">By: Luis Ortiz</p>
        </div>
      </aside>

      {/* ── BARRA SUPERIOR (celular) ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-white/10 bg-[#111820] px-4 pt-[env(safe-area-inset-top)] lg:hidden print:hidden"
        style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <Link href="/dashboard" aria-label="Ir al inicio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-yellow text-steel-900">
          <Zap className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-black leading-tight tracking-tight text-white">
            {moduloActual?.label ?? 'Costa Azul'}
          </p>
        </div>
        <InsigniaRol rol={rol} corta />
      </header>

      {/* ── CONTENIDO ── */}
      <main className="p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:ml-64 lg:pb-6 print:m-0 print:p-0">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>

      {/* ── BARRA INFERIOR (celular) ── */}
      <nav aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#111820]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex h-16 max-w-xl items-stretch">
          {pestañas.slice(0, 2).map(pestaña)}
          <div className="flex flex-1 items-center justify-center">
            <Link href={RUTA_VENDER} aria-label="Nueva venta" aria-current={pathname === RUTA_VENDER ? 'page' : undefined}
              className={`-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-brand-yellow text-steel-900 shadow-lg shadow-black/50 ring-4 ring-[#0a0e14] transition active:scale-95 ${pathname === RUTA_VENDER ? 'brightness-110' : ''}`}>
              <Plus size={22} strokeWidth={3} />
              <span className="text-[10px] font-bold leading-none">Vender</span>
            </Link>
          </div>
          {pestañas.slice(2).map(pestaña)}
          <button type="button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-label="Abrir el menú completo"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors active:bg-white/5 ${!enPestaña || drawerOpen ? 'text-brand-yellow' : 'text-steel-300'}`}>
            <Menu size={22} strokeWidth={!enPestaña ? 2.5 : 2} />
            Más
          </button>
        </div>
      </nav>

      {/* ── PANEL "MÁS" (celular): sube desde abajo, cerca del pulgar ── */}
      <div
        onClick={cerrar}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú completo"
        inert={!drawerOpen}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-white/10 bg-[#111820] pb-[env(safe-area-inset-bottom)] text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          drawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden />
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Marca nombre={nombre} onNavegar={cerrar} />
          <InsigniaRol rol={rol} corta />
          <button onClick={cerrar} aria-label="Cerrar menú"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-steel-300 transition-colors active:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <ListaMenu items={visibleItems} pathname={pathname} onNavegar={cerrar} onSalir={handleLogout} />
      </div>
    </div>
  )
}
