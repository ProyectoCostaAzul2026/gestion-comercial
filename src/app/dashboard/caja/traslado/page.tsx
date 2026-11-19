import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { saldosMedios } from '@/lib/caja-servidor'
import { EncabezadoPagina } from '@/components/ui/encabezado-pagina'
import { MovimientoCajaForm } from '@/components/modulos/movimiento-caja-form'

export default async function Pagina({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  const { desde } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')
  const volverA = desde === 'contabilidad' ? '/dashboard/contabilidad' : '/dashboard/caja'
  const saldos = await saldosMedios(supabase)

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <EncabezadoPagina titulo="Traslado entre medios" atras={volverA} subtitulo="Pasar dinero de un medio a otro, por ejemplo de Nequi a caja mayor" />
      <MovimientoCajaForm tipo="traslado" saldos={saldos} volverA={volverA} />
    </div>
  )
}
