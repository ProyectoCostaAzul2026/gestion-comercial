import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { redirect } from 'next/navigation'
import { BotonAtras } from '@/components/ui/boton-atras'
import { AgotadosTable, type ProductoAgotado } from '@/components/modulos/agotados-table'

export default async function AgotadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data, error }, { data: todosProveedores }] = await Promise.all([
    traerTodo((filaDesde, filaHasta) =>
      supabase
        .from('productos')
        .select(`
          id, nombre, codigo, marca, unidad_medida, imagen_url, prioridad, stock_actual, stock_minimo, stock_bodega, stock_almacen,
          producto_proveedores(precio_costo, proveedor_id, proveedores(id, nombre))
        `)
        .eq('activo', true)
        .order('id')
        .range(filaDesde, filaHasta)
    ),
    supabase
      .from('proveedores')
      .select('id, nombre, telefono')
      .eq('activo', true)
      .order('nombre'),
  ])

  const productos: ProductoAgotado[] = (data ?? [])
    .filter((p: any) => p.stock_actual <= p.stock_minimo)
    .map((p: any) => {
      const ordenados = [...(p.producto_proveedores ?? [])].sort((a: any, b: any) => a.precio_costo - b.precio_costo)
      return {
        id: p.id,
        nombre: p.nombre,
        imagen_url: p.imagen_url ?? null,
        codigo: p.codigo ?? '—',
        marca: p.marca,
        unidad_medida: p.unidad_medida,
        prioridad: p.prioridad,
        stock_actual: p.stock_actual,
        stock_minimo: p.stock_minimo ?? 0,
        stock_bodega: p.stock_bodega ?? 0,
        stock_almacen: p.stock_almacen ?? 0,
        proveedor1: ordenados[0]?.proveedores?.nombre ?? null,
        proveedor2: ordenados[1]?.proveedores?.nombre ?? null,
      }
    })

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b lg:top-0 border-linea bg-fondo px-4 py-3">
        <div className="flex items-center gap-3">
          <BotonAtras href="/dashboard/inventario" />
          <div>
            <h1 className="font-display text-lg font-bold text-tinta">Productos en bajo stock o agotados</h1>
            <p className="text-xs text-steel-300">{productos.length} productos</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <p className="mb-4 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-sale">
            Error al cargar productos: {error.message}
          </p>
        )}
        <AgotadosTable productos={productos} proveedores={todosProveedores ?? []} />
      </div>
    </div>
  )
}