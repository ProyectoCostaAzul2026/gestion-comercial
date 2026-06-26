export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ventas_credito: {
        Row: {
          id: string
          venta_id: string
          cliente_id: string
          saldo_pendiente: number
          monto_original: number
          fecha_pago_programada: string | null
          estado: string
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          cliente_id: string
          saldo_pendiente?: number
          monto_original?: number
          fecha_pago_programada?: string | null
          estado?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venta_id?: string
          cliente_id?: string
          saldo_pendiente?: number
          monto_original?: number
          fecha_pago_programada?: string | null
          estado?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      abonos_credito: {
        Row: {
          id: string
          venta_credito_id: string
          monto: number
          fuentes: any
          observaciones: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venta_credito_id: string
          monto: number
          fuentes?: any
          observaciones?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          venta_credito_id?: string
          monto?: number
          fuentes?: any
          observaciones?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      categorias_gasto: {
        Row: {
          id: string
          nombre: string
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      fondos_denominaciones: {
        Row: {
          id: string
          tipo: string
          denominacion: number
          cantidad: number
          billetes_acumulados: number
          updated_at: string
        }
        Insert: {
          id?: string
          tipo: string
          denominacion: number
          cantidad?: number
          billetes_acumulados?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tipo?: string
          denominacion?: number
          cantidad?: number
          billetes_acumulados?: number
          updated_at?: string
        }
        Relationships: []
      }

      arqueo_caja: {
        Row: {
          id: string
          fecha: string
          ingresos_efectivo: number
          egresos_efectivo: number
          saldo_sistema: number
          total_contado_base: number
          total_contado_sobrante: number
          diferencia: number
          observacion_diferencia: string | null
          transferido_caja_mayor: number
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fecha: string
          ingresos_efectivo?: number
          egresos_efectivo?: number
          saldo_sistema?: number
          total_contado_base?: number
          total_contado_sobrante?: number
          diferencia?: number
          observacion_diferencia?: string | null
          transferido_caja_mayor?: number
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          ingresos_efectivo?: number
          egresos_efectivo?: number
          saldo_sistema?: number
          total_contado_base?: number
          total_contado_sobrante?: number
          diferencia?: number
          observacion_diferencia?: string | null
          transferido_caja_mayor?: number
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      movimiento_fuentes: {
        Row: {
          id: string
          movimiento_id: string
          fuente: string
          monto: number
          created_at: string
        }
        Insert: {
          id?: string
          movimiento_id: string
          fuente: string
          monto: number
          created_at?: string
        }
        Update: {
          id?: string
          movimiento_id?: string
          fuente?: string
          monto?: number
          created_at?: string
        }
        Relationships: []
      }

      facturas_proveedor: {
        Row: {
          id: string
          proveedor_id: string
          numero_factura: string | null
          fecha_emision: string
          fecha_vencimiento: string | null
          monto_total: number
          monto_pagado: number
          saldo_pendiente: number
          estado: string
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proveedor_id: string
          numero_factura?: string | null
          fecha_emision: string
          fecha_vencimiento?: string | null
          monto_total: number
          monto_pagado?: number
          saldo_pendiente?: number
          estado?: string
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proveedor_id?: string
          numero_factura?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          monto_total?: number
          monto_pagado?: number
          saldo_pendiente?: number
          estado?: string
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          }
        ]
      }
      pagos_programados_proveedor: {
        Row: {
          id: string
          factura_id: string
          monto: number
          fecha_programada: string
          nota: string | null
          pagado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          factura_id: string
          monto: number
          fecha_programada: string
          nota?: string | null
          pagado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          factura_id?: string
          monto?: number
          fecha_programada?: string
          nota?: string | null
          pagado?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_programados_proveedor_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedor"
            referencedColumns: ["id"]
          }
        ]
      }
      configuracion_negocio: {
        Row: {
          id: string
          nombre: string
          nit: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          ciudad: string | null
          regimen: string | null
          mensaje_pie: string | null
          updated_at: string
          monto_base_caja_menor: number
          monto_inicial_monedas: number
          monto_inicial_sencillo: number
          logo_url: string | null
        }
        Insert: {
          id?: string
          nombre: string
          nit?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          ciudad?: string | null
          regimen?: string | null
          mensaje_pie?: string | null
          updated_at?: string
          monto_base_caja_menor?: number
          monto_inicial_monedas?: number
          monto_inicial_sencillo?: number
          logo_url?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          nit?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          ciudad?: string | null
          regimen?: string | null
          mensaje_pie?: string | null
          updated_at?: string
          monto_base_caja_menor?: number
          monto_inicial_monedas?: number
          monto_inicial_sencillo?: number
          logo_url?: string | null
        }
        Relationships: []
      }
      productos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          codigo: string | null
          categoria_id: string | null
          precio_venta: number
          precio_costo_base: number | null
          margen_calculado: number | null
          tiene_iva: boolean
          iva_incluido: boolean
          porcentaje_iva: number
          stock_actual: number
          stock_bodega: number
          stock_almacen: number
          ubicacion: string | null
          marca: string | null
          stock_minimo: number
          prioridad: number
          unidad_medida: string | null
          imagen_url: string | null
          activo: boolean
          vender_por_fraccion: boolean
          medida_venta: string | null
          cantidad_total_unidad: number | null
          cantidad_minima_venta: number | null
          precio_por_unidad_medida: number | null
          remanente_fraccion: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          codigo?: string | null
          categoria_id?: string | null
          precio_venta: number
          precio_costo_base?: number | null
          margen_calculado?: number | null
          tiene_iva?: boolean
          iva_incluido?: boolean
          porcentaje_iva?: number
          stock_actual?: number
          stock_bodega?: number
          stock_almacen?: number
          ubicacion?: string | null
          marca?: string | null
          stock_minimo?: number
          prioridad?: number
          unidad_medida?: string | null
          imagen_url?: string | null
          activo?: boolean
          vender_por_fraccion?: boolean
          medida_venta?: string | null
          cantidad_total_unidad?: number | null
          cantidad_minima_venta?: number | null
          precio_por_unidad_medida?: number | null
          remanente_fraccion?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          codigo?: string | null
          categoria_id?: string | null
          precio_venta?: number
          precio_costo_base?: number | null
          margen_calculado?: number | null
          tiene_iva?: boolean
          iva_incluido?: boolean
          porcentaje_iva?: number
          stock_actual?: number
          stock_bodega?: number
          stock_almacen?: number
          ubicacion?: string | null
          marca?: string | null
          stock_minimo?: number
          prioridad?: number
          unidad_medida?: string | null
          imagen_url?: string | null
          activo?: boolean
          vender_por_fraccion?: boolean
          medida_venta?: string | null
          cantidad_total_unidad?: number | null
          cantidad_minima_venta?: number | null
          precio_por_unidad_medida?: number | null
          remanente_fraccion?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_producto"
            referencedColumns: ["id"]
          }
        ]
      }
      categorias_producto: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          id: string
          nombre: string
          contacto: string | null
          telefono: string | null
          email: string | null
          direccion: string | null
          nit_ruc: string | null
          notas: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          contacto?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          nit_ruc?: string | null
          notas?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          contacto?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          nit_ruc?: string | null
          notas?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      producto_proveedores: {
        Row: {
          id: string
          producto_id: string
          proveedor_id: string
          precio_costo: number
          es_proveedor_principal: boolean
          referencia_proveedor: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          producto_id: string
          proveedor_id: string
          precio_costo: number
          es_proveedor_principal?: boolean
          referencia_proveedor?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string
          proveedor_id?: string
          precio_costo?: number
          es_proveedor_principal?: boolean
          referencia_proveedor?: string | null
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_proveedores_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_proveedores_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          }
        ]
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          telefono: string | null
          email: string | null
          nit_cc: string | null
          direccion: string | null
          notas: string | null
          es_cliente_generico: boolean
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          telefono?: string | null
          email?: string | null
          nit_cc?: string | null
          direccion?: string | null
          notas?: string | null
          es_cliente_generico?: boolean
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          telefono?: string | null
          email?: string | null
          nit_cc?: string | null
          direccion?: string | null
          notas?: string | null
          es_cliente_generico?: boolean
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          id: string
          numero_ticket: number
          fecha: string
          hora: string
          empleado_id: string
          cliente_id: string
          tipo_pago: string
          subtotal: number
          descuento_global: number
          total_descuentos: number
          total_iva: number
          total: number
          factura_electronica: boolean
          observaciones: string | null
          estado: string
          anulada_por: string | null
          motivo_anulacion: string | null
          descuento_habilitado: boolean
          descuento_tipo: string | null
          descuento_total_porcentaje: number
          total_redondeado: number | null
          monto_devolucion: number
          created_at: string
        }
        Insert: {
          id?: string
          numero_ticket: number
          fecha?: string
          hora?: string
          empleado_id: string
          cliente_id: string
          tipo_pago: string
          subtotal: number
          descuento_global?: number
          total_descuentos?: number
          total_iva?: number
          total: number
          factura_electronica?: boolean
          observaciones?: string | null
          estado?: string
          anulada_por?: string | null
          motivo_anulacion?: string | null
          descuento_habilitado?: boolean
          descuento_tipo?: string | null
          descuento_total_porcentaje?: number
          total_redondeado?: number | null
          monto_devolucion?: number
          created_at?: string
        }
        Update: {
          id?: string
          numero_ticket?: number
          fecha?: string
          hora?: string
          empleado_id?: string
          cliente_id?: string
          tipo_pago?: string
          subtotal?: number
          descuento_global?: number
          total_descuentos?: number
          total_iva?: number
          total?: number
          factura_electronica?: boolean
          observaciones?: string | null
          estado?: string
          anulada_por?: string | null
          motivo_anulacion?: string | null
          descuento_habilitado?: boolean
          descuento_tipo?: string | null
          descuento_total_porcentaje?: number
          total_redondeado?: number | null
          monto_devolucion?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_anulada_por_fkey"
            columns: ["anulada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      venta_items: {
        Row: {
          id: string
          venta_id: string
          producto_id: string
          nombre_producto: string
          precio_unitario: number
          iva_unitario: number
          cantidad: number
          descuento_linea: number
          subtotal_linea: number
          descuento_habilitado: boolean
          descuento_porcentaje: number
          es_fraccionado: boolean
          cantidad_fraccion: number | null
        }
        Insert: {
          id?: string
          venta_id: string
          producto_id: string
          nombre_producto: string
          precio_unitario: number
          iva_unitario?: number
          cantidad?: number
          descuento_linea?: number
          subtotal_linea: number
          descuento_habilitado?: boolean
          descuento_porcentaje?: number
          es_fraccionado?: boolean
          cantidad_fraccion?: number | null
        }
        Update: {
          id?: string
          venta_id?: string
          producto_id?: string
          nombre_producto?: string
          precio_unitario?: number
          iva_unitario?: number
          cantidad?: number
          descuento_linea?: number
          subtotal_linea?: number
          descuento_habilitado?: boolean
          descuento_porcentaje?: number
          es_fraccionado?: boolean
          cantidad_fraccion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      movimientos_inventario: {
        Row: {
          id: string
          producto_id: string
          tipo: string
          cantidad: number
          stock_anterior: number
          stock_nuevo: number
          referencia_id: string | null
          referencia_tipo: string | null
          notas: string | null
          empleado_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          producto_id: string
          tipo: string
          cantidad: number
          stock_anterior: number
          stock_nuevo: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          notas?: string | null
          empleado_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string
          tipo?: string
          cantidad?: number
          stock_anterior?: number
          stock_nuevo?: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          notas?: string | null
          empleado_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pagos_factura_proveedor: {
        Row: {
          id: string
          factura_id: string
          monto: number
          metodo_pago: string
          fecha_pago: string
          registrado_por: string | null
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          factura_id: string
          monto: number
          metodo_pago: string
          fecha_pago: string
          registrado_por?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          factura_id?: string
          monto?: number
          metodo_pago?: string
          fecha_pago?: string
          registrado_por?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_factura_proveedor_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_factura_proveedor_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      caja_menor: {
        Row: {
          id: string
          fecha: string
          monto_base: number
          ingresos_efectivo: number
          egresos_efectivo: number
          saldo_calculado: number
          transferido_caja_mayor: number
          saldo_real: number | null
          diferencia: number | null
          cerrada: boolean
          registrado_por: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fecha: string
          monto_base: number
          ingresos_efectivo?: number
          egresos_efectivo?: number
          saldo_calculado: number
          transferido_caja_mayor?: number
          saldo_real?: number | null
          diferencia?: number | null
          cerrada?: boolean
          registrado_por?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          monto_base?: number
          ingresos_efectivo?: number
          egresos_efectivo?: number
          saldo_calculado?: number
          transferido_caja_mayor?: number
          saldo_real?: number | null
          diferencia?: number | null
          cerrada?: boolean
          registrado_por?: string | null
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caja_menor_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      conteo_billetes: {
        Row: {
          id: string
          caja_menor_id: string
          denominacion: number
          tipo: string
          cantidad: number
          subtotal: number
        }
        Insert: {
          id?: string
          caja_menor_id: string
          denominacion: number
          tipo: string
          cantidad?: number
          subtotal?: number
        }
        Update: {
          id?: string
          caja_menor_id?: string
          denominacion?: number
          tipo?: string
          cantidad?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "conteo_billetes_caja_menor_id_fkey"
            columns: ["caja_menor_id"]
            isOneToOne: false
            referencedRelation: "caja_menor"
            referencedColumns: ["id"]
          }
        ]
      }
      caja_mayor: {
        Row: {
          id: string
          saldo_actual: number
          updated_at: string
        }
        Insert: {
          id?: string
          saldo_actual?: number
          updated_at?: string
        }
        Update: {
          id?: string
          saldo_actual?: number
          updated_at?: string
        }
        Relationships: []
      }
      movimientos_caja: {
        Row: {
          id: string
          fecha: string
          hora: string
          tipo_movimiento: string
          origen_destino: string
          monto: number
          referencia_id: string | null
          referencia_tipo: string | null
          empleado_id: string | null
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fecha: string
          hora?: string
          tipo_movimiento: string
          origen_destino: string
          monto: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          empleado_id?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          hora?: string
          tipo_movimiento?: string
          origen_destino?: string
          monto?: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          empleado_id?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      saldos_medios_pago: {
        Row: {
          id: string
          medio: string
          saldo_acumulado: number
          updated_at: string
        }
        Insert: {
          id?: string
          medio: string
          saldo_acumulado?: number
          updated_at?: string
        }
        Update: {
          id?: string
          medio?: string
          saldo_acumulado?: number
          updated_at?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          id: string
          concepto: string
          categoria_gasto: string | null
          monto: number
          metodo_pago: string
          fecha: string
          proveedor_id: string | null
          comprobante_url: string | null
          notas: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          concepto: string
          categoria_gasto?: string | null
          monto: number
          metodo_pago: string
          fecha: string
          proveedor_id?: string | null
          comprobante_url?: string | null
          notas?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          concepto?: string
          categoria_gasto?: string | null
          monto?: number
          metodo_pago?: string
          fecha?: string
          proveedor_id?: string | null
          comprobante_url?: string | null
          notas?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      nominas: {
        Row: {
          id: string
          empleado_id: string
          periodo_inicio: string
          periodo_fin: string
          salario_base: number
          horas_trabajadas: number | null
          bonificaciones: number
          concepto_bonificacion: string | null
          deducciones: number
          concepto_deduccion: string | null
          total_pago: number
          fecha_pago: string | null
          estado: string
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empleado_id: string
          periodo_inicio: string
          periodo_fin: string
          salario_base: number
          horas_trabajadas?: number | null
          bonificaciones?: number
          concepto_bonificacion?: string | null
          deducciones?: number
          concepto_deduccion?: string | null
          total_pago: number
          fecha_pago?: string | null
          estado?: string
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empleado_id?: string
          periodo_inicio?: string
          periodo_fin?: string
          salario_base?: number
          horas_trabajadas?: number | null
          bonificaciones?: number
          concepto_bonificacion?: string | null
          deducciones?: number
          concepto_deduccion?: string | null
          total_pago?: number
          fecha_pago?: string | null
          estado?: string
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nominas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      horario_laboral: {
        Row: {
          id: string
          empleado_id: string
          dia_semana: string
          hora_inicio: string
          hora_fin: string
          activo: boolean
          created_at: string
          fecha: string | null
          horas_trabajadas: number | null
        }
        Insert: {
          id?: string
          empleado_id: string
          dia_semana: string
          hora_inicio: string
          hora_fin: string
          activo?: boolean
          created_at?: string
          fecha?: string | null
          horas_trabajadas?: number | null
        }
        Update: {
          id?: string
          empleado_id?: string
          dia_semana?: string
          hora_inicio?: string
          hora_fin?: string
          activo?: boolean
          created_at?: string
          fecha?: string | null
          horas_trabajadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "horario_laboral_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      retiros: {
        Row: {
          id: string
          monto: number
          origen: string
          fecha: string
          realizado_por: string
          observaciones: string
          created_at: string
        }
        Insert: {
          id?: string
          monto: number
          origen: string
          fecha: string
          realizado_por: string
          observaciones: string
          created_at?: string
        }
        Update: {
          id?: string
          monto?: number
          origen?: string
          fecha?: string
          realizado_por?: string
          observaciones?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiros_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          nombre_completo: string
          rol: string
          telefono: string | null
          salario_base: number | null
          activo: boolean
          created_at: string
          updated_at: string
          foto_url: string | null
          email: string | null
        }
        Insert: {
          id: string
          nombre_completo: string
          rol?: string
          telefono?: string | null
          salario_base?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string
          foto_url?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          nombre_completo?: string
          rol?: string
          telefono?: string | null
          salario_base?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string
          foto_url?: string | null
          email?: string | null
        }
        Relationships: []
      }
      venta_pagos: {
        Row: {
          id: string
          venta_id: string
          metodo: string
          monto: number
          monto_recibido: number | null
          vueltas: number | null
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          metodo: string
          monto: number
          monto_recibido?: number | null
          vueltas?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          venta_id?: string
          metodo?: string
          monto?: number
          monto_recibido?: number | null
          vueltas?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_pagos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          }
        ]
      }
      servicios: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      venta_servicios: {
        Row: {
          id: string
          venta_id: string
          servicio_id: string | null
          nombre_servicio: string
          precio_aplicado: number
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          servicio_id?: string | null
          nombre_servicio: string
          precio_aplicado: number
          created_at?: string
        }
        Update: {
          id?: string
          venta_id?: string
          servicio_id?: string | null
          nombre_servicio?: string
          precio_aplicado?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_servicios_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          }
        ]
      }
      devoluciones: {
        Row: {
          id: string
          venta_id: string
          tipo: string
          observacion: string
          monto_devuelto: number
          monto_cobrado: number
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          tipo: string
          observacion: string
          monto_devuelto?: number
          monto_cobrado?: number
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          venta_id?: string
          tipo?: string
          observacion?: string
          monto_devuelto?: number
          monto_cobrado?: number
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          }
        ]
      }
      devolucion_items: {
        Row: {
          id: string
          devolucion_id: string
          venta_item_id: string | null
          producto_id: string | null
          nombre_producto: string
          cantidad: number
          precio_unitario: number
          subtotal_devuelto: number
        }
        Insert: {
          id?: string
          devolucion_id: string
          venta_item_id?: string | null
          producto_id?: string | null
          nombre_producto: string
          cantidad: number
          precio_unitario: number
          subtotal_devuelto: number
        }
        Update: {
          id?: string
          devolucion_id?: string
          venta_item_id?: string | null
          producto_id?: string | null
          nombre_producto?: string
          cantidad?: number
          precio_unitario?: number
          subtotal_devuelto?: number
        }
        Relationships: [
          {
            foreignKeyName: "devolucion_items_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_clientes: {
        Args: { p_query: string }
        Returns: {
          id: string; nombre: string; telefono: string | null
          nit_cc: string | null; email: string | null
          es_cliente_generico: boolean; similitud: number
        }[]
      }
      registrar_venta_credito: {
        Args: {
          p_cliente_id: string
          p_items: any
          p_servicios?: any
          p_descuento_habilitado?: boolean
          p_descuento_tipo?: string | null
          p_descuento_total_porcentaje?: number
          p_fecha_pago_programada?: string | null
          p_observaciones?: string | null
          p_factura_electronica?: boolean
        }
        Returns: string
      }
      registrar_abono_credito: {
        Args: {
          p_venta_credito_id: string
          p_monto: number
          p_fuentes: any
          p_observaciones?: string | null
        }
        Returns: undefined
      }
      actualizar_fecha_pago_credito: {
        Args: {
          p_venta_credito_id: string
          p_fecha_pago: string
          p_notas?: string | null
        }
        Returns: undefined
      }

      abrir_caja: {
        Args: { p_monto_base: number }
        Returns: string
      }
      calcular_rotacion_productos: {
        Args: {
          p_producto_ids: string[]
          p_dias: number
        }
        Returns: {
          producto_id: string
          unidades_vendidas: number
          dias_con_datos: number
          rotacion_diaria: number
        }[]
      }
      buscar_productos: {
        Args: { p_query: string }
        Returns: {
          id: string
          nombre: string
          codigo: string | null
          descripcion: string | null
          marca: string | null
          unidad_medida: string | null
          precio_venta: number
          stock_almacen: number
          stock_bodega: number
          ubicacion: string | null
          vender_por_fraccion: boolean
          medida_venta: string | null
          cantidad_total_unidad: number | null
          cantidad_minima_venta: number | null
          precio_por_unidad_medida: number | null
          remanente_fraccion: number
          tiene_iva: boolean
          iva_incluido: boolean
          porcentaje_iva: number
          similitud: number
        }[]
      }
      mover_stock_bodega_almacen: {
        Args: {
          p_producto_id: string
          p_cantidad: number
        }
        Returns: undefined
      }
      cerrar_caja: {
        Args: {
          p_notas?: string | null
          p_observacion_inconsistencia?: string | null
          p_conteo_cierre?: Json | null
        }
        Returns: undefined
      }
      cerrar_caja_arqueo: {
        Args: {
          p_conteo_base: any
          p_conteo_sobrante: any
          p_observacion_diferencia?: string | null
        }
        Returns: Json
      }
      registrar_retiro: {
        Args: {
          p_monto: number
          p_observaciones: string
          p_fuentes: any
        }
        Returns: undefined
      }
      registrar_gasto_caja: {
        Args: {
          p_concepto: string
          p_categoria: string
          p_monto: number
          p_fuentes: any
          p_proveedor_id?: string | null
          p_notas?: string | null
        }
        Returns: undefined
      }
      actualizar_denominaciones: {
        Args: {
          p_tipo: string
          p_denominaciones: any
        }
        Returns: undefined
      }
      registrar_nomina: {
        Args: {
          p_empleado_id: string
          p_fecha: string
          p_horas_trabajadas: number
          p_salario_base: number
          p_bonificaciones?: number
          p_concepto_bonificacion?: string | null
          p_deducciones?: number
          p_concepto_deduccion?: string | null
          p_metodo_pago?: string
          p_notas?: string | null
        }
        Returns: string
      }
      registrar_pago_factura: {
        Args: {
          p_factura_id: string
          p_monto: number
          p_fuentes: any
          p_fecha_pago: string
          p_observaciones?: string | null
        }
        Returns: undefined
      } 
      registrar_venta: {
        Args: {
          p_cliente_id: string
          p_tipo_pago: string
          p_items: Json
          p_pagos: Json
          p_descuento_habilitado?: boolean
          p_descuento_tipo?: string | null
          p_descuento_total_porcentaje?: number
          p_factura_electronica?: boolean
          p_observaciones?: string | null
          p_servicios?: Json | null
        }
        Returns: string
      }
      anular_venta: {
        Args: {
          p_venta_id: string
          p_motivo: string
        }
        Returns: undefined
      }
      devolver_productos: {
        Args: {
          p_venta_id: string
          p_items_devolucion: Json
          p_observacion: string
        }
        Returns: Json
      }
      cambiar_productos: {
        Args: {
          p_venta_id: string
          p_items_retirar: Json
          p_items_agregar: Json
          p_observacion: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}