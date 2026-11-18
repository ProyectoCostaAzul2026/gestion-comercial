-- Migración garantias_y_fraccion (aplicada el 2026-11-18).

-- ───────────── 1. Anular una venta con líneas por fracción ─────────────
-- anular_venta devolvía los metros o kilos al sobrante sin pasarlos a unidades enteras (el sobrante podía quedar con más
-- de lo que trae un rollo) y sin dejar movimiento. Ahora hace lo mismo que devolver_productos: lo que completa unidades
-- enteras vuelve al almacén, y deja el movimiento. Se reemplaza solo ese bloque; si el texto no está, no cambia nada.
do $$
declare
  v_def text;
  v_viejo constant text :=
    '    if v_item.es_fraccionado then' || E'\n' ||
    '      update productos' || E'\n' ||
    '      set remanente_fraccion = remanente_fraccion + v_item.cantidad_fraccion' || E'\n' ||
    '      where id = v_item.producto_id;' || E'\n' ||
    '    else';
  v_nuevo constant text :=
    '    if v_item.es_fraccionado then' || E'\n' ||
    '      -- Lo vendido por fracción vuelve al sobrante; lo que completa unidades enteras pasa al almacén' || E'\n' ||
    '      select stock_actual into v_stock_anterior from productos where id = v_item.producto_id for update;' || E'\n' ||
    '      update productos' || E'\n' ||
    '      set stock_almacen = stock_almacen + case when coalesce(cantidad_total_unidad, 0) > 0' || E'\n' ||
    '            then floor((remanente_fraccion + v_item.cantidad_fraccion) / cantidad_total_unidad)::int4 else 0 end,' || E'\n' ||
    '          remanente_fraccion = case when coalesce(cantidad_total_unidad, 0) > 0' || E'\n' ||
    '            then mod(remanente_fraccion + v_item.cantidad_fraccion, cantidad_total_unidad)' || E'\n' ||
    '            else remanente_fraccion + v_item.cantidad_fraccion end' || E'\n' ||
    '      where id = v_item.producto_id;' || E'\n' ||
    '      select stock_actual into v_stock_nuevo from productos where id = v_item.producto_id;' || E'\n' ||
    '      if v_stock_nuevo <> v_stock_anterior then' || E'\n' ||
    '        insert into movimientos_inventario (' || E'\n' ||
    '          producto_id, tipo, cantidad, stock_anterior, stock_nuevo,' || E'\n' ||
    '          referencia_id, referencia_tipo, empleado_id, notas' || E'\n' ||
    '        ) values (' || E'\n' ||
    '          v_item.producto_id, ''devolucion'', v_stock_nuevo - v_stock_anterior,' || E'\n' ||
    '          v_stock_anterior, v_stock_nuevo,' || E'\n' ||
    '          p_venta_id, ''venta'', v_admin_id,' || E'\n' ||
    '          ''Anulación de venta (fracción): '' || p_motivo' || E'\n' ||
    '        );' || E'\n' ||
    '      end if;' || E'\n' ||
    '    else';
begin
  select pg_get_functiondef(p.oid) into strict v_def
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'anular_venta';
  if position(v_viejo in v_def) = 0 then
    raise exception 'No se encontró el bloque esperado en anular_venta: la función cambió, revisar a mano';
  end if;
  execute replace(v_def, v_viejo, v_nuevo);
end $$;

-- ───────────── 2. Devolver una línea por fracción: dejar el movimiento ─────────────
-- devolver_productos ya pasa a unidades lo que completa un rollo, pero no dejaba movimiento de inventario.
do $$
declare
  v_def text;
  v_viejo constant text :=
    '      update productos set' || E'\n' ||
    '        remanente_fraccion = v_nuevo_remanente,' || E'\n' ||
    '        stock_almacen = stock_almacen + v_unidades' || E'\n' ||
    '      where id = v_vi.producto_id;';
  v_nuevo constant text := v_viejo || E'\n' ||
    '      if v_unidades > 0 then' || E'\n' ||
    '        insert into movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, empleado_id, notas)' || E'\n' ||
    '        select v_vi.producto_id, ''devolucion'', v_unidades,' || E'\n' ||
    '               stock_actual - v_unidades, stock_actual, p_venta_id, ''devolucion'', v_usuario_id,' || E'\n' ||
    '               ''Devolución por fracción: el sobrante completó '' || v_unidades || '' unidad(es)''' || E'\n' ||
    '        from productos where id = v_vi.producto_id;' || E'\n' ||
    '      end if;';
begin
  select pg_get_functiondef(p.oid) into strict v_def
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'devolver_productos';
  if position(v_viejo in v_def) = 0 then
    raise exception 'No se encontró el bloque esperado en devolver_productos: la función cambió, revisar a mano';
  end if;
  execute replace(v_def, v_viejo, v_nuevo);
end $$;

-- ───────────── 3. Enviar a garantía ─────────────
-- La devolución (o el cambio) regresa el producto al inventario; al marcarlo "enviar a garantía" solo se insertaba la
-- fila, sin sacarlo del stock, y al recibirlo del proveedor se sumaba otra vez: quedaba contado dos veces.
-- Esta función registra la garantía y saca las unidades del stock (salen hacia el proveedor); recibir_garantia las
-- vuelve a sumar cuando regresan. Administrador y empleado activos.
create or replace function public.registrar_garantia(
  p_producto_id uuid,
  p_proveedor_id uuid,
  p_cantidad integer,
  p_observaciones text default null,
  p_venta_id uuid default null,
  p_devolucion_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_prod public.productos%rowtype;
  v_de_almacen integer;
  v_de_bodega integer;
  v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and activo) then
    raise exception 'Tu sesión no es válida o tu usuario está inactivo';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'La cantidad en garantía debe ser mayor a 0'; end if;
  if p_proveedor_id is null or not exists (select 1 from public.proveedores where id = p_proveedor_id) then
    raise exception 'Elige el proveedor al que se envía la garantía';
  end if;
  select * into v_prod from public.productos where id = p_producto_id for update;
  if not found then raise exception 'El producto ya no existe'; end if;
  if v_prod.stock_actual < p_cantidad then
    raise exception 'No hay % unidad(es) de "%" en inventario para enviar a garantía (hay %)', p_cantidad, v_prod.nombre, v_prod.stock_actual;
  end if;

  -- Sale primero del almacén (ahí deja el producto la devolución) y el resto de bodega
  v_de_almacen := least(v_prod.stock_almacen, p_cantidad);
  v_de_bodega := p_cantidad - v_de_almacen;
  update public.productos
     set stock_almacen = stock_almacen - v_de_almacen, stock_bodega = stock_bodega - v_de_bodega
   where id = p_producto_id;

  insert into public.garantias (producto_id, proveedor_id, nombre_producto, cantidad, observaciones, venta_id, devolucion_id, registrado_por)
  values (p_producto_id, p_proveedor_id, v_prod.nombre, p_cantidad, nullif(trim(coalesce(p_observaciones, '')), ''), p_venta_id, p_devolucion_id, v_uid)
  returning id into v_id;

  insert into public.movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, empleado_id, notas)
  values (p_producto_id, 'ajuste', p_cantidad, v_prod.stock_actual, v_prod.stock_actual - p_cantidad, v_id, 'garantia', v_uid, 'Enviado a garantía al proveedor');

  return v_id;
end;
$$;

revoke execute on function public.registrar_garantia(uuid, uuid, integer, text, uuid, uuid) from public, anon;
grant execute on function public.registrar_garantia(uuid, uuid, integer, text, uuid, uuid) to authenticated, service_role;
