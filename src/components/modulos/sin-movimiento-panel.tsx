'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface ProductoQuieto {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  medida: string | null
  categoria: string
  familia: string | null
  stock: number
  costoUnitario: number
  valorCosto: number
  valorVenta: number
  ultimaVenta: string | null
  ultimaEntrada: string
  /** Días desde la última venta (o desde la última entrada, si fue después) */
  dias: number
}

const UMBRALES = [30, 60, 90, 180]
const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
const num = (n: number) => (Number.isInteger(n) ? n : Math.round(n * 100) / 100).toLocaleString('es-CO')

export function SinMovimientoPanel({ productos }: { productos: ProductoQuieto[]; hoy: string }) {
  const [umbral, setUmbral] = useState(30)
  const [categoria, setCategoria] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [limite, setLimite] = useState(50)

  const quietos = useMemo(() => productos.filter(p => p.dias >= umbral), [productos, umbral])
  const porCategoria = useMemo(() => {
    const m = new Map<string, { nombre: string; valor: number; productos: number }>()
    for (const p of quietos) {
      const g = m.get(p.categoria) ?? { nombre: p.categoria, valor: 0, productos: 0 }
      g.valor += p.valorCosto; g.productos += 1
      m.set(p.categoria, g)
    }
    return [...m.values()].sort((a, b) => b.valor - a.valor)
  }, [quietos])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return quietos
      .filter(p => !categoria || p.categoria === categoria)
      .filter(p => !q || `${p.nombre} ${p.codigo ?? ''} ${p.marca ?? ''} ${p.medida ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.valorCosto - a.valorCosto)
  }, [quietos, categoria, busqueda])

  const totalQuieto = quietos.reduce((s, p) => s + p.valorCosto, 0)
  const totalInventario = productos.reduce((s, p) => s + p.valorCosto, 0)
  const nuncaVendidos = quietos.filter(p => !p.ultimaVenta).length

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
        <p className="text-xs font-bold text-steel-300">Sin vender hace al menos</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-fondo p-1">
          {UMBRALES.map(u => (
            <button key={u} type="button" onClick={() => { setUmbral(u); setLimite(50) }}
              className={`h-10 rounded-lg text-sm font-bold ${umbral === u ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:text-tinta'}`}>
              {u} días
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs text-steel-300">Dinero quieto (a costo)</p>
            <p className="font-display text-xl font-bold text-amber-400">{fmt(totalQuieto)}</p>
          </div>
          <div>
            <p className="text-xs text-steel-300">Del inventario total</p>
            <p className="font-display text-xl font-bold text-tinta">{totalInventario > 0 ? `${((totalQuieto / totalInventario) * 100).toFixed(1)}%` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-steel-300">Productos</p>
            <p className="font-display text-xl font-bold text-tinta">{quietos.length.toLocaleString('es-CO')}</p>
          </div>
          <div>
            <p className="text-xs text-steel-300">Nunca vendidos</p>
            <p className="font-display text-xl font-bold text-tinta">{nuncaVendidos.toLocaleString('es-CO')}</p>
          </div>
        </div>
        <p className="text-xs text-steel-500">
          Se cuenta desde la última venta o, si después llegó mercancía, desde esa entrada. Sirve para decidir qué rematar,
          qué dejar de pedir o qué exhibir mejor.
        </p>
      </section>

      {porCategoria.length > 0 && (
        <section className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" onClick={() => setCategoria(null)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left ${!categoria ? 'border-brand-yellow bg-brand-yellow/10' : 'border-linea'}`}>
            <span className="block text-xs font-bold text-tinta">Todas</span>
            <span className="block text-xs text-steel-300">{fmt(totalQuieto)}</span>
          </button>
          {porCategoria.map(c => (
            <button key={c.nombre} type="button" onClick={() => setCategoria(categoria === c.nombre ? null : c.nombre)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left ${categoria === c.nombre ? 'border-brand-yellow bg-brand-yellow/10' : 'border-linea'}`}>
              <span className="block max-w-40 truncate text-xs font-bold text-tinta">{c.nombre}</span>
              <span className="block text-xs text-steel-300">{fmt(c.valor)} · {c.productos}</span>
            </button>
          ))}
        </section>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto, código o marca"
          className="h-11 border-linea bg-superficie pl-9 text-tinta" />
      </div>

      <section className="space-y-2">
        {lista.length === 0 && (
          <p className="rounded-2xl border border-linea bg-superficie p-8 text-center text-sm text-steel-500">
            Ningún producto con stock lleva {umbral} días o más sin venderse.
          </p>
        )}
        {lista.slice(0, limite).map(p => (
          <Link key={p.id} href={`/dashboard/inventario/${p.id}`}
            className="flex items-center gap-3 rounded-2xl border border-linea bg-superficie p-3 hover:border-brand-yellow/50">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-tinta">{p.nombre}</span>
              <span className="block truncate text-xs text-steel-500">
                {[p.codigo, p.medida, p.marca].filter(Boolean).join(' · ')}
              </span>
              <span className="mt-0.5 block text-xs text-steel-300">
                {p.ultimaVenta ? `Última venta ${p.ultimaVenta}` : `Nunca vendido · entró el ${p.ultimaEntrada}`}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-base font-bold text-amber-400">{fmt(p.valorCosto)}</span>
              <span className="block text-xs text-steel-300">{num(p.stock)} en stock</span>
              <span className={`block text-xs font-semibold ${p.dias >= 90 ? 'text-sale' : 'text-steel-300'}`}>{p.dias} días</span>
            </span>
          </Link>
        ))}
        {lista.length > limite && (
          <button type="button" onClick={() => setLimite(l => l + 100)}
            className="h-11 w-full rounded-xl border border-linea text-sm font-semibold text-enlace hover:bg-velo/5">
            Ver más ({(lista.length - limite).toLocaleString('es-CO')} restantes)
          </button>
        )}
      </section>
    </div>
  )
}
