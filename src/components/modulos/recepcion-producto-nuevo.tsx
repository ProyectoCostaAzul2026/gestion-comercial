'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductoForm, type NuevoInicial } from './producto-form'

/**
 * Formulario de producto nuevo para un renglón pendiente de la recepción: empieza con la descripción, el proveedor, el
 * costo y la referencia del renglón, y al crearlo lo asocia al renglón (lo contado entra al inventario).
 */
export function RecepcionProductoNuevo({ recepcionId, renglon, categorias, proveedores, unidades, empleadoId, margenDefault, nuevoInicial }: {
  recepcionId: string
  renglon: { id: string; referencia: string | null; cantidad_facturada: number; costo_unitario: number }
  categorias: { id: string; nombre: string }[]
  proveedores: { id: string; nombre: string }[]
  unidades: string[]
  empleadoId: string
  margenDefault: number
  nuevoInicial: NuevoInicial
}) {
  const supabase = useMemo(() => createClient(), [])

  const asociar = async (productoId: string) => {
    const { error } = await supabase.rpc('guardar_renglon_recepcion', {
      p_recepcion_id: recepcionId,
      p_renglon: {
        id: renglon.id,
        producto_id: productoId,
        referencia: renglon.referencia,
        cantidad_facturada: renglon.cantidad_facturada,
        costo_unitario: renglon.costo_unitario,
      },
    })
    return error ? `El producto se creó, pero no se pudo asociar al renglón: ${error.message}. Asócialo desde la recepción.` : null
  }

  return (
    <ProductoForm
      categorias={categorias}
      proveedores={proveedores}
      unidades={unidades}
      empleadoId={empleadoId}
      rol="administrador"
      isSheet={false}
      margenDefault={margenDefault}
      rutaVolver={`/dashboard/recepcion/${recepcionId}`}
      nuevoInicial={nuevoInicial}
      alCrear={asociar}
    />
  )
}
