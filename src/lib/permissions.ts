// /lib/permissions.ts
// Mapa de permisos por rol — fuente de verdad para el frontend.
// Debe reflejar exactamente la tabla 0.3 del documento de especificaciones
// y mantenerse sincronizado con las políticas RLS en Supabase (sección 4.3).

export type Rol = 'empleado' | 'administrador'

export const esAdmin = (rol?: string | null): boolean => rol === 'administrador'

export type Accion =
  | 'ver_ventas_propias'
  | 'ver_todas_ventas'
  | 'crear_venta'
  | 'anular_venta'
  | 'ver_inventario'
  | 'crear_editar_producto'
  | 'ajustar_stock'
  | 'eliminar_producto'
  | 'ver_clientes'
  | 'crear_editar_cliente'
  | 'ver_proveedores'
  | 'gestionar_proveedores'
  | 'ver_horario'
  | 'editar_horario'
  | 'ver_nomina_propia'
  | 'gestionar_nomina'
  | 'arqueo_caja'
  | 'registrar_gastos'
  | 'retirar_dinero'
  | 'ver_metricas_contables'

// Roles permitidos por acción (tabla 0.3 del documento de especificaciones)
const PERMISOS: Record<Accion, Rol[]> = {
  ver_ventas_propias: ['empleado', 'administrador'],
  ver_todas_ventas: ['administrador'],
  crear_venta: ['empleado', 'administrador'],
  anular_venta: ['administrador'],
  ver_inventario: ['empleado', 'administrador'],
  crear_editar_producto: ['empleado', 'administrador'],
  ajustar_stock: ['empleado', 'administrador'],
  eliminar_producto: ['administrador'],
  ver_clientes: ['empleado', 'administrador'],
  crear_editar_cliente: ['empleado', 'administrador'],
  ver_proveedores: ['administrador'],
  gestionar_proveedores: ['administrador'],
  ver_horario: ['empleado', 'administrador'],
  editar_horario: ['administrador'],
  ver_nomina_propia: ['empleado'],
  gestionar_nomina: ['administrador'],
  arqueo_caja: ['administrador'],
  registrar_gastos: ['administrador'],
  retirar_dinero: ['administrador'],
  ver_metricas_contables: ['administrador'],
}

export function tienePermiso(rol: Rol | string | null | undefined, accion: Accion): boolean {
  if (!rol) return false
  return PERMISOS[accion]?.includes(rol as Rol) ?? false
}

// Uso en componente: const puedeAnular = usePermission('anular_venta')(rolActual)
export function usePermission(accion: Accion) {
  return (rol: Rol | string | null | undefined) => tienePermiso(rol, accion)
}

export type GrupoNav = 'Operación' | 'Equipo' | 'Administración' | 'Sistema'

export interface NavItem {
  label: string
  href: string
  icon: string
  grupo: GrupoNav
  soloAdmin?: boolean
}

export const GRUPOS_NAV: GrupoNav[] = ['Operación', 'Equipo', 'Administración', 'Sistema']

export const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: 'Home', grupo: 'Operación' },
  { label: 'Ventas', href: '/dashboard/ventas', icon: 'ShoppingCart', grupo: 'Operación' },
  { label: 'Inventario', href: '/dashboard/inventario', icon: 'Package', grupo: 'Operación' },
  { label: 'Recepción', href: '/dashboard/recepcion', icon: 'ClipboardCheck', grupo: 'Operación' },
  { label: 'Clientes', href: '/dashboard/clientes', icon: 'Users', grupo: 'Operación' },
  { label: 'Horario y permisos', href: '/dashboard/horario', icon: 'Calendar', grupo: 'Equipo' },
  { label: 'Empleados', href: '/dashboard/empleados', icon: 'UserCog', grupo: 'Equipo', soloAdmin: true },
  { label: 'Nómina', href: '/dashboard/nomina', icon: 'DollarSign', grupo: 'Equipo', soloAdmin: true },
  { label: 'Proveedores', href: '/dashboard/proveedores', icon: 'Truck', grupo: 'Administración', soloAdmin: true },
  { label: 'Caja', href: '/dashboard/caja', icon: 'Wallet', grupo: 'Administración', soloAdmin: true },
  { label: 'Contabilidad', href: '/dashboard/contabilidad', icon: 'BookOpen', grupo: 'Administración', soloAdmin: true },
  { label: 'Reportes', href: '/dashboard/reportes', icon: 'BarChart3', grupo: 'Administración', soloAdmin: true },
  { label: 'Instrucciones', href: '/dashboard/instrucciones', icon: 'HelpCircle', grupo: 'Sistema' },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: 'Settings', grupo: 'Sistema', soloAdmin: true },
]

/** true si la ruta actual pertenece al módulo (también en sus subpáginas) */
export function rutaActiva(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

// Rutas que el middleware protege exclusivamente para Administrador.
// Cuando construyas Nómina/Horario/Contabilidad: Nómina y Contabilidad son
// solo-Admin (agrégalas también a navItems con soloAdmin:true cuando existan).
// Horario es de ambos roles, así que NO va aquí — su edición se restringe
// dentro del propio módulo con tienePermiso('editar_horario', rol).
export const RUTAS_SOLO_ADMIN = [
  '/dashboard/proveedores',
  '/dashboard/empleados',
  '/dashboard/caja',
  '/dashboard/nomina',
  '/dashboard/contabilidad',
  '/dashboard/reportes',
  '/dashboard/configuracion',
]