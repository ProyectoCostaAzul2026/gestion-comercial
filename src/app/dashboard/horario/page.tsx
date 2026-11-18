import { redirect } from 'next/navigation'

// Horario y permisos ahora vive dentro de Empleados
export default function HorarioAnterior() {
  redirect('/dashboard/empleados/horario')
}
