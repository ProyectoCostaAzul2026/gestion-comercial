'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, LogOut, Settings, Calendar, DollarSign, BookOpen,
  Zap, Menu, X, ChevronRight,
} from 'lucide-react'
import { navItems } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

const iconMap: Record<string, React.ElementType> = {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, Settings, Calendar, DollarSign, BookOpen,
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

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e14] font-sans text-white">

      {/* ── TOPBAR (con botón hamburguesa) ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#111820] px-4 py-3">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-steel-300 transition-colors active:bg-white/10"
        >
          <Menu size={24} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-yellow text-steel-900">
            <Zap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-black tracking-tight text-white">Costa Azul</span>
        </div>

        {/* Indicador de rol */}
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
          rol === 'administrador'
            ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'
            : 'border-white/10 bg-steel-700 text-steel-300'
        }`}>
          {rol === 'administrador' ? 'Admin' : 'Empleado'}
        </span>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 p-4 md:p-6">{children}</main>

      {/* ── OVERLAY ── */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* ── DRAWER DESLIZANTE ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#111820] text-white shadow-2xl transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera del drawer */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow text-steel-900">
            <Zap className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-black leading-tight text-white">Costa Azul</h2>
            <p className="truncate text-xs text-steel-300">{nombre}</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-steel-300 transition-colors active:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Rol badge */}
        <div className="px-4 pt-3 pb-1">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            rol === 'administrador'
              ? 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow'
              : 'border-white/10 bg-steel-700 text-steel-300'
          }`}>
            {rol === 'administrador' ? 'Administrador' : 'Empleado'}
          </span>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon]
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-brand-yellow text-steel-900'
                    : 'text-steel-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {Icon && <Icon size={20} className="shrink-0" />}
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={16} className="opacity-60" />}
              </Link>
            )
          })}
          <button
            onClick={() => { setDrawerOpen(false); handleLogout() }}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-steel-300 transition-all duration-150 hover:bg-brand-red/15 hover:text-brand-red"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="flex-1 text-left">Salir</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] italic text-steel-500">By: Luis Ortiz</p>
        </div>
      </div>
    </div>
  )
}