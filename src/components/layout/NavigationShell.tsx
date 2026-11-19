'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, LogOut, Settings, Calendar, DollarSign, BookOpen,
  Menu, X, HelpCircle, ClipboardCheck, Plus, ShieldCheck, ListChecks,
} from 'lucide-react'
import { GRUPOS_NAV, navItems, rutaActiva, type NavItem } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { registrarRuta, tomarRefresco } from '@/lib/navegacion'
import { BarraProgreso } from './barra-progreso'

const iconMap: Record<string, React.ElementType> = {
  Home, Package, Users, ShoppingCart, Wallet, Truck, UserCog,
  BarChart3, Settings, Calendar, DollarSign, BookOpen, HelpCircle, ClipboardCheck, ShieldCheck, ListChecks,
}

const RUTA_VENDER = '/dashboard/ventas/nueva'

/** Tareas que ocupan toda la pantalla del celular: sin barras de navegación; la página trae su Atrás y su acción abajo */
const RUTAS_TAREA = [RUTA_VENDER, '/dashboard/caja/gasto', '/dashboard/caja/retiro', '/dashboard/caja/traslado', '/dashboard/caja/pago-proveedor', '/dashboard/caja/cierre']
const esTarea = (ruta: string) => RUTAS_TAREA.some(r => ruta === r || ruta.startsWith(r + '/'))

function InsigniaRol({ rol, corta = false }: { rol: string; corta?: boolean }) {
  const admin = rol === 'administrador'
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
      admin ? 'border-transparent bg-accion/15 text-tinta' : 'border-linea bg-realce text-suave'
    }`}>
      {admin ? (corta ? 'Admin' : 'Administrador') : 'Empleado'}
    </span>
  )
}

/** Lista del menú por grupos: la usan el menú lateral del PC y el panel "Más" del celular */
function ListaMenu({ items, pathname, onNavegar, onSalir, lateral = false }: {
  items: NavItem[]
  pathname: string
  onNavegar?: () => void
  onSalir: () => void
  /** Menú lateral del PC: fondo tinta en los dos modos */
  lateral?: boolean
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {GRUPOS_NAV.map(grupo => {
        const delGrupo = items.filter(i => i.grupo === grupo)
        if (delGrupo.length === 0) return null
        return (
          <div key={grupo} className="mb-2">
            <p className={`px-3 pb-1 pt-2 text-[13px] font-semibold ${lateral ? 'text-sidebar-foreground/75' : 'text-tenue'}`}>{grupo}</p>
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
                  className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] transition-colors ${
                    lateral
                      ? active ? 'bg-sidebar-accent font-bold text-white' : 'font-medium text-sidebar-foreground hover:bg-white/5 hover:text-white'
                      : active ? 'bg-accion/12 font-bold text-tinta' : 'font-medium text-suave hover:bg-velo/5 hover:text-tinta active:bg-velo/10'
                  }`}
                >
                  {Icon && <Icon size={20} strokeWidth={1.75} className={`shrink-0 ${active && !lateral ? 'text-brand-yellow' : ''}`} />}
                  <span className="flex-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )
      })}
      <button
        onClick={onSalir}
        className={`mt-1 flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] font-medium transition-colors ${
          lateral ? 'text-sidebar-foreground hover:bg-white/5 hover:text-white' : 'text-suave hover:bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] hover:text-sale'}`}
      >
        <LogOut size={20} strokeWidth={1.75} className="shrink-0" />
        <span className="flex-1 text-left">Salir</span>
      </button>
    </nav>
  )
}

/** El letrero de la ferretería: el logo sobre el amarillo de la marca */
function Letrero({ className = '' }: { className?: string }) {
  return (
    <span className={`block rounded-md bg-letrero px-1.5 py-1 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-costa-azul.webp" alt="Ferreléctricos Costa Azul" width={1200} height={400} className="h-auto w-full" />
    </span>
  )
}

function Persona({ nombre, rol, onNavegar, lateral = false }: { nombre: string; rol: string; onNavegar?: () => void; lateral?: boolean }) {
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'CA'
  return (
    <Link href="/dashboard/mi-perfil" onClick={onNavegar} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">{iniciales}</span>
      <span className="min-w-0">
        <span className={`block truncate text-[15px] font-semibold ${lateral ? 'text-white' : 'text-tinta'}`}>{nombre}</span>
        <span className={`block text-[13px] ${lateral ? 'text-sidebar-foreground' : 'text-suave'}`}>{rol === 'administrador' ? 'Administrador' : 'Empleado'}, mi perfil</span>
      </span>
    </Link>
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

  const visibleItems = navItems.filter((item) =>
    rol === 'administrador' ? !item.soloEmpleado : !item.soloAdmin)

  // Pila de navegación para el botón Atrás; al volver después de guardar algo, se piden los datos de nuevo
  useEffect(() => {
    registrarRuta(pathname)
    if (tomarRefresco()) router.refresh()
  }, [pathname, router])
  const cerrar = () => setDrawerOpen(false)
  const tarea = esTarea(pathname)

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
        className={`flex flex-1 flex-col items-center justify-center gap-1 text-[13px] transition-colors active:bg-velo/5 ${active ? 'font-bold text-brand-yellow' : 'font-medium text-suave'}`}>
        <Icon size={24} strokeWidth={active ? 2.25 : 1.75} />
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-dvh bg-fondo font-sans text-tinta">
      <Suspense fallback={null}><BarraProgreso /></Suspense>

      {/* ── MENÚ LATERAL FIJO (PC): tinta oscura en los dos modos, con el letrero arriba ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex print:hidden">
        <Link href="/dashboard" aria-label="Ir al inicio" className="mx-3 mt-4"><Letrero /></Link>
        <div className="px-3 pt-4">
          <Link href={RUTA_VENDER}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-letrero text-[17px] font-bold text-tinta-fija hover:brightness-105">
            <Plus size={20} strokeWidth={2.5} /> Vender
          </Link>
        </div>
        <ListaMenu items={visibleItems} pathname={pathname} onSalir={handleLogout} lateral />
        <div className="mx-3 border-t border-white/10 px-1 py-3">
          <Persona nombre={nombre} rol={rol} lateral />
          <p className="mt-2 px-1 text-xs italic text-sidebar-foreground/70">By: Luis Ortiz</p>
        </div>
      </aside>

      {/* ── BARRA SUPERIOR (celular) ── */}
      {!tarea && <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-linea bg-superficie px-4 pt-[env(safe-area-inset-top)] lg:hidden print:hidden"
        style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <Link href="/dashboard" aria-label="Ir al inicio" className="shrink-0 overflow-hidden rounded-[9px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icono-192.png" alt="" width={36} height={36} className="size-9" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold leading-tight text-tinta">
            {moduloActual?.label ?? 'Costa Azul'}
          </p>
        </div>
        <InsigniaRol rol={rol} corta />
      </header>}

      {/* En las tareas no hay barra superior: una franja del color del fondo cubre la barra de estado del celular */}
      {tarea && <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-fondo lg:hidden" />}

      {/* ── CONTENIDO ── */}
      <main className={`p-4 md:p-6 lg:ml-64 lg:pb-6 print:m-0 print:p-0 ${tarea ? 'pb-6 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-6' : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-[calc(5.5rem+env(safe-area-inset-bottom))]'}`}>
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>

      {/* ── BARRA INFERIOR (celular): cuatro destinos y Vender en amarillo al centro; se oculta en las tareas ── */}
      {!tarea && (
        <nav aria-label="Navegación principal"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
          <div className="mx-auto flex h-[68px] max-w-xl items-stretch">
            {pestañas.slice(0, 2).map(pestaña)}
            <Link href={RUTA_VENDER} aria-current={pathname === RUTA_VENDER ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-[13px] font-bold text-tinta active:scale-95">
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-letrero text-tinta-fija shadow-sm">
                <Plus size={24} strokeWidth={2.5} />
              </span>
              <span className="-mt-0.5 leading-none">Vender</span>
            </Link>
            {pestañas.slice(2).map(pestaña)}
            <button type="button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-label="Abrir el menú completo"
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[13px] transition-colors active:bg-velo/5 ${!enPestaña || drawerOpen ? 'font-bold text-brand-yellow' : 'font-medium text-suave'}`}>
              <Menu size={24} strokeWidth={!enPestaña ? 2.25 : 1.75} />
              Más
            </button>
          </div>
        </nav>
      )}

      {!tarea && (<>
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
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-linea bg-superficie pb-[env(safe-area-inset-bottom)] text-tinta shadow-2xl transition-[transform,visibility] duration-300 ease-out lg:hidden ${
          drawerOpen ? 'visible translate-y-0' : 'invisible translate-y-full'
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-velo/20" aria-hidden />
        <div className="flex items-center gap-3 border-b border-linea px-4 py-3">
          <Persona nombre={nombre} rol={rol} onNavegar={cerrar} />
          <button onClick={cerrar} aria-label="Cerrar menú"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-steel-300 transition-colors active:bg-velo/10">
            <X size={20} />
          </button>
        </div>
        <ListaMenu items={visibleItems} pathname={pathname} onNavegar={cerrar} onSalir={handleLogout} />
      </div>
      </>)}
    </div>
  )
}
