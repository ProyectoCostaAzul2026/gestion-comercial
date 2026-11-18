import Link from 'next/link'
import { CalendarDays, DollarSign, Users } from 'lucide-react'

export type SeccionEmpleados = 'equipo' | 'horario' | 'nomina'

const SECCIONES: { clave: SeccionEmpleados; href: string; label: string; icono: typeof Users; soloAdmin: boolean }[] = [
  { clave: 'equipo', href: '/dashboard/empleados', label: 'Equipo', icono: Users, soloAdmin: true },
  { clave: 'horario', href: '/dashboard/empleados/horario', label: 'Horario y permisos', icono: CalendarDays, soloAdmin: false },
  { clave: 'nomina', href: '/dashboard/empleados/nomina', label: 'Nómina', icono: DollarSign, soloAdmin: true },
]

/**
 * Pestañas de Empleados: Equipo, Horario y permisos, y Nómina son vistas propias dentro del mismo módulo.
 * Un empleado solo entra a Horario y permisos, así que a él no se le muestran las pestañas.
 */
export function EmpleadosSecciones({ actual, esAdmin }: { actual: SeccionEmpleados; esAdmin: boolean }) {
  if (!esAdmin) return null
  return (
    <nav aria-label="Secciones de Empleados"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
      {SECCIONES.filter(s => esAdmin || !s.soloAdmin).map(s => {
        const activa = s.clave === actual
        const Icono = s.icono
        return (
          <Link key={s.clave} href={s.href} replace aria-current={activa ? 'page' : undefined}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
              activa
                ? 'border-brand-yellow bg-brand-yellow/15 text-brand-yellow'
                : 'border-white/10 bg-[#111820] text-steel-300 hover:border-white/20 hover:text-white'
            }`}>
            <Icono className="h-4 w-4" aria-hidden />
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}
