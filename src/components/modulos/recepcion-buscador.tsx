'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { INPUT_CLS } from './producto-form'
import { nombreConMedida, pesos, type ProductoDelProveedor } from './recepcion-tipos'

export interface ProductoElegido {
  id: string
  nombre: string
  unidad_medida: string | null
  marca: string | null
  codigo: string | null
  /** Referencia y costo con el proveedor de la recepción (null si no lo tiene) */
  referencia: string | null
  costo: number | null
}

// Sin tildes ni mayúsculas, para que "tornillo" encuentre "Tornillo" y "galon" encuentre "Galón"
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Busca primero en los productos del proveedor (por nombre, medida, marca, código o referencia del proveedor) y, si
 * se necesita, en todo el catálogo (buscar_productos), donde aparecen como "de otro proveedor".
 */
export function BuscadorProducto({ id, productosProveedor, onElegir, placeholder, autoFocus }: {
  id: string
  productosProveedor: ProductoDelProveedor[]
  onElegir: (p: ProductoElegido) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [texto, setTexto] = useState('')
  // Resultados del resto del catálogo y el texto con que se buscaron (solo se muestran si sigue siendo el mismo)
  const [otros, setOtros] = useState<{ q: string; items: ProductoElegido[] }>({ q: '', items: [] })
  const ultimaBusqueda = useRef(0)

  const delProveedor = useMemo(() => {
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
    if (palabras.length === 0) return []
    return productosProveedor
      .filter(p => {
        const donde = normalizar([p.nombre, p.unidad_medida, p.marca, p.codigo, p.referencia].filter(Boolean).join(' '))
        return palabras.every(w => donde.includes(w))
      })
      .slice(0, 8)
  }, [texto, productosProveedor])

  // Búsqueda en todo el catálogo, con una pausa corta para no consultar en cada tecla
  useEffect(() => {
    const q = texto.trim()
    const n = ++ultimaBusqueda.current
    if (q.length < 2) return
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('buscar_productos', { p_query: q })
      if (n !== ultimaBusqueda.current) return
      const propios = new Set(productosProveedor.map(p => p.id))
      setOtros({
        q,
        items: ((data ?? []) as { id: string; nombre: string; unidad_medida: string | null; marca: string | null; codigo: string | null }[])
          .filter(p => !propios.has(p.id))
          .slice(0, 5)
          .map(p => ({ id: p.id, nombre: p.nombre, unidad_medida: p.unidad_medida, marca: p.marca, codigo: p.codigo, referencia: null, costo: null })),
      })
    }, 300)
    return () => clearTimeout(t)
  }, [texto, supabase, productosProveedor])

  const elegir = (p: ProductoElegido) => {
    setTexto('')
    setOtros({ q: '', items: [] })
    onElegir(p)
  }

  // Los del resto del catálogo solo cuentan mientras haya algo buscado
  const otrosVisibles = texto.trim().length >= 2 && otros.q === texto.trim() ? otros.items : []
  const hayResultados = delProveedor.length > 0 || otrosVisibles.length > 0

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input id={id} value={texto} autoFocus={autoFocus} onChange={e => setTexto(e.target.value)}
          placeholder={placeholder ?? 'Nombre, código o referencia'} className={`h-11 pl-9 ${INPUT_CLS}`} autoComplete="off" />
      </div>
      {hayResultados && (
        <ul className="max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0d131a]">
          {delProveedor.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => elegir({ ...p, referencia: p.referencia, costo: p.costo })}
                className="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2 text-left hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{nombreConMedida(p)}</span>
                  <span className="block text-xs text-steel-300">
                    {[p.activo ? null : 'Inactivo', p.marca, p.referencia ? `Ref. ${p.referencia}` : null, p.codigo].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-steel-300">{pesos(p.costo)}</span>
              </button>
            </li>
          ))}
          {otrosVisibles.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => elegir(p)}
                className="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2 text-left hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{nombreConMedida(p)}</span>
                  <span className="block text-xs text-steel-300">{[p.marca, p.codigo].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-steel-300">De otro proveedor</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {texto.trim().length >= 2 && !hayResultados && (
        <p className="text-xs text-steel-500">Sin resultados. Si no existe, agrégalo como producto nuevo.</p>
      )}
    </div>
  )
}
