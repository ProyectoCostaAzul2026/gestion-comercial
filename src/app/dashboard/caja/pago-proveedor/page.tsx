import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyBogota } from '@/lib/fechas'
import { diasVencido } from '@/lib/cartera'
import { EncabezadoPagina } from '@/components/ui/encabezado-pagina'

// Pago a proveedor desde Caja: las facturas por pagar, de la más atrasada a la que vence más tarde. Cada una abre la
// vista de pago de esa factura (la misma de Proveedores).
export default async function PagoProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')

  const hoy = hoyBogota()
  const { data: facturas } = await supabase
    .from('facturas_proveedor')
    .select('id, proveedor_id, numero_factura, fecha_emision, fecha_vencimiento, monto_total, saldo_pendiente, proveedores(nombre)')
    .in('estado', ['pendiente', 'parcial'])
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
    .order('id')

  const lista = facturas ?? []
  const total = lista.reduce((s, f) => s + Number(f.saldo_pendiente), 0)
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <EncabezadoPagina titulo="Pago a proveedor" atras="/dashboard/caja"
        subtitulo={`${lista.length} factura${lista.length === 1 ? '' : 's'} por pagar · ${fmt(total)}`} />
      {lista.length === 0 && (
        <p className="rounded-2xl bg-superficie p-8 text-center text-sm text-steel-500">No hay facturas por pagar.</p>
      )}
      <div className="space-y-2">
        {lista.map(f => {
          const vence = f.fecha_vencimiento ?? f.fecha_emision
          const mora = diasVencido(vence, hoy)
          return (
            <Link key={f.id} href={`/dashboard/proveedores/${f.proveedor_id}/facturas/${f.id}/pagar`}
              className="flex items-center gap-3 rounded-2xl bg-superficie p-3 hover:border-brand-yellow/50">
              <span className={`h-10 w-1.5 shrink-0 rounded-full ${mora > 30 ? 'bg-brand-red' : mora > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-tinta">{(f.proveedores as { nombre?: string } | null)?.nombre ?? 'Proveedor'}</span>
                <span className="block text-xs text-steel-500">
                  {f.numero_factura ? `Factura ${f.numero_factura}` : 'Sin número'} · {mora > 0 ? `vencida hace ${mora} días` : vence ? `vence ${vence}` : 'sin vencimiento'}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-base font-bold text-tinta">{fmt(Number(f.saldo_pendiente))}</span>
                <span className="block text-xs text-steel-500">de {fmt(Number(f.monto_total))}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-steel-500" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
