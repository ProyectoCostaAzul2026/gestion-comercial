import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { InventarioNavegador } from '@/components/modulos/inventario-navegador'
import { esAdmin } from '@/lib/permissions'
import { AlertTriangle, ShieldCheck, PowerOff } from 'lucide-react'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: productos, error }, { data: familias }, { data: categorias }, { data: perfil }] = await Promise.all([
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('productos')
        .select('id, codigo, nombre, marca, ubicacion, unidad_medida, precio_venta, stock_actual, stock_minimo, familia_id, caracteristica, orden_medida, categoria_id, imagen_url')
        .eq('activo', true)
        .order('nombre', { ascending: true })
        .order('id', { ascending: true })
        .range(filaDesde, filaHasta)
    ),
    traerTodo((filaDesde, filaHasta) =>
      supabase.from('producto_familias').select('id, nombre_base, imagen_url').order('id').range(filaDesde, filaHasta)
    ),
    supabase.from('categorias_producto').select('id, nombre, imagen_url').order('nombre'),
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
  ])

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
        <div className="relative z-10">
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-yellow">Inventario</h1>
            <p className="mt-0.5 text-xs text-steel-300">{productos?.length ?? 0} productos registrados</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link
              href="/dashboard/inventario/garantias"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-blue px-4 text-sm font-bold text-steel-900 hover:brightness-105"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Garantías
            </Link>
            <Link
              href="/dashboard/inventario/agotados"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-bold text-steel-900 hover:brightness-105"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Ver agotados
            </Link>
            <Link
              href="/dashboard/inventario/desactivados"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-steel-700 px-4 text-sm font-bold text-white hover:brightness-110"
            >
              <PowerOff className="mr-2 h-4 w-4" />
              Desactivados
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
          <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
          Error al cargar productos: {error.message}
        </p>
      )}

      {/* useSearchParams (el nivel de las tarjetas va en la dirección) pide un límite de Suspense */}
      <Suspense fallback={<p className="p-8 text-center text-sm text-steel-500">Cargando inventario…</p>}>
        <InventarioNavegador
          productos={(productos ?? []).map(p => ({ ...p, precio_venta: Number(p.precio_venta) }))}
          categorias={categorias ?? []}
          familias={familias ?? []}
          esAdmin={esAdmin(perfil?.rol)}
        />
      </Suspense>
    </div>
  )
}