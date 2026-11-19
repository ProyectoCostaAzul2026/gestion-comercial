import Link from 'next/link'
import { CalendarDays, DollarSign, Users } from 'lucide-react'

export type SeccionEmpleados = 'equipo' | 'horario' | 'nomina'

const SECCIONES: { clave: SeccionEmpleados; href: string; label: string; corto: string; icono: typeof Users; soloAdmin: boolean }[] = [
  { clave: 'equipo', href: '/dashboard/empleados', label: 'Equipo', corto: 'Equipo', icono: Users, soloAdmin: true },
  { clave: 'horario', href: '/dashboard/empleados/horario', label: 'Horario y permisos', corto: 'Horario', icono: CalendarDays, soloAdmin: false },
  { clave: 'nomina', href: '/dashboard/empleados/nomina', label: 'Nómina', corto: 'Nómina', icono: DollarSign, soloAdmin: true },
]

/**
 * Pestañas de Empleados: Equipo, Horario y permisos, y Nómina son vistas propias dentro del mismo módulo.
 * Un empleado solo entra a Horario y permisos, así que a él no se le muestran las pestañas.
 */
export function EmpleadosSecciones({ actual, esAdmin }: { actual: SeccionEmpleados; esAdmin: boolean }) {
  if (!esAdmin) return null
  return (
    <nav aria-label="Secciones de Empleados" className="grid grid-cols-3 gap-1 rounded-xl bg-fondo p-1 md:flex md:w-fit">
      {SECCIONES.filter(s => esAdmin || !s.soloAdmin).map(s => {
        const activa = s.clave === actual
        const Icono = s.icono
        return (
          <Link key={s.clave} href={s.href} replace aria-current={activa ? 'page' : undefined}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors md:px-4 ${
              activa ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:bg-velo/5 hover:text-tinta'
            }`}>
            <Icono className="h-4 w-4 shrink-0" aria-hidden />
            <span className="md:hidden">{s.corto}</span>
            <span className="hidden md:inline">{s.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
