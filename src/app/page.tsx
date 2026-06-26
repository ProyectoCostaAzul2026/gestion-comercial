import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function InventarioPage() {
  const supabase = await createClient()

  const { data: productos, error } = await supabase
    .from('productos')
    .select(`
      id,
      nombre,
      codigo,
      stock_actual,
      stock_minimo,
      precio_venta,
      precio_costo_base,
      prioridad,
      unidad_medida,
      imagen_url,
      activo,
      categorias_producto(nombre)
    `)
    .order('nombre', { ascending: true })

  const getEstadoStock = (actual: number, minimo: number) => {
    if (actual <= 0) return { label: 'Agotado', variant: 'destructive' as const }
    if (actual <= minimo) return { label: 'Stock bajo', variant: 'secondary' as const }
    return { label: 'Normal', variant: 'default' as const }
  }

  const getPrioridadBadge = (p: number) => {
    const map: Record<number, { label: string; className: string }> = {
      1: { label: 'Crítico', className: 'bg-red-800 text-white hover:bg-red-800' },
      2: { label: 'Alta', className: 'bg-red-500 text-white hover:bg-red-500' },
      3: { label: 'Media', className: 'bg-yellow-500 text-white hover:bg-yellow-500' },
      4: { label: 'Baja', className: 'bg-blue-400 text-white hover:bg-blue-400' },
      5: { label: 'Mínima', className: 'bg-gray-400 text-white hover:bg-gray-400' },
    }
    return map[p] || map[3]
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="mt-1 text-sm text-slate-500">
            {productos?.length ?? 0} productos registrados
          </p>
        </div>
        <Link
          href="/dashboard/inventario/nuevo"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Agregar producto
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          Error al cargar productos: {error.message}
        </p>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-center">Prioridad</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos?.map((producto) => {
              const estado = getEstadoStock(producto.stock_actual, producto.stock_minimo)
              const prioridad = getPrioridadBadge(producto.prioridad)
              const categoriaNombre = producto.categorias_producto?.nombre ?? '—'

              return (
                <TableRow 
                  key={producto.id}
                  className={!producto.activo ? 'opacity-50' : ''}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {producto.imagen_url && (
                        <img 
                          src={producto.imagen_url} 
                          alt="" 
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <span>{producto.nombre}</span>
                    </div>
                    {!producto.activo && (
                      <span className="ml-2 text-xs text-gray-400">(Inactivo)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {producto.codigo ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {categoriaNombre}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={prioridad.className}>
                      {prioridad.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {producto.stock_actual} {producto.unidad_medida ?? 'un'}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(producto.precio_venta).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estado.variant}>{estado.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {productos?.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            No hay productos registrados todavía.
          </p>
        )}
      </div>
    </div>
  )
}