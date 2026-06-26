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

export interface NavItem {
  label: string
  href: string
  icon: string
  soloAdmin?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: 'Home' },
  { label: 'Ventas', href: '/dashboard/ventas', icon: 'ShoppingCart' },
  { label: 'Inventario', href: '/dashboard/inventario', icon: 'Package' },
  { label: 'Proveedores', href: '/dashboard/proveedores', icon: 'Truck', soloAdmin: true },
  { label: 'Clientes', href: '/dashboard/clientes', icon: 'Users' },
  { label: 'Empleados', href: '/dashboard/empleados', icon: 'UserCog', soloAdmin: true },
  { label: 'Caja', href: '/dashboard/caja', icon: 'Wallet', soloAdmin: true },
  { label: 'Contabilidad', href: '/dashboard/contabilidad', icon: 'BookOpen', soloAdmin: true },
  { label: 'Reportes', href: '/dashboard/reportes', icon: 'BarChart3', soloAdmin: true },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: 'Settings', soloAdmin: true },
]

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
  '/dashboard/nomina',
  '/dashboard/contabilidad',
  
]