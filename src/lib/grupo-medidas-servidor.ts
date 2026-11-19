// Carga de un grupo de medidas en el servidor (página del grupo y página de precios).
// Un grupo son los productos de la misma familia, característica y marca: lo mismo en distintas medidas.
// No tiene tabla propia; se arma desde cualquiera de sus productos.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { MiembroGrupo } from '@/components/modulos/grupo-medidas-panel'

const CAMPOS_MIEMBRO = `
  id, nombre, codigo, unidad_medida, marca, imagen_url, activo, stock_actual, stock_minimo, ubicacion,
  precio_venta, precio_costo_base, tiene_iva, iva_incluido, porcentaje_iva, orden_medida, peso_unitario_g
`

export interface GrupoCargado {
  producto: { id: string; nombre: string; familia_id: string | null; caracteristica: string | null; marca: string | null }
  miembros: MiembroGrupo[]
}

/** null si el producto no existe */
export async function cargarGrupoMedidas(supabase: SupabaseClient<Database>, id: string): Promise<GrupoCargado | null> {
  const { data: producto, error } = await supabase
    .from('productos')
    .select('id, nombre, familia_id, caracteristica, marca, imagen_url')
    .eq('id', id)
    .single()
  if (error || !producto) return null

  let consulta = supabase.from('productos').select(CAMPOS_MIEMBRO)
  if (producto.familia_id) {
    consulta = consulta.eq('familia_id', producto.familia_id)
    consulta = producto.caracteristica == null
      ? consulta.is('caracteristica', null)
      : consulta.eq('caracteristica', producto.caracteristica)
    consulta = producto.marca == null ? consulta.is('marca', null) : consulta.eq('marca', producto.marca)
  } else {
    consulta = consulta.eq('id', producto.id)
  }
  const { data } = await consulta.order('id')

  const miembros: MiembroGrupo[] = (data ?? []).map(m => ({
    ...m,
    precio_venta: Number(m.precio_venta),
    precio_costo_base: m.precio_costo_base != null ? Number(m.precio_costo_base) : null,
    porcentaje_iva: Number(m.porcentaje_iva),
    peso_unitario_g: m.peso_unitario_g != null ? Number(m.peso_unitario_g) : null,
  }))
  return { producto, miembros }
}
