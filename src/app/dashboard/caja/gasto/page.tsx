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
  const [saldos, { data: categorias }, { data: proveedores }] = await Promise.all([
    saldosMedios(supabase),
    supabase.from('categorias_gasto').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <EncabezadoPagina titulo="Registrar gasto" atras={volverA} subtitulo="Lo que se paga del día a día: insumos, transporte, servicios, arriendo" />
      <MovimientoCajaForm tipo="gasto" saldos={saldos} volverA={volverA} categoriasGasto={categorias ?? []} proveedores={proveedores ?? []} />
    </div>
  )
}
