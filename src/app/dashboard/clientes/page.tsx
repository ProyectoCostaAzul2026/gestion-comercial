import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClienteTable } from '@/components/modulos/cliente-table'
import { Plus } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clientes, error }, { data: statsVentas }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, telefono, email, nit_cc, es_cliente_generico')
      .eq('activo', true)
      .order('es_cliente_generico', { ascending: false })
      .order('nombre', { ascending: true }),

    supabase
      .from('ventas')
      .select('cliente_id, total, fecha')
      .neq('estado', 'anulada')
      .not('cliente_id', 'is', null),
  ])

  // Calcular stats por cliente en el servidor
  const statsMap: Record<string, { totalCompras: number; numCompras: number; ultimaCompra: string }> = {}
  for (const v of statsVentas ?? []) {
    const id = (v as any).cliente_id
    if (!id) continue
    if (!statsMap[id]) statsMap[id] = { totalCompras: 0, numCompras: 0, ultimaCompra: '' }
    statsMap[id].totalCompras += Number((v as any).total)
    statsMap[id].numCompras += 1
    if ((v as any).fecha > statsMap[id].ultimaCompra) {
      statsMap[id].ultimaCompra = (v as any).fecha
    }
  }

  const clientesConStats = (clientes ?? []).map((c: any) => ({
    ...c,
    totalCompras: statsMap[c.id]?.totalCompras ?? 0,
    numCompras: statsMap[c.id]?.numCompras ?? 0,
    ultimaCompra: statsMap[c.id]?.ultimaCompra || null,
  }))

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-yellow">Clientes</h1>
            <p className="mt-0.5 text-xs text-steel-300">{clientes?.length ?? 0} clientes registrados</p>
          </div>
          <Link href="/dashboard/clientes/nuevo"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105">
            <Plus className="mr-2 h-4 w-4" />
            Agregar cliente
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {error && <p className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">Error: {error.message}</p>}

      <ClienteTable clientes={clientesConStats} />
    </div>
  )
}