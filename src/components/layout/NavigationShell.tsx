'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, LogOut, Settings, Calendar, DollarSign, BookOpen,
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
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-white">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Gestión Comercial</h2>
          <p className="mt-0.5 text-xs text-slate-500">{nombre}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon]
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
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
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 mt-2"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>

        {/* BottomNav móvil */}
        <nav className="fixed bottom-0 left-0 right-0 flex border-t bg-white md:hidden">
          {visibleItems.slice(0, 4).map((item) => {
            const Icon = iconMap[item.icon]
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                  active ? 'text-slate-900' : 'text-slate-400'
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
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-slate-400"
          >
            <LogOut size={20} />
            Salir
          </button>
        </nav>
      </div>
    </div>
  )
}