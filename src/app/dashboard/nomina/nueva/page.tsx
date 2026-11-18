import { redirect } from 'next/navigation'

// Registrar pago de nómina ahora vive dentro de Empleados (conserva los datos que venían en la dirección)
export default async function NominaNuevaAnterior({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = new URLSearchParams(await searchParams).toString()
  redirect('/dashboard/empleados/nomina/nueva' + (sp ? `?${sp}` : ''))
}
