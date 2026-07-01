export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      abonos_credito: {
        Row: {
          created_at: string
          fuentes: Json
          id: string
          monto: number
          observaciones: string | null
          registrado_por: string | null
          venta_credito_id: string
        }
        Insert: {
          created_at?: string
          fuentes?: Json
          id?: string
          monto: number
          observaciones?: string | null
          registrado_por?: string | null
          venta_credito_id: string
        }
        Update: {
          created_at?: string
          fuentes?: Json
          id?: string
          monto?: number
          observaciones?: string | null
          registrado_por?: string | null
          venta_credito_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonos_credito_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonos_credito_venta_credito_id_fkey"
            columns: ["venta_credito_id"]
            isOneToOne: false
            referencedRelation: "ventas_credito"
            referencedColumns: ["id"]
          },
        ]
      }
      arqueo_caja: {
        Row: {
          created_at: string
          diferencia: number
          egresos_efectivo: number
          fecha: string
          id: string
          ingresos_efectivo: number
          observacion_diferencia: string | null
          registrado_por: string | null
          saldo_sistema: number
          total_contado_base: number
          total_contado_sobrante: number
          transferido_caja_mayor: number
        }
        Insert: {
          created_at?: string
          diferencia?: number
          egresos_efectivo?: number
          fecha: string
          id?: string
          ingresos_efectivo?: number
          observacion_diferencia?: string | null
          registrado_por?: string | null
          saldo_sistema?: number
          total_contado_base?: number
          total_contado_sobrante?: number
          transferido_caja_mayor?: number
        }
        Update: {
          created_at?: string
          diferencia?: number
          egresos_efectivo?: number
          fecha?: string
          id?: string
          ingresos_efectivo?: number
          observacion_diferencia?: string | null
          registrado_por?: string | null
          saldo_sistema?: number
          total_contado_base?: number
          total_contado_sobrante?: number
          transferido_caja_mayor?: number
        }
        Relationships: [
          {
            foreignKeyName: "arqueo_caja_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arqueo_detalle: {
        Row: {
          arqueo_id: string
          cantidad: number
          denominacion: number
          es_moneda: boolean
          id: string
          subtotal: number
          tipo: string
        }
        Insert: {
          arqueo_id: string
          cantidad?: number
          denominacion: number
          es_moneda?: boolean
          id?: string
          subtotal?: number
          tipo: string
        }
        Update: {
          arqueo_id?: string
          cantidad?: number
          denominacion?: number
          es_moneda?: boolean
          id?: string
          subtotal?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "arqueo_detalle_arqueo_id_fkey"
            columns: ["arqueo_id"]
            isOneToOne: false
            referencedRelation: "arqueo_caja"
            referencedColumns: ["id"]
          },
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
      caja_menor: {
        Row: {
          cerrada: boolean
          created_at: string
          diferencia: number | null
          egresos_efectivo: number
          fecha: string
          id: string
          ingresos_efectivo: number
          monto_base: number
          notas: string | null
          registrado_por: string | null
          saldo_calculado: number
          saldo_real: number | null
          transferido_caja_mayor: number
        }
        Insert: {
          cerrada?: boolean
          created_at?: string
          diferencia?: number | null
          egresos_efectivo?: number
          fecha: string
          id?: string
          ingresos_efectivo?: number
          monto_base: number
          notas?: string | null
          registrado_por?: string | null
          saldo_calculado: number
          saldo_real?: number | null
          transferido_caja_mayor?: number
        }
        Update: {
          cerrada?: boolean
          created_at?: string
          diferencia?: number | null
          egresos_efectivo?: number
          fecha?: string
          id?: string
          ingresos_efectivo?: number
          monto_base?: number
          notas?: string | null
          registrado_por?: string | null
          saldo_calculado?: number
          saldo_real?: number | null
          transferido_caja_mayor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caja_menor_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_gasto: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      categorias_producto: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          email: string | null
          es_cliente_generico: boolean
          id: string
          nit_cc: string | null
          nombre: string
          notas: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          es_cliente_generico?: boolean
          id?: string
          nit_cc?: string | null
          nombre: string
          notas?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          email?: string | null
          es_cliente_generico?: boolean
          id?: string
          nit_cc?: string | null
          nombre?: string
          notas?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      configuracion_negocio: {
        Row: {
          ciudad: string | null
          direccion: string | null
          email: string | null
          id: string
          logo_url: string | null
          margen_default: number | null
          max_descuento_porcentaje: number | null
          mensaje_pie: string | null
          monto_base_caja_menor: number
          monto_inicial_monedas: number
          monto_inicial_sencillo: number
          nit: string | null
          nombre: string
          regimen: string | null
          telefono: string | null
          updated_at: string
          whatsapp_negocio: string | null
        }
        Insert: {
          ciudad?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          margen_default?: number | null
          max_descuento_porcentaje?: number | null
          mensaje_pie?: string | null
          monto_base_caja_menor?: number
          monto_inicial_monedas?: number
          monto_inicial_sencillo?: number
          nit?: string | null
          nombre?: string
          regimen?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp_negocio?: string | null
        }
        Update: {
          ciudad?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          margen_default?: number | null
          max_descuento_porcentaje?: number | null
          mensaje_pie?: string | null
          monto_base_caja_menor?: number
          monto_inicial_monedas?: number
          monto_inicial_sencillo?: number
          nit?: string | null
          nombre?: string
          regimen?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp_negocio?: string | null
        }
        Relationships: []
      }
      conteo_billetes: {
        Row: {
          caja_menor_id: string
          cantidad: number
          denominacion: number
          id: string
          subtotal: number
          tipo: string
        }
        Insert: {
          caja_menor_id: string
          cantidad?: number
          denominacion: number
          id?: string
          subtotal: number
          tipo: string
        }
        Update: {
          caja_menor_id?: string
          cantidad?: number
          denominacion?: number
          id?: string
          subtotal?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteo_billetes_caja_menor_id_fkey"
            columns: ["caja_menor_id"]
            isOneToOne: false
            referencedRelation: "caja_menor"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucion_items: {
        Row: {
          cantidad: number
          devolucion_id: string
          id: string
          nombre_producto: string
          precio_unitario: number
          producto_id: string | null
          subtotal_devuelto: number
          venta_item_id: string | null
        }
        Insert: {
          cantidad: number
          devolucion_id: string
          id?: string
          nombre_producto: string
          precio_unitario: number
          producto_id?: string | null
          subtotal_devuelto: number
          venta_item_id?: string | null
        }
        Update: {
          cantidad?: number
          devolucion_id?: string
          id?: string
          nombre_producto?: string
          precio_unitario?: number
          producto_id?: string | null
          subtotal_devuelto?: number
          venta_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devolucion_items_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucion_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucion_items_venta_item_id_fkey"
            columns: ["venta_item_id"]
            isOneToOne: false
            referencedRelation: "venta_items"
            referencedColumns: ["id"]
          },
        ]
      }
      devoluciones: {
        Row: {
          created_at: string
          id: string
          monto_cobrado: number
          monto_devuelto: number
          observacion: string
          registrado_por: string | null
          tipo: string
          venta_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monto_cobrado?: number
          monto_devuelto?: number
          observacion: string
          registrado_por?: string | null
          tipo: string
          venta_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monto_cobrado?: number
          monto_devuelto?: number
          observacion?: string
          registrado_por?: string | null
          tipo?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_proveedor: {
        Row: {
          created_at: string
          estado: string
          fecha_emision: string
          fecha_vencimiento: string | null
          id: string
          monto_pagado: number
          monto_total: number
          notas: string | null
          numero_factura: string | null
          proveedor_id: string
          saldo_pendiente: number
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_emision: string
          fecha_vencimiento?: string | null
          id?: string
          monto_pagado?: number
          monto_total: number
          notas?: string | null
          numero_factura?: string | null
          proveedor_id: string
          saldo_pendiente: number
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: string
          monto_pagado?: number
          monto_total?: number
          notas?: string | null
          numero_factura?: string | null
          proveedor_id?: string
          saldo_pendiente?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fondos_denominaciones: {
        Row: {
          billetes_acumulados: number
          cantidad: number
          denominacion: number
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          billetes_acumulados?: number
          cantidad?: number
          denominacion: number
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          billetes_acumulados?: number
          cantidad?: number
          denominacion?: number
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      garantias: {
        Row: {
          cantidad: number
          created_at: string | null
          devolucion_id: string | null
          estado: string
          fecha_recibida: string | null
          fecha_registro: string
          id: string
          nombre_producto: string
          observaciones: string | null
          producto_id: string | null
          proveedor_id: string | null
          registrado_por: string | null
          stock_destino: string | null
          venta_id: string | null
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          devolucion_id?: string | null
          estado?: string
          fecha_recibida?: string | null
          fecha_registro?: string
          id?: string
          nombre_producto: string
          observaciones?: string | null
          producto_id?: string | null
          proveedor_id?: string | null
          registrado_por?: string | null
          stock_destino?: string | null
          venta_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          devolucion_id?: string | null
          estado?: string
          fecha_recibida?: string | null
          fecha_registro?: string
          id?: string
          nombre_producto?: string
          observaciones?: string | null
          producto_id?: string | null
          proveedor_id?: string | null
          registrado_por?: string | null
          stock_destino?: string | null
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria_gasto: string | null
          comprobante_url: string | null
          concepto: string
          created_at: string
          fecha: string
          id: string
          metodo_pago: string
          monto: number
          notas: string | null
          proveedor_id: string | null
          registrado_por: string | null
        }
        Insert: {
          categoria_gasto?: string | null
          comprobante_url?: string | null
          concepto: string
          created_at?: string
          fecha: string
          id?: string
          metodo_pago: string
          monto: number
          notas?: string | null
          proveedor_id?: string | null
          registrado_por?: string | null
        }
        Update: {
          categoria_gasto?: string | null
          comprobante_url?: string | null
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          metodo_pago?: string
          monto?: number
          notas?: string | null
          proveedor_id?: string | null
          registrado_por?: string | null
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
          },
        ]
      }
      horario_laboral: {
        Row: {
          activo: boolean
          created_at: string
          dia_semana: string
          empleado_id: string
          fecha: string | null
          hora_fin: string
          hora_inicio: string
          horas_trabajadas: number | null
          id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          dia_semana: string
          empleado_id: string
          fecha?: string | null
          hora_fin: string
          hora_inicio: string
          horas_trabajadas?: number | null
          id?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          dia_semana?: string
          empleado_id?: string
          fecha?: string | null
          hora_fin?: string
          hora_inicio?: string
          horas_trabajadas?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horario_laboral_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_fuentes: {
        Row: {
          created_at: string
          fuente: string
          id: string
          monto: number
          movimiento_id: string
        }
        Insert: {
          created_at?: string
          fuente: string
          id?: string
          monto: number
          movimiento_id: string
        }
        Update: {
          created_at?: string
          fuente?: string
          id?: string
          monto?: number
          movimiento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_fuentes_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos_caja"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_caja: {
        Row: {
          created_at: string
          empleado_id: string | null
          fecha: string
          hora: string
          id: string
          monto: number
          observaciones: string | null
          origen_destino: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo_movimiento: string
        }
        Insert: {
          created_at?: string
          empleado_id?: string | null
          fecha: string
          hora?: string
          id?: string
          monto: number
          observaciones?: string | null
          origen_destino: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_movimiento: string
        }
        Update: {
          created_at?: string
          empleado_id?: string | null
          fecha?: string
          hora?: string
          id?: string
          monto?: number
          observaciones?: string | null
          origen_destino?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_movimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          created_at: string
          empleado_id: string | null
          id: string
          notas: string | null
          producto_id: string
          referencia_id: string | null
          referencia_tipo: string | null
          stock_anterior: number
          stock_nuevo: number
          tipo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          empleado_id?: string | null
          id?: string
          notas?: string | null
          producto_id: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          stock_anterior: number
          stock_nuevo: number
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          empleado_id?: string | null
          id?: string
          notas?: string | null
          producto_id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          stock_anterior?: number
          stock_nuevo?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      nominas: {
        Row: {
          bonificaciones: number
          concepto_bonificacion: string | null
          concepto_deduccion: string | null
          created_at: string
          deducciones: number
          empleado_id: string
          estado: string
          fecha_pago: string | null
          horas_trabajadas: number | null
          id: string
          notas: string | null
          periodo_fin: string
          periodo_inicio: string
          salario_base: number
          total_pago: number
        }
        Insert: {
          bonificaciones?: number
          concepto_bonificacion?: string | null
          concepto_deduccion?: string | null
          created_at?: string
          deducciones?: number
          empleado_id: string
          estado?: string
          fecha_pago?: string | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          periodo_fin: string
          periodo_inicio: string
          salario_base: number
          total_pago: number
        }
        Update: {
          bonificaciones?: number
          concepto_bonificacion?: string | null
          concepto_deduccion?: string | null
          created_at?: string
          deducciones?: number
          empleado_id?: string
          estado?: string
          fecha_pago?: string | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          salario_base?: number
          total_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "nominas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_factura_proveedor: {
        Row: {
          created_at: string
          factura_id: string
          fecha_pago: string
          id: string
          metodo_pago: string
          monto: number
          observaciones: string | null
          registrado_por: string | null
        }
        Insert: {
          created_at?: string
          factura_id: string
          fecha_pago: string
          id?: string
          metodo_pago: string
          monto: number
          observaciones?: string | null
          registrado_por?: string | null
        }
        Update: {
          created_at?: string
          factura_id?: string
          fecha_pago?: string
          id?: string
          metodo_pago?: string
          monto?: number
          observaciones?: string | null
          registrado_por?: string | null
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
          },
        ]
      }
      pagos_programados_proveedor: {
        Row: {
          created_at: string
          factura_id: string
          fecha_programada: string
          id: string
          monto: number
          nota: string | null
          pagado: boolean
        }
        Insert: {
          created_at?: string
          factura_id: string
          fecha_programada: string
          id?: string
          monto: number
          nota?: string | null
          pagado?: boolean
        }
        Update: {
          created_at?: string
          factura_id?: string
          fecha_programada?: string
          id?: string
          monto?: number
          nota?: string | null
          pagado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pagos_programados_proveedor_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedor"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_proveedores: {
        Row: {
          created_at: string
          es_proveedor_principal: boolean
          id: string
          notas: string | null
          precio_costo: number
          producto_id: string
          proveedor_id: string
          referencia_proveedor: string | null
        }
        Insert: {
          created_at?: string
          es_proveedor_principal?: boolean
          id?: string
          notas?: string | null
          precio_costo: number
          producto_id: string
          proveedor_id: string
          referencia_proveedor?: string | null
        }
        Update: {
          created_at?: string
          es_proveedor_principal?: boolean
          id?: string
          notas?: string | null
          precio_costo?: number
          producto_id?: string
          proveedor_id?: string
          referencia_proveedor?: string | null
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
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          cantidad_minima_venta: number | null
          cantidad_total_unidad: number | null
          categoria_id: string | null
          codigo: string | null
          created_at: string
          descripcion: string | null
          familia_id: string | null
          id: string
          imagen_url: string | null
          iva_incluido: boolean
          marca: string | null
          margen_calculado: number | null
          medida_venta: string | null
          nombre: string
          porcentaje_iva: number
          precio_costo_base: number | null
          precio_por_unidad_medida: number | null
          precio_venta: number
          prioridad: number
          remanente_fraccion: number
          stock_actual: number
          stock_almacen: number
          stock_bodega: number
          stock_minimo: number
          tiene_iva: boolean
          ubicacion: string | null
          unidad_medida: string | null
          updated_at: string
          vender_por_fraccion: boolean
        }
        Insert: {
          activo?: boolean
          cantidad_minima_venta?: number | null
          cantidad_total_unidad?: number | null
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          familia_id?: string | null
          id?: string
          imagen_url?: string | null
          iva_incluido?: boolean
          marca?: string | null
          margen_calculado?: number | null
          medida_venta?: string | null
          nombre: string
          porcentaje_iva?: number
          precio_costo_base?: number | null
          precio_por_unidad_medida?: number | null
          precio_venta: number
          prioridad?: number
          remanente_fraccion?: number
          stock_actual?: number
          stock_almacen?: number
          stock_bodega?: number
          stock_minimo?: number
          tiene_iva?: boolean
          ubicacion?: string | null
          unidad_medida?: string | null
          updated_at?: string
          vender_por_fraccion?: boolean
        }
        Update: {
          activo?: boolean
          cantidad_minima_venta?: number | null
          cantidad_total_unidad?: number | null
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          familia_id?: string | null
          id?: string
          imagen_url?: string | null
          iva_incluido?: boolean
          marca?: string | null
          margen_calculado?: number | null
          medida_venta?: string | null
          nombre?: string
          porcentaje_iva?: number
          precio_costo_base?: number | null
          precio_por_unidad_medida?: number | null
          precio_venta?: number
          prioridad?: number
          remanente_fraccion?: number
          stock_actual?: number
          stock_almacen?: number
          stock_bodega?: number
          stock_minimo?: number
          tiene_iva?: boolean
          ubicacion?: string | null
          unidad_medida?: string | null
          updated_at?: string
          vender_por_fraccion?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          foto_url: string | null
          id: string
          nombre_completo: string
          rol: string
          salario_base: number | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre_completo: string
          rol?: string
          salario_base?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          nombre_completo?: string
          rol?: string
          salario_base?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          contacto: string | null
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nit_ruc: string | null
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nit_ruc?: string | null
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nit_ruc?: string | null
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      retiros: {
        Row: {
          created_at: string
          fecha: string
          id: string
          monto: number
          observaciones: string
          origen: string
          realizado_por: string
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          monto: number
          observaciones: string
          origen: string
          realizado_por: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          observaciones?: string
          origen?: string
          realizado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiros_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      servicios: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          precio: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          precio: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          precio?: number
          updated_at?: string
        }
        Relationships: []
      }
      venta_items: {
        Row: {
          cantidad: number
          cantidad_fraccion: number | null
          costo_unitario: number
          descuento_habilitado: boolean
          descuento_linea: number
          descuento_porcentaje: number
          es_fraccionado: boolean
          id: string
          iva_unitario: number
          nombre_producto: string
          precio_unitario: number
          producto_id: string
          subtotal_linea: number
          venta_id: string
        }
        Insert: {
          cantidad?: number
          cantidad_fraccion?: number | null
          costo_unitario?: number
          descuento_habilitado?: boolean
          descuento_linea?: number
          descuento_porcentaje?: number
          es_fraccionado?: boolean
          id?: string
          iva_unitario?: number
          nombre_producto: string
          precio_unitario: number
          producto_id: string
          subtotal_linea: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          cantidad_fraccion?: number | null
          costo_unitario?: number
          descuento_habilitado?: boolean
          descuento_linea?: number
          descuento_porcentaje?: number
          es_fraccionado?: boolean
          id?: string
          iva_unitario?: number
          nombre_producto?: string
          precio_unitario?: number
          producto_id?: string
          subtotal_linea?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_pagos: {
        Row: {
          created_at: string
          id: string
          metodo: string
          monto: number
          monto_recibido: number | null
          venta_id: string
          vueltas: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          metodo: string
          monto: number
          monto_recibido?: number | null
          venta_id: string
          vueltas?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          metodo?: string
          monto?: number
          monto_recibido?: number | null
          venta_id?: string
          vueltas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_pagos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_servicios: {
        Row: {
          created_at: string
          id: string
          nombre_servicio: string
          precio_aplicado: number
          servicio_id: string | null
          venta_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre_servicio: string
          precio_aplicado: number
          servicio_id?: string | null
          venta_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre_servicio?: string
          precio_aplicado?: number
          servicio_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_servicios_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          anulada_por: string | null
          cliente_id: string
          created_at: string
          descuento_global: number
          descuento_habilitado: boolean
          descuento_tipo: string | null
          descuento_total_porcentaje: number
          empleado_id: string
          estado: string
          factura_electronica: boolean
          fecha: string
          hora: string
          id: string
          monto_devolucion: number
          motivo_anulacion: string | null
          numero_ticket: number
          observaciones: string | null
          subtotal: number
          tipo_pago: string
          total: number
          total_descuentos: number
          total_iva: number
          total_redondeado: number | null
        }
        Insert: {
          anulada_por?: string | null
          cliente_id: string
          created_at?: string
          descuento_global?: number
          descuento_habilitado?: boolean
          descuento_tipo?: string | null
          descuento_total_porcentaje?: number
          empleado_id: string
          estado?: string
          factura_electronica?: boolean
          fecha?: string
          hora?: string
          id?: string
          monto_devolucion?: number
          motivo_anulacion?: string | null
          numero_ticket: number
          observaciones?: string | null
          subtotal: number
          tipo_pago: string
          total: number
          total_descuentos?: number
          total_iva?: number
          total_redondeado?: number | null
        }
        Update: {
          anulada_por?: string | null
          cliente_id?: string
          created_at?: string
          descuento_global?: number
          descuento_habilitado?: boolean
          descuento_tipo?: string | null
          descuento_total_porcentaje?: number
          empleado_id?: string
          estado?: string
          factura_electronica?: boolean
          fecha?: string
          hora?: string
          id?: string
          monto_devolucion?: number
          motivo_anulacion?: string | null
          numero_ticket?: number
          observaciones?: string | null
          subtotal?: number
          tipo_pago?: string
          total?: number
          total_descuentos?: number
          total_iva?: number
          total_redondeado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_anulada_por_fkey"
            columns: ["anulada_por"]
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
            foreignKeyName: "ventas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas_credito: {
        Row: {
          cliente_id: string
          created_at: string
          estado: string
          fecha_pago_programada: string | null
          id: string
          monto_original: number
          notas: string | null
          saldo_pendiente: number
          updated_at: string
          venta_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: string
          fecha_pago_programada?: string | null
          id?: string
          monto_original?: number
          notas?: string | null
          saldo_pendiente?: number
          updated_at?: string
          venta_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: string
          fecha_pago_programada?: string | null
          id?: string
          monto_original?: number
          notas?: string | null
          saldo_pendiente?: number
          updated_at?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_credito_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_credito_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: true
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_caja: { Args: { p_monto_base: number }; Returns: string }
      actualizar_denominaciones: {
        Args: { p_denominaciones: Json; p_tipo: string }
        Returns: undefined
      }
      actualizar_fecha_pago_credito: {
        Args: {
          p_fecha_pago: string
          p_notas?: string
          p_venta_credito_id: string
        }
        Returns: undefined
      }
      anular_venta: {
        Args: { p_motivo: string; p_venta_id: string }
        Returns: undefined
      }
      buscar_clientes: {
        Args: { p_query: string }
        Returns: {
          email: string
          es_cliente_generico: boolean
          id: string
          nit_cc: string
          nombre: string
          similitud: number
          telefono: string
        }[]
      }
      buscar_productos: {
        Args: { p_query: string }
        Returns: {
          cantidad_minima_venta: number
          cantidad_total_unidad: number
          codigo: string
          descripcion: string
          id: string
          imagen_url: string
          iva_incluido: boolean
          marca: string
          medida_venta: string
          nombre: string
          porcentaje_iva: number
          precio_por_unidad_medida: number
          precio_venta: number
          remanente_fraccion: number
          similitud: number
          stock_almacen: number
          stock_bodega: number
          tiene_iva: boolean
          ubicacion: string
          unidad_medida: string
          vender_por_fraccion: boolean
        }[]
      }
      calcular_rotacion_productos: {
        Args: { p_dias?: number; p_producto_ids: string[] }
        Returns: {
          dias_con_datos: number
          producto_id: string
          rotacion_diaria: number
          unidades_vendidas: number
        }[]
      }
      cambiar_productos: {
        Args: {
          p_items_agregar: Json
          p_items_retirar: Json
          p_observacion: string
          p_venta_id: string
        }
        Returns: Json
      }
      cerrar_caja: {
        Args: {
          p_conteo_cierre?: Json
          p_notas?: string
          p_observacion_inconsistencia?: string
        }
        Returns: undefined
      }
      cerrar_caja_arqueo: {
        Args: {
          p_conteo_base: Json
          p_conteo_sobrante: Json
          p_observacion_diferencia?: string
        }
        Returns: Json
      }
      devolver_productos: {
        Args: {
          p_items_devolucion: Json
          p_observacion: string
          p_venta_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      mover_stock_bodega_almacen: {
        Args: { p_cantidad: number; p_producto_id: string }
        Returns: undefined
      }
      recibir_garantia: {
        Args: { p_garantia_id: string; p_stock_destino?: string }
        Returns: undefined
      }
      registrar_abono_credito: {
        Args: {
          p_fuentes: Json
          p_monto: number
          p_observaciones?: string
          p_venta_credito_id: string
        }
        Returns: undefined
      }
      registrar_gasto_caja: {
        Args: {
          p_categoria: string
          p_concepto: string
          p_fuentes: Json
          p_monto: number
          p_notas?: string
          p_proveedor_id?: string
        }
        Returns: undefined
      }
      registrar_nomina: {
        Args: {
          p_bonificaciones?: number
          p_concepto_bonificacion?: string
          p_concepto_deduccion?: string
          p_deducciones?: number
          p_empleado_id: string
          p_fecha: string
          p_horas_trabajadas?: number
          p_metodo_pago?: string
          p_notas?: string
          p_salario_base?: number
        }
        Returns: string
      }
      registrar_pago_factura: {
        Args: {
          p_factura_id: string
          p_fecha_pago: string
          p_fuentes: Json
          p_monto: number
          p_observaciones?: string
        }
        Returns: undefined
      }
      registrar_retiro: {
        Args: { p_fuentes: Json; p_monto: number; p_observaciones: string }
        Returns: undefined
      }
      registrar_venta: {
        Args: {
          p_cliente_id: string
          p_descuento_habilitado?: boolean
          p_descuento_tipo?: string
          p_descuento_total_porcentaje?: number
          p_factura_electronica?: boolean
          p_items: Json
          p_observaciones?: string
          p_pagos: Json
          p_servicios?: Json
          p_tipo_pago: string
        }
        Returns: string
      }
      registrar_venta_credito: {
        Args: {
          p_cliente_id: string
          p_descuento_habilitado?: boolean
          p_descuento_tipo?: string
          p_descuento_total_porcentaje?: number
          p_factura_electronica?: boolean
          p_fecha_pago_programada?: string
          p_items: Json
          p_observaciones?: string
          p_servicios?: Json
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transferir_entre_fondos: {
        Args: {
          p_destino: string
          p_monto: number
          p_observaciones?: string
          p_origen: string
        }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const