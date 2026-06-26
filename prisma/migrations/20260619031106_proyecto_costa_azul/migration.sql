-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "rol" VARCHAR(20) NOT NULL DEFAULT 'empleado',
    "telefono" VARCHAR(20),
    "salario_base" DECIMAL(12,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_producto" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "contacto" VARCHAR(150),
    "telefono" VARCHAR(30),
    "email" VARCHAR(150),
    "direccion" TEXT,
    "nit_ruc" VARCHAR(50),
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "codigo" VARCHAR(100),
    "categoria_id" UUID,
    "precio_venta" DECIMAL(12,2) NOT NULL,
    "precio_costo_base" DECIMAL(12,2),
    "margen_calculado" DECIMAL(5,2),
    "tiene_iva" BOOLEAN NOT NULL DEFAULT true,
    "iva_incluido" BOOLEAN NOT NULL DEFAULT false,
    "porcentaje_iva" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "prioridad" INTEGER NOT NULL DEFAULT 3,
    "unidad_medida" VARCHAR(30),
    "imagen_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_proveedores" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "precio_costo" DECIMAL(12,2) NOT NULL,
    "es_proveedor_principal" BOOLEAN NOT NULL DEFAULT false,
    "referencia_proveedor" VARCHAR(100),
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "telefono" VARCHAR(30),
    "email" VARCHAR(150),
    "nit_cc" VARCHAR(50),
    "direccion" TEXT,
    "notas" TEXT,
    "es_cliente_generico" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" UUID NOT NULL,
    "numero_ticket" INTEGER NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora" TIMETZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empleado_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "tipo_pago" VARCHAR(20) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento_global" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_descuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "factura_electronica" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'completada',
    "anulada_por" UUID,
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "nombre_producto" VARCHAR(200) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "iva_unitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "descuento_linea" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal_linea" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_anterior" INTEGER NOT NULL,
    "stock_nuevo" INTEGER NOT NULL,
    "referencia_id" UUID,
    "referencia_tipo" VARCHAR(50),
    "notas" TEXT,
    "empleado_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas_proveedor" (
    "id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "numero_factura" VARCHAR(100),
    "fecha_emision" DATE NOT NULL,
    "fecha_vencimiento" DATE,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "monto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_pendiente" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_factura_proveedor" (
    "id" UUID NOT NULL,
    "factura_id" UUID NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" VARCHAR(20) NOT NULL,
    "fecha_pago" DATE NOT NULL,
    "registrado_por" UUID,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_factura_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_menor" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "monto_base" DECIMAL(12,2) NOT NULL,
    "ingresos_efectivo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "egresos_efectivo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_calculado" DECIMAL(12,2) NOT NULL,
    "transferido_caja_mayor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_real" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "cerrada" BOOLEAN NOT NULL DEFAULT false,
    "registrado_por" UUID,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caja_menor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteo_billetes" (
    "id" UUID NOT NULL,
    "caja_menor_id" UUID NOT NULL,
    "denominacion" DECIMAL(10,2) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "conteo_billetes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_mayor" (
    "id" UUID NOT NULL,
    "saldo_actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caja_mayor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TIMETZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_movimiento" VARCHAR(30) NOT NULL,
    "origen_destino" VARCHAR(20) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "referencia_id" UUID,
    "referencia_tipo" VARCHAR(50),
    "empleado_id" UUID,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldos_medios_pago" (
    "id" UUID NOT NULL,
    "medio" VARCHAR(20) NOT NULL,
    "saldo_acumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saldos_medios_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" UUID NOT NULL,
    "concepto" VARCHAR(200) NOT NULL,
    "categoria_gasto" VARCHAR(100),
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" VARCHAR(20) NOT NULL,
    "fecha" DATE NOT NULL,
    "proveedor_id" UUID,
    "comprobante_url" TEXT,
    "notas" TEXT,
    "registrado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" UUID NOT NULL,
    "empleado_id" UUID NOT NULL,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fin" DATE NOT NULL,
    "salario_base" DECIMAL(12,2) NOT NULL,
    "horas_trabajadas" DECIMAL(6,2),
    "bonificaciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "concepto_bonificacion" TEXT,
    "deducciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "concepto_deduccion" TEXT,
    "total_pago" DECIMAL(12,2) NOT NULL,
    "fecha_pago" DATE,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horario_laboral" (
    "id" UUID NOT NULL,
    "empleado_id" UUID NOT NULL,
    "dia_semana" VARCHAR(20) NOT NULL,
    "hora_inicio" TIME(6) NOT NULL,
    "hora_fin" TIME(6) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horario_laboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retiros" (
    "id" UUID NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "origen" VARCHAR(20) NOT NULL,
    "fecha" DATE NOT NULL,
    "realizado_por" UUID NOT NULL,
    "observaciones" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retiros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_producto_nombre_key" ON "categorias_producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "producto_proveedores_producto_id_proveedor_id_key" ON "producto_proveedores"("producto_id", "proveedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_numero_ticket_fecha_key" ON "ventas"("numero_ticket", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "caja_menor_fecha_key" ON "caja_menor"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "saldos_medios_pago_medio_key" ON "saldos_medios_pago"("medio");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_proveedores" ADD CONSTRAINT "producto_proveedores_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_proveedores" ADD CONSTRAINT "producto_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_anulada_por_fkey" FOREIGN KEY ("anulada_por") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_proveedor" ADD CONSTRAINT "facturas_proveedor_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_factura_proveedor" ADD CONSTRAINT "pagos_factura_proveedor_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_factura_proveedor" ADD CONSTRAINT "pagos_factura_proveedor_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_menor" ADD CONSTRAINT "caja_menor_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteo_billetes" ADD CONSTRAINT "conteo_billetes_caja_menor_id_fkey" FOREIGN KEY ("caja_menor_id") REFERENCES "caja_menor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_laboral" ADD CONSTRAINT "horario_laboral_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros" ADD CONSTRAINT "retiros_realizado_por_fkey" FOREIGN KEY ("realizado_por") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
