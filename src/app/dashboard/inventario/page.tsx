import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { InventarioNavegador } from '@/components/modulos/inventario-navegador'
import { esAdmin } from '@/lib/permissions'
import { AlertTriangle, ClipboardCheck, ClipboardList, ShieldCheck, PowerOff } from 'lucide-react'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: productos, error }, { data: familias }, { data: categorias }, { data: perfil }, { count: porCompletar }] = await Promise.all([
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
    supabase.from('productos').select('id', { count: 'exact', head: true }).eq('por_completar', true).eq('activo', true),
  ])

  return (
    <div className="space-y-4">
      <div className="relative py-1">
        <div className="relative z-10">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-tinta">Inventario</h1>
            <p className="text-[15px] text-suave">{productos?.length ?? 0} productos registrados</p>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { href: '/dashboard/inventario/conteo', texto: 'Contar', Icono: ClipboardCheck, color: 'text-enlace' },
              { href: '/dashboard/inventario/agotados', texto: 'Agotados', Icono: AlertTriangle, color: 'text-sale' },
              { href: '/dashboard/inventario/garantias', texto: 'Garantías', Icono: ShieldCheck, color: 'text-enlace' },
              { href: '/dashboard/inventario/desactivados', texto: 'Desactivados', Icono: PowerOff, color: 'text-suave' },
            ].map(({ href, texto, Icono, color }) => (
              <Link key={href} href={href}
                className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] bg-superficie px-1 text-center text-[13px] font-semibold leading-tight text-tinta hover:bg-superficie-2 sm:text-sm">
                <Icono className={`size-[22px] ${color}`} strokeWidth={1.75} aria-hidden />{texto}
              </Link>
            ))}
          </div>
          {(porCompletar ?? 0) > 0 && (
            <Link
              href="/dashboard/inventario/por-completar"
              className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)] px-4 text-[15px] font-semibold text-tinta"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Por completar ({porCompletar}): productos de alta rápida
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-sale">
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