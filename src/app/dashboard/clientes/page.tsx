import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClienteTable } from '@/components/modulos/cliente-table'
import { Plus } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clientes, error }, { data: statsVentas }] = await Promise.all([
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('clientes')
        .select('id, nombre, telefono, email, nit_cc, es_cliente_generico')
        .eq('activo', true)
        .order('es_cliente_generico', { ascending: false })
        .order('nombre', { ascending: true })
        .order('id', { ascending: true })
        .range(filaDesde, filaHasta)
    ),

    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('ventas')
        .select('cliente_id, total, fecha')
        .neq('estado', 'anulada')
        .not('cliente_id', 'is', null)
        .order('id')
        .range(filaDesde, filaHasta)
    ),
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
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] py-3 pl-4 pr-14 md:py-4 md:pr-28">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-yellow md:text-3xl">Clientes</h1>
            <p className="mt-0.5 text-xs text-steel-300">{clientes?.length ?? 0} clientes registrados</p>
          </div>
          <Link href="/dashboard/clientes/nuevo"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-yellow px-4 text-sm font-bold text-steel-900 hover:brightness-105">
            <Plus className="mr-2 h-4 w-4" />
            Agregar cliente
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 overflow-hidden md:w-24">
          <div className="absolute inset-y-0 right-0 w-9 -skew-x-12 translate-x-4 bg-brand-yellow/80 md:w-20 md:translate-x-8" />
          <div className="absolute inset-y-0 right-0 w-3 -skew-x-12 translate-x-1 bg-brand-blue md:w-7" />
        </div>
      </div>

      {error && <p className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">Error: {error.message}</p>}

      <ClienteTable clientes={clientesConStats} />
    </div>
  )
}