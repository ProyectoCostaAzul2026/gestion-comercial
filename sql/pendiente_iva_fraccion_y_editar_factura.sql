-- PENDIENTE DE APLICAR (espera confirmación). Aplicar con apply_migration, nombre: iva_fraccion_y_editar_factura.
-- Después: get_advisors, DATABASE.md y database.types.ts.

-- ───────────── 1. IVA de las líneas vendidas por fracción ─────────────
-- registrar_venta y registrar_venta_credito guardaban iva_unitario = 0 en las líneas por fracción (metro, kilo) aunque
-- el producto tuviera IVA, y no lo sumaban a ventas.total_iva. El IVA es informativo: el contenido en el precio cobrado.
-- Se cambia solo esa línea de cada función, reemplazando el texto exacto de su definición actual; si el texto no está
-- (la función cambió), la migración se detiene sin tocar nada.
do $$
declare
  f text;
  v_def text;
  v_viejo constant text := 'values (v_venta_id, v_producto.id, v_producto.nombre, v_producto.precio_por_unidad_medida, 0, 1, 0, v_subtotal_linea, true, v_cantidad_fraccion, false, 0, v_costo_unitario);';
  v_iva constant text := '(case when v_producto.tiene_iva then v_producto.precio_por_unidad_medida - v_producto.precio_por_unidad_medida / (1 + v_producto.porcentaje_iva / 100) else 0 end)';
  v_nuevo text;
begin
  v_nuevo := 'values (v_venta_id, v_producto.id, v_producto.nombre, v_producto.precio_por_unidad_medida, ' || v_iva
    || ', 1, 0, v_subtotal_linea, true, v_cantidad_fraccion, false, 0, v_costo_unitario);' || E'\n'
    || '      -- IVA informativo de la línea por fracción: el contenido en el precio de cada metro o kilo vendido' || E'\n'
    || '      v_total_iva := v_total_iva + ' || v_iva || ' * v_cantidad_fraccion;';
  foreach f in array array['registrar_venta', 'registrar_venta_credito'] loop
    select pg_get_functiondef(p.oid) into strict v_def
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f;
    if position(v_viejo in v_def) = 0 then
      raise exception 'No se encontró la línea esperada en %: la función cambió, revisar a mano', f;
    end if;
    execute replace(v_def, v_viejo, v_nuevo);
  end loop;
end $$;

-- ───────────── 2. Editar una factura de proveedor ─────────────
-- facturas_proveedor no tiene política de UPDATE: el formulario decía "Factura actualizada" sin guardar nada, y además
-- habría puesto el saldo igual al total aunque la factura tuviera pagos. Esta función guarda la edición y recalcula el
-- saldo y el estado con lo ya pagado. Solo administrador.
create or replace function public.editar_factura_proveedor(
  p_factura_id uuid,
  p_numero_factura text,
  p_fecha_emision date,
  p_fecha_vencimiento date,
  p_monto_total numeric,
  p_notas text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_fac public.facturas_proveedor%rowtype;
  v_saldo numeric;
begin
  if not (select public.is_admin()) then
    raise exception 'Solo un administrador puede editar facturas de proveedor';
  end if;
  select * into v_fac from public.facturas_proveedor where id = p_factura_id for update;
  if not found then raise exception 'La factura ya no existe'; end if;
  if p_fecha_emision is null then raise exception 'Falta la fecha de emisión'; end if;
  if p_monto_total is null or p_monto_total <= 0 then raise exception 'El monto total debe ser mayor a 0'; end if;
  if p_monto_total < coalesce(v_fac.monto_pagado, 0) then
    raise exception 'El total no puede ser menor que lo ya pagado ($%)', trim(to_char(v_fac.monto_pagado, 'FM999G999G999G990'));
  end if;
  if p_fecha_vencimiento is not null and p_fecha_vencimiento < p_fecha_emision then
    raise exception 'El vencimiento no puede ser anterior a la emisión';
  end if;

  v_saldo := p_monto_total - coalesce(v_fac.monto_pagado, 0);
  update public.facturas_proveedor set
    numero_factura = nullif(trim(coalesce(p_numero_factura, '')), ''),
    fecha_emision = p_fecha_emision,
    fecha_vencimiento = p_fecha_vencimiento,
    monto_total = p_monto_total,
    saldo_pendiente = v_saldo,
    estado = case when v_saldo <= 0 then 'pagado' when coalesce(v_fac.monto_pagado, 0) > 0 then 'parcial' else 'pendiente' end,
    notas = nullif(trim(coalesce(p_notas, '')), '')
  where id = p_factura_id;
end;
$$;

revoke execute on function public.editar_factura_proveedor(uuid, text, date, date, numeric, text) from public, anon;
grant execute on function public.editar_factura_proveedor(uuid, text, date, date, numeric, text) to authenticated, service_role;
