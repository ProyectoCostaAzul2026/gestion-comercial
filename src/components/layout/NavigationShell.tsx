'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, LogOut, Settings, Calendar, DollarSign, BookOpen, Zap,
} from 'lucide-react'
import { navItems } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

  const visibleItems = navItems.filter((item) => !item.soloAdmin || rol === 'administrador')

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:bg-steel-900 md:text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow text-steel-900">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold leading-tight">Costa Azul</h2>
            <p className="text-xs text-steel-300">{nombre}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon]
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-yellow text-steel-900'
                    : 'text-steel-300 hover:bg-steel-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}

          {/* Cerrar sesión dentro del nav */}
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-steel-300 transition-colors hover:bg-brand-red/15 hover:text-brand-red"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </nav>
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-[11px] italic text-steel-300">By: Luis Ortiz</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>

        {/* BottomNav móvil */}
        <nav className="fixed bottom-0 left-0 right-0 flex border-t border-steel-700 bg-steel-900 md:hidden">
          {visibleItems.slice(0, 4).map((item) => {
            const Icon = iconMap[item.icon]
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  active ? 'text-brand-yellow' : 'text-steel-300'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
          {/* Cerrar sesión en móvil */}
          <button
            onClick={handleLogout}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-steel-300"
          >
            <LogOut size={20} />
            Salir
          </button>
        </nav>
      </div>
    </div>
  )
}