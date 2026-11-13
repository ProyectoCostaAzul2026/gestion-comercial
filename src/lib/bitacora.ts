// Bitácora: registro de cambios importantes que la app solo puede leer (la escriben los triggers de la base).
// Las tablas `bitacora` y `bitacora_borrados` nacen con la migración bitacora_y_borrado_productos.

export interface RegistroBitacora {
  numero: number
  ocurrido_en: string
  origen: 'sistema' | 'base_de_datos' | 'automatico'
  usuario_nombre: string | null
  rol_bd: string
  accion: 'crear' | 'cambiar' | 'borrar' | 'vaciar'
  tabla: string
  registro_id: string | null
  resumen: string
  detalle: unknown
}

export interface BorradoBitacora {
  id: number
  ocurrido_en: string
  forma: 'borrado' | 'vaciado'
  registros: number
  numero_desde: number | null
  numero_hasta: number | null
  fecha_desde: string | null
  fecha_hasta: string | null
  rol_bd: string
}

export const ORIGEN_BITACORA: Record<RegistroBitacora['origen'], string> = {
  sistema: 'Desde el sistema',
  base_de_datos: 'Directo en la base de datos',
  automatico: 'Tarea automática',
}

export const ACCION_BITACORA: Record<RegistroBitacora['accion'], string> = {
  crear: 'Registro',
  cambiar: 'Cambio',
  borrar: 'Borrado',
  vaciar: 'Vaciado',
}

/** Nombre para mostrar de cada tabla vigilada */
export const TABLA_BITACORA: Record<string, string> = {
  productos: 'Productos',
  producto_familias: 'Familias',
  categorias_producto: 'Categorías',
  movimientos_inventario: 'Inventario',
  historial_precios: 'Historial de precios',
  ventas: 'Ventas',
  venta_items: 'Productos vendidos',
  venta_pagos: 'Pagos de ventas',
  ventas_credito: 'Créditos',
  abonos_credito: 'Abonos',
  devoluciones: 'Devoluciones y cambios',
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  facturas_proveedor: 'Facturas de proveedor',
  pagos_factura_proveedor: 'Pagos a proveedores',
  movimientos_caja: 'Caja',
  gastos: 'Gastos',
  retiros: 'Retiros',
  arqueo_caja: 'Arqueos',
  nominas: 'Nómina',
  recepciones: 'Recepciones',
  recepcion_items: 'Renglones de recepción',
  garantias: 'Garantías',
  profiles: 'Empleados',
  permisos_empleado: 'Permisos',
  configuracion_negocio: 'Configuración',
}

/** Saltos en la numeración: registros que ya no están (se borraron directamente en la base) */
export function huecosDeNumeracion(numeros: number[]): { desde: number; hasta: number }[] {
  const orden = [...numeros].sort((a, b) => a - b)
  const huecos: { desde: number; hasta: number }[] = []
  for (let i = 1; i < orden.length; i++) {
    if (orden[i] - orden[i - 1] > 1) huecos.push({ desde: orden[i - 1] + 1, hasta: orden[i] - 1 })
  }
  return huecos
}

/** "antes → después" de un cambio, en texto corto */
export function textoValor(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'sí' : 'no'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Si el detalle es un cambio de columnas ({col: {antes, despues}}), lo devuelve como lista */
export function cambiosDeDetalle(detalle: unknown): { columna: string; antes: unknown; despues: unknown }[] | null {
  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) return null
  const entradas = Object.entries(detalle as Record<string, unknown>)
  if (entradas.length === 0) return null
  const lista: { columna: string; antes: unknown; despues: unknown }[] = []
  for (const [columna, valor] of entradas) {
    if (!valor || typeof valor !== 'object' || !('antes' in valor) || !('despues' in valor)) return null
    const v = valor as { antes: unknown; despues: unknown }
    lista.push({ columna, antes: v.antes, despues: v.despues })
  }
  return lista
}
