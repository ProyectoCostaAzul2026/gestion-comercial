import { redirect } from 'next/navigation'

// Nómina ahora vive dentro de Empleados
export default function NominaAnterior() {
  redirect('/dashboard/empleados/nomina')
}
