// Datos de una recepción de mercancía que la página del servidor les pasa a sus componentes
import type { DestinoRecepcion, EstadoRecepcion } from '@/lib/recepcion'

export interface ProductoDelRenglon {
  id: string
  nombre: string
  codigo: string | null
  marca: string | null
  unidad_medida: string | null
  activo: boolean
  precio_venta: number
  tiene_iva: boolean
  iva_incluido: boolean
  porcentaje_iva: number
  vender_por_fraccion: boolean
  stock_bodega: number
  stock_almacen: number
}

export interface RenglonVista {
  id: string
  producto_id: string | null
  descripcion: string
  referencia: string | null
  cantidad_facturada: number
  costo_unitario: number
  cantidad_contada: number | null
  cantidad_averiada: number
  destino: DestinoRecepcion
  stock_ingresado: number
  contado_por_nombre: string | null
  contado_at: string | null
  precio_aprobado: number | null
  /** null si el renglón está pendiente, o si quien mira no puede ver el producto (un empleado y un producto inactivo) */
  producto: ProductoDelRenglon | null
  /** Costo actual del producto con el proveedor de la recepción (null si no lo tiene) */
  costo_anterior: number | null
  /** El producto tiene precios por cantidad */
  tiene_tramos: boolean
}

export interface RecepcionVista {
  id: string
  factura_id: string
  proveedor_id: string
  proveedor_nombre: string
  numero_factura: string | null
  fecha_factura: string
  costos_con_iva: boolean
  estado: EstadoRecepcion
  precios_aprobados_at: string | null
  nota_cierre: string | null
  nota_resolucion: string | null
  cerrada_at: string | null
  resuelta_at: string | null
}

/** Producto del catálogo del proveedor, para buscarlo por nombre, código o referencia */
export interface ProductoDelProveedor {
  id: string
  nombre: string
  codigo: string | null
  marca: string | null
  unidad_medida: string | null
  referencia: string | null
  costo: number
  /** Solo el administrador ve productos inactivos */
  activo: boolean
}

/** Lo que solo ve el administrador */
export interface DatosAdminRecepcion {
  totalFactura: number
  estadoPago: string
  margenDefault: number
  unidades: string[]
}

/** Colores de la etiqueta de cada estado */
export const CLASE_ESTADO_RECEPCION: Record<EstadoRecepcion, string> = {
  abierta: 'border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow',
  reclamacion: 'border-brand-red/30 bg-brand-red/20 text-brand-red',
  cerrada: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400',
}

/** Nombre de un producto con su medida, como aparece en el renglón */
export function nombreConMedida(p: { nombre: string; unidad_medida: string | null }): string {
  return `${p.nombre} ${p.unidad_medida ?? ''}`.trim()
}

/** Pesos colombianos, con centavos solo si los hay */
export function pesos(valor: number): string {
  return `$${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`
}
