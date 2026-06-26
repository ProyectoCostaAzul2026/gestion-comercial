// Tipos literales que reflejan los valores válidos definidos en la spec
// (sección 2). La base de datos los guarda como varchar sin constraint,
// así que esta es la capa de seguridad de tipos a nivel de aplicación.

export type TipoPago = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'mixto'
export type MetodoPago = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta'
export type EstadoVenta = 'completada' | 'anulada'
export type TipoMovimientoInventario =
  | 'entrada' | 'salida' | 'ajuste' | 'venta' | 'devolucion' | 'conteo_fisico'
export type EstadoFactura = 'pendiente' | 'parcial' | 'pagada'
export type TipoMovimientoCaja =
  | 'ingreso' | 'egreso' | 'retiro' | 'pago_proveedor' | 'gasto' | 'transferencia_caja_mayor'
export type OrigenDestinoCaja = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'caja_mayor'
export type MedioPagoDigital = 'nequi' | 'daviplata' | 'tarjeta'
export type EstadoNomina = 'pendiente' | 'pagada'
export type DiaSemana =
  | 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
export type OrigenRetiro = 'caja_menor' | 'caja_mayor' | 'nequi' | 'daviplata' | 'tarjeta'
export type TipoBillete = 'billete' | 'moneda'