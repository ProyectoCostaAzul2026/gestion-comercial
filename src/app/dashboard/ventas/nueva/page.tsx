import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VentasParalelas } from '@/components/modulos/ventas-paralelas'
import { COLUMNAS_VENTA_EN_CURSO, type VentaEnCurso } from '@/lib/ventas-en-curso'

export default async function NuevaVentaPage({ searchParams }: { searchParams: Promise<{ venta?: string }> }) {
  const { venta } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: clienteGeneral },
    { data: catalogo },
    { data: config },
    { data: guardadas },
    { data: vendedores },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, telefono, nit_cc, email, es_cliente_generico')
      .eq('es_cliente_generico', true)
      .single(),
    supabase
      .from('servicios')
      .select('id, nombre, descripcion, precio')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('configuracion_negocio')
      .select('max_descuento_porcentaje, whatsapp_negocio')
      .single(),
    // Ventas paralelas abiertas o en borrador de quien vende (si la tabla aún no existe, se vende como siempre)
    supabase
      .from('ventas_en_curso')
      .select(COLUMNAS_VENTA_EN_CURSO)
      .eq('vendedor_id', user.id)
      .in('estado', ['abierta', 'borrador'])
      .order('creado_en'),
    supabase
      .from('profiles')
      .select('id, nombre_completo')
      .eq('activo', true)
      .order('nombre_completo'),
  ])

  if (!clienteGeneral) redirect('/dashboard/ventas')

  return (
    <VentasParalelas
      usuarioId={user.id}
      guardadas={(guardadas as unknown as VentaEnCurso[]) ?? []}
      abrir={venta}
      vendedores={vendedores ?? []}
      clienteGeneral={clienteGeneral}
      catalogo={catalogo ?? []}
      maxDescuentoPct={(config as any)?.max_descuento_porcentaje ?? 0.10}
      whatsappNegocio={(config as any)?.whatsapp_negocio ?? null}
    />
  )
}
