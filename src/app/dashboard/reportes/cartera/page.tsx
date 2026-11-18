import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { hoyBogota } from '@/lib/fechas'
import { armarCartera, type Documento } from '@/lib/cartera'
import { EncabezadoPagina } from '@/components/ui/encabezado-pagina'
import { CarteraPanel } from '@/components/modulos/cartera-panel'

// Cartera por edades: créditos de clientes y facturas de proveedores con saldo, por días de mora
export default async function CarteraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')

  const hoy = hoyBogota()
  const [{ data: creditos }, { data: facturas }, { data: negocio }] = await Promise.all([
    traerTodo((a, b) => supabase
      .from('ventas_credito')
      .select('id, saldo_pendiente, fecha_pago_programada, cliente_id, clientes(nombre, telefono), ventas(numero_ticket, fecha)')
      .in('estado', ['pendiente', 'parcial'])
      .order('id').range(a, b)),
    traerTodo((a, b) => supabase
      .from('facturas_proveedor')
      .select('id, numero_factura, fecha_emision, fecha_vencimiento, saldo_pendiente, proveedor_id, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])
      .order('id').range(a, b)),
    supabase.from('configuracion_negocio').select('nombre').maybeSingle(),
  ])

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const docsClientes: Documento[] = (creditos as any[]).map(c => ({
    id: c.id,
    tercero: c.clientes?.nombre ?? 'Cliente',
    terceroId: c.cliente_id,
    telefono: c.clientes?.telefono ?? null,
    referencia: `Ticket #${c.ventas?.numero_ticket ?? '—'}`,
    fecha: c.ventas?.fecha ?? null,
    // Sin fecha de pago acordada se toma la de la venta: desde ese día ya se debe
    vencimiento: c.fecha_pago_programada ?? c.ventas?.fecha ?? null,
    saldo: Number(c.saldo_pendiente),
  }))
  const docsProveedores: Documento[] = (facturas as any[]).map(f => ({
    id: f.id,
    tercero: f.proveedores?.nombre ?? 'Proveedor',
    terceroId: f.proveedor_id,
    referencia: f.numero_factura ? `Factura ${f.numero_factura}` : 'Factura sin número',
    fecha: f.fecha_emision,
    vencimiento: f.fecha_vencimiento ?? f.fecha_emision,
    saldo: Number(f.saldo_pendiente),
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-4">
      <EncabezadoPagina titulo="Cartera por edades" atras="/dashboard/reportes"
        subtitulo="Lo que te deben y lo que debes, según los días de mora" />
      <CarteraPanel
        hoy={hoy}
        negocio={negocio?.nombre ?? 'Ferreléctricos Costa Azul'}
        clientes={armarCartera(docsClientes, hoy)}
        proveedores={armarCartera(docsProveedores, hoy)}
      />
    </div>
  )
}
