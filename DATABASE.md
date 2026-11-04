# DATABASE.md — Ferreléctricos Costa Azul
> Documentación de la base de datos en Supabase (PostgreSQL)
> Proyecto: `qmeegynucijohagywdcr`
> Última actualización: 2026-11-04

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
| precio_venta | numeric | NO | — | Precio final al público: ya trae el IVA |
| precio_costo_base | numeric | YES | — | Calculado por trigger desde producto_proveedores |
| margen_calculado | numeric | YES | — | |
| tiene_iva | boolean | NO | true | |
| iva_incluido | boolean | NO | false | Se refiere al **costo** del proveedor; no cambia el precio de venta ni el IVA de la venta |
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
| familia_id | uuid | YES | — | FK → producto_familias |
| caracteristica | text | YES | — | Característica dentro de la familia (ej: "PVC Presion") |
| created_at / updated_at | timestamptz | NO | now() | |

**Convención de nombres:** `nombre = "<producto_familias.nombre_base> - <caracteristica>"` (guion corto con un espacio a
cada lado) y `unidad_medida = "<medida> <Unidad>"` (la unidad es la última palabra y existe en `unidades_medida`).

**Índice único parcial:** `idx_productos_unicos_nombre_marca_medida` — no puede haber dos productos **activos** con el mismo
`lower(trim(nombre))` + marca + unidad_medida.

**Triggers:**
- `fn_sync_stock_actual` — actualiza `stock_actual = stock_bodega + stock_almacen`
- `fn_actualizar_precio_costo_base` — actualiza `precio_costo_base` con el costo del proveedor marcado `es_costo_base_manual` o, si no hay, el menor de `producto_proveedores`

---

### `producto_familias`
Agrupa las variantes de un mismo producto (Característica + Medida + Marca).

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre_base | text | NO | — |
| created_at | timestamptz | NO | now() |

---

### `unidades_medida`
Catálogo de unidades que se ofrecen al crear productos y familias (se administra desde Configuración).

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| nombre | varchar | NO | — | UNIQUE |
| orden | int4 | NO | 0 |
| activo | boolean | NO | true |
| created_at | timestamptz | NO | now() |

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
| es_costo_base_manual | boolean | NO | false | Si está marcado, su costo es el costo base del producto |
| created_at | timestamptz | NO | now() | |

**Índices únicos:** `(producto_id, proveedor_id)` y `idx_un_costo_base_manual_por_producto` (solo un costo base manual por producto)

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
| descuento_tipo | varchar | YES | — | por_producto/total/manual |
| descuento_total_porcentaje | numeric | NO | 0 | |
| total_descuentos | numeric | NO | 0 | Descuentos por producto + global (porcentaje o total editado a mano) |
| total_iva | numeric | NO | 0 | Informativo: IVA contenido en los productos vendidos; no se suma al total |
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
| iva_unitario | numeric | NO | 0 | Informativo: IVA contenido en `precio_unitario` (0 en líneas fraccionadas) |
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
| tipo | varchar | NO | — | total/parcial/cambio (`anular_venta` también registra una `total`) |
| observacion | text | YES | — | |
| monto_devuelto | numeric | NO | 0 | Dinero devuelto al cliente (en un cambio, la diferencia a su favor) |
| monto_cobrado | numeric | NO | 0 | Diferencia cobrada al cliente en un cambio |
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
| cantidad | int4 | NO | — | Unidades devueltas (1 en las líneas fraccionadas) |
| cantidad_fraccion | numeric | YES | — | Fracción devuelta de una línea fraccionada, en su medida de venta (null en las demás) |
| precio_unitario | numeric | NO | — | `venta_items.precio_unitario` de la línea |
| subtotal_devuelto | numeric | NO | — | Parte del total pagado que corresponde a lo devuelto (antes de redondear la devolución) |

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
| monto_total | numeric(12,2) | NO | — | |
| monto_pagado | numeric(12,2) | NO | 0 | |
| saldo_pendiente | numeric(12,2) | NO | — | |
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
| `registrar_venta(p_cliente_id, p_tipo_pago, p_items, p_pagos, p_descuento_habilitado, p_descuento_tipo, p_descuento_total_porcentaje, p_factura_electronica, p_observaciones, p_servicios, p_total_manual?)` | Registra venta completa, descuenta stock, actualiza saldos. `p_total_manual`: total editado a mano (ver Descuentos en Notas importantes) |
| `registrar_venta_credito(p_cliente_id, p_items, p_servicios?, p_descuento_habilitado?, p_descuento_tipo?, p_descuento_total_porcentaje?, p_fecha_pago_programada?, p_observaciones?, p_factura_electronica?, p_total_manual?)` | Registra venta a crédito; la deuda (`ventas_credito.saldo_pendiente`) es el total de la venta. Valida descuentos y fracciones igual que `registrar_venta` |
| `registrar_abono_credito(p_venta_credito_id, p_monto, p_fuentes, p_observaciones)` | Abona a crédito, actualiza saldo |
| `actualizar_fecha_pago_credito(...)` | Cambia fecha programada de pago |
| `anular_venta(p_venta_id, p_motivo, p_medio_devolucion?)` | Solo administrador. Anula una venta sin devoluciones ni cambios: reintegra el stock y revierte cada pago por su medio (o todo el total por `p_medio_devolucion`) |
| `devolver_productos(p_venta_id, p_items_devolucion, p_observacion, p_medio_devolucion?)` | Solo administrador. Devolución parcial o total: reintegra stock y devuelve la parte pagada por el medio elegido. `p_items_devolucion`: `[{ venta_item_id, cantidad }]` o, en fraccionados, `[{ venta_item_id, cantidad_fraccion }]` |
| `cambiar_productos(p_venta_id, p_items_retirar, p_items_agregar, p_observacion, p_medio_pago?)` | Solo administrador. Cambia unidades de líneas por unidades (no fraccionadas) por productos nuevos y cobra o devuelve la diferencia. Devuelve `{ devolucion_id, diferencia, cobrar_al_cliente, devolver_al_cliente, total_nuevo, medio }` |

> **IVA informativo:** `registrar_venta`, `registrar_venta_credito` y `cambiar_productos` guardan en
> `venta_items.iva_unitario` el IVA contenido en el precio de venta, `precio_venta − precio_venta / (1 + porcentaje_iva / 100)`
> ($11.900 al 19 % → $1.900), sin importar `iva_incluido`. `ventas.total_iva` suma `iva_unitario × cantidad` de los ítems no
> fraccionados (`cambiar_productos` lo recalcula). Se calcula sobre el precio antes de descuentos, no cuenta ventas
> fraccionadas ni servicios y nunca se suma al total. El formulario de venta usa la misma fórmula (`calcularIvaUnitario`).

> **Anulaciones, devoluciones y cambios** (migración `unificar_rpc_anular_devolver_cambiar`, 2026-11-04):
> - Cada RPC tiene una sola versión; antes había dos y PostgREST respondía 300 `PGRST203`.
> - **Medio:** si no se elige, el de la venta cuando se pagó con uno solo; si fue mixta o a crédito, `efectivo`. Solo se
>   aceptan `efectivo`, `nequi`, `daviplata` y `tarjeta` (`caja_menor` cuenta como `efectivo`).
> - **Devolución:** devuelve la parte del total pagado que corresponde a lo devuelto, redondeada hacia abajo a la centena:
>   `subtotal_linea × total × cantidad / (base × cantidad_línea)`, con `base` = suma de `subtotal_linea` + servicios. No se
>   puede devolver más de lo que queda (se descuenta lo ya devuelto en `devolucion_items`). La venta queda `anulada` (tipo
>   `total`) solo cuando no queda nada por devolver y no tiene servicios; si no, `modificada` (o sigue `credito`).
> - **Cambio:** retirar parte de una línea la reduce (el descuento de línea se reparte por unidad); solo se borra si sale
>   completa. Los productos nuevos entran a precio de venta, sin descuento de línea, y guardan `costo_unitario`. El valor
>   calculado de la venta es líneas + servicios − descuento global, redondeado a la centena; se cobra o devuelve lo que
>   cambia ese valor y `total` se ajusta en esa cantidad, así que un total editado a mano conserva su descuento.
> - **Anulación:** se rechaza si la venta ya tiene devoluciones o cambios (devolvería otra vez lo ya devuelto); en ese
>   caso se devuelve lo que queda.
> - La vista previa de `venta-acciones.tsx` usa las mismas fórmulas (`src/lib/ajustes-venta.ts`): si se cambia una, hay
>   que cambiar la otra.

### Inventario
| Función | Descripción |
|---|---|
| `buscar_productos(p_query)` | Búsqueda fuzzy con pg_trgm |
| `mover_stock_bodega_almacen(p_producto_id, p_cantidad, p_direccion)` | Traslado entre bodega y almacén |
| `calcular_rotacion_productos(...)` | KPIs de rotación por período |
| `guardar_producto(p_datos, p_proveedores, p_producto_id?, p_activar?, p_proveedores_eliminados?, p_empleado_id?)` | Crea o edita un producto con sus proveedores (y el movimiento de stock inicial al crear) en una sola transacción. `SECURITY INVOKER`: aplica RLS del usuario |
| `guardar_familia(p_nombre_base, p_base, p_operaciones, p_familia_id?, p_desactivar?)` | Guarda el árbol de una familia (actualizar / asignar padre / insertar miembros, desactivar los que salen) en una sola transacción. `SECURITY INVOKER` |

> **Permisos de las RPC:** ninguna función de negocio se puede ejecutar sin sesión (se revocó `EXECUTE` a `public` y `anon`).
> Al crear una RPC nueva: `revoke execute on function ... from public, anon;` y `grant execute ... to authenticated, service_role;`.
> `is_admin()` sí queda ejecutable por todos porque las políticas RLS la evalúan.

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
| `proteger_campos_sensibles_profiles()` | Trigger en `profiles`: solo un admin cambia `rol`, `salario_base` o `activo` |

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
| productos | idx_productos_unicos_nombre_marca_medida | UNIQUE btree parcial (activo) | lower(trim(nombre)), marca, unidad_medida |
| productos | idx_productos_familia_id | btree parcial | familia_id |
| producto_proveedores | idx_un_costo_base_manual_por_producto | UNIQUE btree parcial | producto_id |
| (40 tablas) | idx_&lt;tabla&gt;_&lt;columna&gt; | btree | Una por cada clave foránea (agregados el 2026-10-29) |

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

> Desde 2026-10-29 **ninguna tabla se puede leer sin sesión**. Las políticas usan `(select auth.uid())` y
> `(select is_admin())` para que se evalúen una vez por consulta y no por fila.

### Autenticados (cualquier usuario con sesión)
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
- `profiles` — SELECT (con sesión), UPDATE (propio + admin), INSERT/DELETE (admin). El trigger
  `trg_proteger_campos_sensibles_profiles` impide que alguien que no es admin cambie `rol`, `salario_base` o `activo`.
- `producto_familias` — SELECT, INSERT, UPDATE (rol authenticated)
- `unidades_medida` — SELECT (con sesión), INSERT/UPDATE (admin)

---

## Notas importantes

1. **Timezone**: Todas las RPCs usan `America/Bogota` para fechas y horas.
2. **Saldos medios de pago**: `efectivo` y `caja_menor` se normalizan a `efectivo` en `saldos_medios_pago`.
3. **Stock**: `stock_actual = stock_bodega + stock_almacen` (calculado por trigger automáticamente).
4. **Precio costo base**: Se actualiza automáticamente con el costo del proveedor marcado `es_costo_base_manual` o, si
   no hay, con el menor precio de `producto_proveedores`.
5. **Descuentos**: máximo 10% por ítem y 10% global. El descuento acumulado (ítems + global) sobre el valor bruto no
   puede superar `configuracion_negocio.max_descuento_porcentaje` (0.10); lo validan el formulario y `registrar_venta` /
   `registrar_venta_credito`. Si se edita el total a mano, el formulario lo envía en `p_total_manual`: debe ser mayor que
   cero y no superar el total calculado (redondeado a la centena), y la diferencia se suma a `total_descuentos`.
6. **Ticket número**: Único por fecha, se reinicia cada día.
7. **Garantías**: Un producto en garantía NO regresa al inventario hasta confirmar `recibir_garantia()`.
8. **Arqueo**: Solo uno por día (`fecha` UNIQUE). Resetea saldo efectivo a 0 y transfiere sobrante a caja mayor.
9. **Respaldo**: el esquema privado `respaldo` (no expuesto por la API) guarda copias tomadas antes de cada carga del
   catálogo. `*_20261029`: `productos`, `producto_proveedores`, `producto_familias`, `unidades_medida` y
   `movimientos_inventario`. `*_20261031` (antes de cargar el catálogo desde facturas): `productos`,
   `producto_proveedores`, `producto_familias`, `movimientos_inventario`, `proveedores`, `ventas`, `venta_items`,
   `venta_pagos`, `venta_servicios`, `movimientos_caja`, `saldos_medios_pago` y `configuracion_negocio`. Se pueden
   borrar cuando el catálogo nuevo esté validado.
10. **Facturas históricas**: las 233 facturas cargadas el 2026-10-31 desde los PDF de proveedores no tienen filas en
    `pagos_factura_proveedor` ni movimientos de caja; las vencidas se registraron directamente como `pagada`.
