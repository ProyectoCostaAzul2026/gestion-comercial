import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { hoyBogota } from '@/lib/fechas'
import { diasEntre } from '@/lib/periodos'
import { EncabezadoPagina } from '@/components/ui/encabezado-pagina'
import { SinMovimientoPanel, type ProductoQuieto } from '@/components/modulos/sin-movimiento-panel'

// Productos con stock que no se venden: cuánto dinero hay quieto en ellos y desde cuándo
export default async function SinMovimientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'administrador') redirect('/dashboard')

  const hoy = hoyBogota()
  const [{ data: productos }, { data: vendidos }, { data: entradas }] = await Promise.all([
    traerTodo((a, b) => supabase
      .from('productos')
      .select('id, codigo, nombre, marca, unidad_medida, stock_actual, precio_costo_base, precio_venta, tiene_iva, iva_incluido, porcentaje_iva, created_at, categorias_producto(nombre), producto_familias(nombre_base)')
      .eq('activo', true)
      .gt('stock_actual', 0)
      .order('id').range(a, b)),
    traerTodo((a, b) => supabase
      .from('venta_items')
      .select('producto_id, ventas!inner(fecha, estado)')
      .neq('ventas.estado', 'anulada')
      .not('producto_id', 'is', null)
      .order('id').range(a, b)),
    traerTodo((a, b) => supabase
      .from('movimientos_inventario')
      .select('producto_id, created_at')
      .eq('tipo', 'entrada')
      .order('id').range(a, b)),
  ])

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ultimaVenta = new Map<string, string>()
  for (const v of vendidos as any[]) {
    const f = v.ventas?.fecha
    if (f && (!ultimaVenta.has(v.producto_id) || ultimaVenta.get(v.producto_id)! < f)) ultimaVenta.set(v.producto_id, f)
  }
  const aBogota = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const ultimaEntrada = new Map<string, string>()
  for (const m of entradas as any[]) {
    const f = aBogota(m.created_at)
    if (!ultimaEntrada.has(m.producto_id) || ultimaEntrada.get(m.producto_id)! < f) ultimaEntrada.set(m.producto_id, f)
  }

  const lista: ProductoQuieto[] = (productos as any[]).map(p => {
    const venta = ultimaVenta.get(p.id) ?? null
    const entrada = ultimaEntrada.get(p.id) ?? aBogota(p.created_at)
    // Se cuenta desde lo más reciente: la última venta o, si se compró después, la última entrada de mercancía
    const desde = venta && venta > entrada ? venta : entrada
    // El negocio no recupera el IVA: es parte del costo
    const factorIva = p.tiene_iva && !p.iva_incluido ? 1 + Number(p.porcentaje_iva ?? 0) / 100 : 1
    const costo = Number(p.precio_costo_base ?? 0) * factorIva
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      marca: p.marca,
      medida: p.unidad_medida,
      categoria: p.categorias_producto?.nombre ?? 'Sin categoría',
      familia: p.producto_familias?.nombre_base ?? null,
      stock: Number(p.stock_actual),
      costoUnitario: costo,
      valorCosto: Number(p.stock_actual) * costo,
      valorVenta: Number(p.stock_actual) * Number(p.precio_venta ?? 0),
      ultimaVenta: venta,
      ultimaEntrada: entrada,
      dias: Math.max(0, diasEntre(desde, hoy) - 1),
    }
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-4">
      <EncabezadoPagina titulo="Sin movimiento" atras="/dashboard/reportes"
        subtitulo="Productos con stock que no se han vendido: el dinero que está quieto" />
      <SinMovimientoPanel productos={lista} hoy={hoy} />
    </div>
  )
}
