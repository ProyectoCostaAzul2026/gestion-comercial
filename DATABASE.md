# DATABASE.md — Ferreléctricos Costa Azul
> Documentación de la base de datos en Supabase (PostgreSQL)
> Proyecto: `qmeegynucijohagywdcr`
> Última actualización: 2026-06-29

---

## Índice
1. [Tablas](#tablas)
2. [Relaciones (Claves Foráneas)](#relaciones)
3. [Índices](#índices)
4. [RPCs (Funciones)](#rpcs)
5. [Políticas RLS](#políticas-rls)
6. [Triggers](#triggers)

---

## Tablas

### `profiles`
Extiende `auth.users` de Supabase. Un registro por usuario autenticado.

| Columna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| id | uuid | NO | — | PK, referencia a auth.users |
| nombre_completo | varchar | NO | — | |
| rol | varchar | NO | — | `administrador` o `empleado` |
| telefono | varchar | YES | — | |
| email | varchar | YES | — | |
| salario_base | numeric | YES | — | Salario diario base |
| foto_url | text | YES | — | |
| activo | boolean | NO | true | |
| created_at | timestamptz | NO | now() | |

---

### `clientes`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre | varchar | NO | — |
| telefono | varchar | YES | — |
| email | varchar | YES | — |
| nit_cc | varchar | YES | — |
| direccion | text | YES | — |
| notas | text | YES | — |
| es_cliente_generico | boolean | NO | false |
| activo | boolean | NO | true |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP |

---

### `proveedores`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre | varchar | NO | — |
| contacto | varchar | YES | — |
| telefono | varchar | YES | — |
| email | varchar | YES | — |
| direccion | text | YES | — |
| nit_ruc | varchar | YES | — |
| notas | text | YES | — |
| activo | boolean | NO | true |

---

### `categorias_producto`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre | varchar | NO | — | UNIQUE |
| descripcion | text | YES | — |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP |

---

### `productos`
| Columna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | |
| nombre | varchar | NO | — | Índice GIN trgm |
| descripcion | text | YES | — | Índice GIN trgm |
| codigo | varchar | YES | — | UNIQUE |
| categoria_id | uuid | YES | — | FK → categorias_producto |
| marca | varchar | YES | — | Índice GIN trgm |
| ubicacion | varchar | YES | — | |
| precio_venta | numeric | NO | — | |
| precio_costo_base | numeric | YES | — | Calculado por trigger desde producto_proveedores |
| margen_calculado | numeric | YES | — | |
| tiene_iva | boolean | NO | false | |
| iva_incluido | boolean | NO | false | |
| porcentaje_iva | numeric | NO | 19 | |
| stock_bodega | int4 | NO | 0 | |
| stock_almacen | int4 | NO | 0 | |
| stock_actual | int4 | NO | 0 | Calculado: bodega + almacen (trigger) |
| stock_minimo | int4 | NO | 0 | |
| prioridad | int4 | NO | 3 | 1=Crítico … 5=Mínima |
| unidad_medida | varchar | YES | — | Ej: "50 mm", "1 Kg" |
| imagen_url | text | YES | — | |
| activo | boolean | NO | true | |
| vender_por_fraccion | boolean | NO | false | |
| medida_venta | varchar | YES | — | Ej: "metro", "kg" |
| cantidad_total_unidad | numeric | YES | — | |
| cantidad_minima_venta | numeric | YES | — | |
| precio_por_unidad_medida | numeric | YES | — | |
| remanente_fraccion | numeric | NO | 0 | |

**Triggers:**
- `fn_sync_stock_actual` — actualiza `stock_actual = stock_bodega + stock_almacen`
- `fn_actualizar_precio_costo_base` — actualiza `precio_costo_base` desde el menor precio de `producto_proveedores`

---

### `producto_proveedores`
Relación muchos-a-muchos entre productos y proveedores.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| producto_id | uuid | NO | — | FK → productos |
| proveedor_id | uuid | NO | — | FK → proveedores |
| precio_costo | numeric | NO | — | |
| referencia_proveedor | varchar | YES | — | |
| notas | text | YES | — | |
| es_proveedor_principal | boolean | NO | false | |
| created_at | timestamptz | NO | now() | |

**Índice único:** `(producto_id, proveedor_id)`

---

### `ventas`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| numero_ticket | int4 | NO | — | UNIQUE por fecha |
| fecha | date | NO | — | |
| hora | time | NO | — | |
| empleado_id | uuid | NO | — | FK → profiles |
| cliente_id | uuid | YES | — | FK → clientes |
| tipo_pago | varchar | NO | — | efectivo/nequi/daviplata/tarjeta/mixto/credito |
| subtotal | numeric | NO | 0 | Sin descuentos |
| descuento_global | numeric | NO | 0 | |
| descuento_habilitado | boolean | NO | false | |
| descuento_tipo | varchar | YES | — | |
| descuento_total_porcentaje | numeric | NO | 0 | |
| total_descuentos | numeric | NO | 0 | |
| total_iva | numeric | NO | 0 | Informativo |
| total | numeric | NO | 0 | |
| total_redondeado | numeric | YES | — | |
| factura_electronica | boolean | NO | false | |
| observaciones | text | YES | — | |
| estado | varchar | NO | completada | completada/modificada/anulada/credito |
| motivo_anulacion | text | YES | — | |
| anulada_por | uuid | YES | — | FK → profiles |
| monto_devolucion | numeric | YES | — | |
| created_at | timestamptz | NO | now() | |

**Índices únicos:** `(numero_ticket, fecha)`, `(fecha, numero_ticket)`

---

### `venta_items`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| venta_id | uuid | NO | — | FK → ventas |
| producto_id | uuid | YES | — | FK → productos |
| nombre_producto | varchar | NO | — | Snapshot del nombre |
| precio_unitario | numeric | NO | — | |
| iva_unitario | numeric | NO | 0 | |
| cantidad | int4 | NO | — | |
| descuento_linea | numeric | NO | 0 | |
| subtotal_linea | numeric | NO | — | |
| es_fraccionado | boolean | NO | false | |
| cantidad_fraccion | numeric | YES | — | |
| descuento_habilitado | boolean | NO | false | |
| descuento_porcentaje | numeric | NO | 0 | |
| costo_unitario | numeric | YES | — | Snapshot del costo al momento de venta |

---

### `venta_pagos`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| venta_id | uuid | NO | — | FK → ventas |
| metodo | varchar | NO | — | efectivo/nequi/daviplata/tarjeta |
| monto | numeric | NO | — | |
| monto_recibido | numeric | YES | — | |
| vueltas | numeric | YES | — | |

---

### `venta_servicios`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| venta_id | uuid | NO | — | FK → ventas |
| servicio_id | uuid | YES | — | FK → servicios |
| nombre_servicio | varchar | NO | — | |
| precio_aplicado | numeric | NO | — | |

---

### `servicios`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre | varchar | NO | — | |
| descripcion | text | YES | — | |
| precio | numeric | NO | — | |
| activo | boolean | NO | true | |

---

### `ventas_credito`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| venta_id | uuid | NO | — | FK → ventas, UNIQUE |
| cliente_id | uuid | NO | — | FK → clientes |
| monto_original | numeric | NO | — | |
| saldo_pendiente | numeric | NO | — | |
| fecha_pago_programada | date | YES | — | |
| estado | varchar | NO | pendiente | pendiente/parcial/pagado |
| notas | text | YES | — | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

---

### `abonos_credito`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| venta_credito_id | uuid | NO | — | FK → ventas_credito |
| monto | numeric | NO | — | |
| fuentes | jsonb | NO | '[]' | Array de {fuente, monto} |
| observaciones | text | YES | — | |
| registrado_por | uuid | YES | — | FK → profiles |
| created_at | timestamptz | NO | now() | |

---

### `devoluciones`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| venta_id | uuid | NO | — | FK → ventas |
| tipo | varchar | NO | — | total/parcial/cambio |
| observacion | text | YES | — | |
| monto_devuelto | numeric | NO | 0 | |
| monto_cobrado | numeric | NO | 0 | |
| registrado_por | uuid | YES | — | FK → profiles |
| created_at | timestamptz | NO | now() | |

---

### `devolucion_items`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| devolucion_id | uuid | NO | — | FK → devoluciones |
| venta_item_id | uuid | YES | — | FK → venta_items |
| producto_id | uuid | YES | — | FK → productos |
| nombre_producto | varchar | NO | — | |
| cantidad | int4 | NO | — | |
| precio_unitario | numeric | NO | — | |
| subtotal_devuelto | numeric | NO | — | |

---

### `garantias`
Productos enviados a garantía al proveedor (no regresan al inventario hasta confirmar).

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| producto_id | uuid | YES | — | FK → productos |
| proveedor_id | uuid | YES | — | FK → proveedores |
| nombre_producto | text | NO | — | Snapshot |
| cantidad | int4 | NO | 1 | |
| observaciones | text | YES | — | |
| estado | text | NO | pendiente | pendiente/recibida |
| stock_destino | text | YES | almacen | almacen/bodega |
| devolucion_id | uuid | YES | — | FK → devoluciones |
| venta_id | uuid | YES | — | FK → ventas |
| fecha_registro | date | NO | hoy (Bogotá) | |
| fecha_recibida | date | YES | — | |
| registrado_por | uuid | YES | — | FK → profiles |
| created_at | timestamptz | YES | now() | |

---

### `movimientos_inventario`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| producto_id | uuid | NO | — | FK → productos |
| tipo | varchar | NO | — | entrada/venta/devolucion/ajuste/traslado |
| cantidad | int4 | NO | — | |
| stock_anterior | int4 | NO | — | |
| stock_nuevo | int4 | NO | — | |
| referencia_id | uuid | YES | — | |
| referencia_tipo | varchar | YES | — | |
| empleado_id | uuid | YES | — | FK → profiles |
| notas | text | YES | — | |
| created_at | timestamptz | NO | now() | |

---

### `facturas_proveedor`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| proveedor_id | uuid | NO | — | FK → proveedores |
| numero_factura | varchar | YES | — | |
| fecha_emision | date | NO | — | |
| fecha_vencimiento | date | YES | — | |
| monto_total | numeric | NO | — | |
| monto_pagado | numeric | NO | 0 | |
| saldo_pendiente | numeric | NO | — | |
| estado | varchar | NO | pendiente | pendiente/parcial/pagada |
| notas | text | YES | — | |

---

### `pagos_factura_proveedor`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| factura_id | uuid | NO | — | FK → facturas_proveedor |
| monto | numeric | NO | — | |
| metodo_pago | varchar | NO | — | |
| fecha_pago | date | NO | — | |
| registrado_por | uuid | YES | — | FK → profiles |
| observaciones | text | YES | — | |

---

### `pagos_programados_proveedor`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| factura_id | uuid | NO | — | FK → facturas_proveedor |
| monto | numeric | NO | — | |
| fecha_programada | date | NO | — | |
| nota | text | YES | — | |
| pagado | boolean | NO | false | |

---

### `gastos`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| fecha | date | NO | — | |
| concepto | varchar | NO | — | |
| categoria_gasto | varchar | YES | — | |
| monto | numeric | NO | — | |
| metodo_pago | varchar | NO | — | |
| proveedor_id | uuid | YES | — | FK → proveedores |
| notas | text | YES | — | |
| registrado_por | uuid | YES | — | FK → profiles |
| created_at | timestamptz | NO | now() | |

---

### `categorias_gasto`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre | varchar | NO | — | UNIQUE |
| activo | boolean | NO | true | |
| created_at | timestamptz | NO | now() | |

---

### `nominas`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| empleado_id | uuid | NO | — | FK → profiles |
| periodo_inicio | date | NO | — | |
| periodo_fin | date | NO | — | |
| salario_base | numeric | NO | — | |
| horas_trabajadas | numeric | YES | — | |
| bonificaciones | numeric | NO | 0 | |
| concepto_bonificacion | text | YES | — | |
| deducciones | numeric | NO | 0 | |
| concepto_deduccion | text | YES | — | |
| total_pago | numeric | NO | — | |
| fecha_pago | date | NO | — | |
| estado | varchar | NO | pagada | |
| notas | text | YES | — | |

---

### `horario_laboral`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| empleado_id | uuid | NO | — | FK → profiles |
| dia_semana | varchar | NO | — | lunes/martes/…/domingo |
| hora_inicio | time | NO | — | |
| hora_fin | time | NO | — | |
| activo | boolean | NO | true | |

---

### `retiros`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| fecha | date | NO | — | |
| monto | numeric | NO | — | |
| origen | varchar | NO | — | |
| observaciones | text | YES | — | |
| registrado_por | uuid | YES | — | FK → profiles |
| realizado_por | uuid | YES | — | FK → profiles |
| created_at | timestamptz | NO | now() | |

---

### `movimientos_caja`
| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| fecha | date | NO | — | |
| hora | time | NO | — | |
| tipo_movimiento | varchar | NO | — | ingreso/egreso/gasto/retiro/nomina/pago_proveedor/transferencia_caja_mayor |
| origen_destino | varchar | NO | — | efectivo/caja_menor/caja_mayor/nequi/daviplata/tarjeta/credito |
| monto | numeric | NO | — | |
| referencia_id | uuid | YES | — | |
| referencia_tipo | varchar | YES | — | venta/gasto/nomina/retiro/arqueo/factura_proveedor/abono_credito |
| empleado_id | uuid | YES | — | FK → profiles |
| observaciones | text | YES | — | |
| created_at | timestamptz | NO | now() | |

---

### `movimiento_fuentes`
Detalle de fuentes cuando un movimiento es mixto.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| movimiento_id | uuid | NO | — | FK → movimientos_caja |
| fuente | varchar | NO | — | efectivo/nequi/daviplata/tarjeta/caja_mayor |
| monto | numeric | NO | — | |

---

### `saldos_medios_pago`
Saldo acumulado por medio de pago (efectivo, nequi, daviplata, tarjeta, credito, caja_mayor).

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| medio | varchar | NO | — | UNIQUE |
| saldo_acumulado | numeric | NO | 0 | |
| updated_at | timestamptz | NO | now() | |

---

### `caja_mayor`
Registro único (singleton) del saldo de caja mayor.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| saldo_actual | numeric | NO | 0 | |
| updated_at | timestamptz | NO | CURRENT_TIMESTAMP | |

---

### `caja_menor`
Registro diario de apertura/cierre de caja menor.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| fecha | date | NO | — | UNIQUE |
| monto_base | numeric | NO | — | |
| ingresos_efectivo | numeric | NO | 0 | |
| egresos_efectivo | numeric | NO | 0 | |
| saldo_calculado | numeric | NO | — | |
| transferido_caja_mayor | numeric | NO | 0 | |
| saldo_real | numeric | YES | — | |
| diferencia | numeric | YES | — | |
| cerrada | boolean | NO | false | |
| registrado_por | uuid | YES | — | FK → profiles |
| notas | text | YES | — | |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP | |

---

### `arqueo_caja`
Cierre diario de caja con conteo físico.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| fecha | date | NO | — | UNIQUE |
| ingresos_efectivo | numeric | NO | 0 | |
| egresos_efectivo | numeric | NO | 0 | |
| saldo_sistema | numeric | NO | 0 | |
| total_contado_base | numeric | NO | 0 | Monto fijo de caja menor |
| total_contado_sobrante | numeric | NO | 0 | |
| diferencia | numeric | NO | 0 | |
| observacion_diferencia | text | YES | — | |
| transferido_caja_mayor | numeric | NO | 0 | |
| registrado_por | uuid | YES | — | FK → profiles |
| created_at | timestamptz | NO | now() | |

---

### `arqueo_detalle`
Detalle de billetes/monedas contados en el arqueo.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| arqueo_id | uuid | NO | — | FK → arqueo_caja |
| tipo | varchar | NO | — | base/sobrante |
| denominacion | int4 | NO | — | Valor del billete/moneda |
| es_moneda | boolean | NO | false | |
| cantidad | int4 | NO | 0 | |
| subtotal | numeric | NO | 0 | |

---

### `fondos_denominaciones`
Configuración de denominaciones para el arqueo.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tipo | varchar | NO | — | billete/moneda |
| denominacion | int4 | NO | — | |
| activo | boolean | NO | true | |

**Índice único:** `(tipo, denominacion)`

---

### `conteo_billetes`
Conteo de billetes asociado a caja_menor.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| caja_menor_id | uuid | NO | — | FK → caja_menor |
| denominacion | numeric | NO | — | |
| tipo | varchar | NO | — | billete/moneda |
| cantidad | int4 | NO | 0 | |
| subtotal | numeric | NO | — | |

---

### `configuracion_negocio`
Singleton (un solo registro).

| Columna | Tipo | Default | Notas |
|---|---|---|---|
| id | uuid | gen_random_uuid() | |
| nombre | varchar | 'Mi Negocio' | |
| nit | varchar | null | |
| direccion | text | null | |
| telefono | varchar | null | |
| email | varchar | null | |
| ciudad | varchar | null | |
| regimen | varchar | 'Régimen Simplificado' | |
| mensaje_pie | text | 'Gracias por su compra' | |
| logo_url | text | null | |
| monto_base_caja_menor | numeric | 300000 | Monto fijo de apertura |
| monto_inicial_monedas | numeric | 400000 | |
| monto_inicial_sencillo | numeric | 800000 | |
| max_descuento_porcentaje | numeric | 0.10 | 10% |
| whatsapp_negocio | varchar | null | |
| margen_default | numeric | 0.40 | 40% |
| updated_at | timestamptz | now() | |

---

## Relaciones

```
profiles ──────────────────────── ventas (empleado_id, anulada_por)
profiles ──────────────────────── nominas (empleado_id)
profiles ──────────────────────── horario_laboral (empleado_id)
profiles ──────────────────────── movimientos_caja (empleado_id)
profiles ──────────────────────── movimientos_inventario (empleado_id)
profiles ──────────────────────── devoluciones (registrado_por)
profiles ──────────────────────── abonos_credito (registrado_por)
profiles ──────────────────────── arqueo_caja (registrado_por)
profiles ──────────────────────── gastos (registrado_por)
profiles ──────────────────────── garantias (registrado_por)
profiles ──────────────────────── pagos_factura_proveedor (registrado_por)
profiles ──────────────────────── retiros (realizado_por)
profiles ──────────────────────── caja_menor (registrado_por)

clientes ──────────────────────── ventas (cliente_id)
clientes ──────────────────────── ventas_credito (cliente_id)

proveedores ───────────────────── producto_proveedores (proveedor_id)
proveedores ───────────────────── facturas_proveedor (proveedor_id)
proveedores ───────────────────── gastos (proveedor_id)
proveedores ───────────────────── garantias (proveedor_id)

categorias_producto ───────────── productos (categoria_id)

productos ─────────────────────── producto_proveedores (producto_id)
productos ─────────────────────── venta_items (producto_id)
productos ─────────────────────── movimientos_inventario (producto_id)
productos ─────────────────────── devolucion_items (producto_id)
productos ─────────────────────── garantias (producto_id)

ventas ────────────────────────── venta_items (venta_id)
ventas ────────────────────────── venta_pagos (venta_id)
ventas ────────────────────────── venta_servicios (venta_id)
ventas ────────────────────────── ventas_credito (venta_id)
ventas ────────────────────────── devoluciones (venta_id)
ventas ────────────────────────── garantias (venta_id)

ventas_credito ────────────────── abonos_credito (venta_credito_id)

devoluciones ──────────────────── devolucion_items (devolucion_id)
devoluciones ──────────────────── garantias (devolucion_id)

facturas_proveedor ────────────── pagos_factura_proveedor (factura_id)
facturas_proveedor ────────────── pagos_programados_proveedor (factura_id)

arqueo_caja ───────────────────── arqueo_detalle (arqueo_id)
caja_menor ────────────────────── conteo_billetes (caja_menor_id)
movimientos_caja ──────────────── movimiento_fuentes (movimiento_id)
servicios ─────────────────────── venta_servicios (servicio_id)
```

---

## RPCs

### Ventas
| Función | Descripción |
|---|---|
| `registrar_venta(p_cliente_id, p_tipo_pago, p_items, p_pagos, p_descuento_habilitado, p_descuento_tipo, p_descuento_total_porcentaje, p_factura_electronica, p_observaciones, p_servicios)` | Registra venta completa, descuenta stock, actualiza saldos |
| `registrar_venta_credito(...)` | Registra venta a crédito |
| `registrar_abono_credito(p_venta_credito_id, p_monto, p_fuentes, p_observaciones)` | Abona a crédito, actualiza saldo |
| `actualizar_fecha_pago_credito(...)` | Cambia fecha programada de pago |
| `anular_venta(p_venta_id, p_motivo)` | Anula venta, devuelve stock |
| `devolver_productos(p_venta_id, p_items_devolucion, p_observacion)` | Devolución parcial/total, reintegra stock |
| `cambiar_productos(p_venta_id, p_items_retirar, p_items_agregar, p_observacion)` | Cambio de productos |

### Inventario
| Función | Descripción |
|---|---|
| `buscar_productos(p_query)` | Búsqueda fuzzy con pg_trgm |
| `mover_stock_bodega_almacen(p_producto_id, p_cantidad, p_direccion)` | Traslado entre bodega y almacén |
| `calcular_rotacion_productos(...)` | KPIs de rotación por período |

### Clientes
| Función | Descripción |
|---|---|
| `buscar_clientes(p_query)` | Búsqueda fuzzy con pg_trgm |

### Caja y Finanzas
| Función | Descripción |
|---|---|
| `registrar_gasto_caja(p_concepto, p_categoria, p_monto, p_fuentes, p_proveedor_id, p_notas)` | Registra gasto con fuentes mixtas |
| `registrar_retiro(p_monto, p_observaciones, p_fuentes)` | Registra retiro de caja |
| `registrar_pago_factura(p_factura_id, p_monto, p_fuentes, p_fecha_pago, p_observaciones)` | Pago a proveedor |
| `registrar_nomina(p_empleado_id, p_fecha, p_horas_trabajadas, p_salario_base, p_bonificaciones, p_concepto_bonificacion, p_deducciones, p_concepto_deduccion, p_metodo_pago, p_notas)` | Registra nómina diaria |
| `cerrar_caja_arqueo(p_conteo_base, p_conteo_sobrante, p_observacion_diferencia)` | Cierre de caja con arqueo físico |
| `transferir_entre_fondos(p_origen, p_destino, p_monto, p_observaciones)` | Mueve dinero entre fondos |
| `abrir_caja(...)` | Apertura de caja menor |
| `actualizar_denominaciones(...)` | Actualiza configuración de denominaciones |
| `cerrar_caja(...)` | Versión legacy de cierre |

### Garantías
| Función | Descripción |
|---|---|
| `recibir_garantia(p_garantia_id, p_stock_destino)` | Confirma garantía recibida y reintegra stock |

### Utilidades
| Función | Descripción |
|---|---|
| `is_admin()` | Helper para políticas RLS |
| `fn_sync_stock_actual()` | Trigger: sincroniza stock_actual |
| `fn_actualizar_precio_costo_base()` | Trigger: actualiza precio_costo_base |
| `update_updated_at_column()` | Trigger: actualiza updated_at |

---

## Índices

| Tabla | Índice | Tipo | Columnas |
|---|---|---|---|
| productos | productos_nombre_trgm | GIN trgm | nombre |
| productos | productos_descripcion_trgm | GIN trgm | descripcion |
| productos | productos_marca_trgm | GIN trgm | marca |
| productos | productos_codigo_key | UNIQUE btree | codigo |
| ventas | idx_ventas_ticket_fecha | UNIQUE btree | numero_ticket, fecha |
| ventas | ventas_fecha_numero_ticket_key | UNIQUE btree | fecha, numero_ticket |
| arqueo_caja | arqueo_caja_fecha_key | UNIQUE btree | fecha |
| caja_menor | caja_menor_fecha_key | UNIQUE btree | fecha |
| ventas_credito | ventas_credito_venta_id_key | UNIQUE btree | venta_id |
| saldos_medios_pago | saldos_medios_pago_medio_key | UNIQUE btree | medio |
| categorias_producto | categorias_producto_nombre_key | UNIQUE btree | nombre |
| categorias_gasto | categorias_gasto_nombre_key | UNIQUE btree | nombre |
| producto_proveedores | producto_proveedores_producto_id_proveedor_id_key | UNIQUE btree | producto_id, proveedor_id |
| fondos_denominaciones | fondos_denominaciones_tipo_denominacion_key | UNIQUE btree | tipo, denominacion |
| configuracion_negocio | configuracion_negocio_singleton | UNIQUE btree | (true) |

---

## Políticas RLS

### Solo administradores
- `caja_mayor` — ALL
- `caja_menor` — SELECT, INSERT
- `movimientos_caja` — SELECT, INSERT
- `arqueo_caja` — SELECT, INSERT
- `arqueo_detalle` — SELECT, INSERT
- `gastos` — SELECT, INSERT
- `retiros` — SELECT, INSERT
- `facturas_proveedor` — SELECT, INSERT
- `pagos_factura_proveedor` — SELECT, INSERT
- `pagos_programados_proveedor` — SELECT, INSERT, UPDATE, DELETE
- `fondos_denominaciones` — SELECT, UPDATE
- `saldos_medios_pago` — ALL
- `conteo_billetes` — ALL
- `categorias_gasto` — UPDATE
- `proveedores` — UPDATE, INSERT

### Empleado + Administrador
- `ventas` — SELECT (propio o admin), INSERT, UPDATE (admin)
- `venta_items` — SELECT (ventas propias o admin), INSERT
- `nominas` — SELECT (propio o admin), INSERT

### Autenticados (cualquier usuario)
- `clientes` — SELECT, INSERT, UPDATE
- `productos` — SELECT (activos o admin), INSERT, UPDATE
- `producto_proveedores` — SELECT, INSERT, UPDATE, DELETE
- `categorias_producto` — SELECT, INSERT, UPDATE
- `servicios` — SELECT, INSERT, UPDATE
- `venta_pagos` — SELECT, INSERT
- `venta_servicios` — SELECT, INSERT
- `movimientos_inventario` — SELECT, INSERT
- `devoluciones` — SELECT, INSERT
- `devolucion_items` — SELECT, INSERT
- `ventas_credito` — SELECT, INSERT, UPDATE
- `abonos_credito` — SELECT, INSERT
- `movimiento_fuentes` — SELECT, INSERT
- `garantias` — ALL
- `categorias_gasto` — SELECT, INSERT
- `horario_laboral` — SELECT (todos), ALL (admin)
- `configuracion_negocio` — SELECT (todos), UPDATE (admin)
- `profiles` — SELECT (todos), UPDATE (propio + admin)

---

## Notas importantes

1. **Timezone**: Todas las RPCs usan `America/Bogota` para fechas y horas.
2. **Saldos medios de pago**: `efectivo` y `caja_menor` se normalizan a `efectivo` en `saldos_medios_pago`.
3. **Stock**: `stock_actual = stock_bodega + stock_almacen` (calculado por trigger automáticamente).
4. **Precio costo base**: Se actualiza automáticamente con el menor precio de `producto_proveedores`.
5. **Descuentos**: Máximo 10% por ítem y 10% global (configurable en `configuracion_negocio.max_descuento_porcentaje`).
6. **Ticket número**: Único por fecha, se reinicia cada día.
7. **Garantías**: Un producto en garantía NO regresa al inventario hasta confirmar `recibir_garantia()`.
8. **Arqueo**: Solo uno por día (`fecha` UNIQUE). Resetea saldo efectivo a 0 y transfiere sobrante a caja mayor.
