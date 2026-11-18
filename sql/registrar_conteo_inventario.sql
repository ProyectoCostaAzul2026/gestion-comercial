-- Migración registrar_conteo_inventario (aplicada el 2026-11-13). El movimiento de ajuste tiene la misma forma que el
-- de guardar_producto.
--
-- Conteo de inventario (Inventario › Conteo): recibe lo contado en almacén y bodega de varios productos y deja el
-- ajuste de stock con su movimiento, todo en una sola transacción. Reglas (las replica src/lib/conteo.ts):
--   - Solo cambia el lugar que trae cantidad (null = no se contó).
--   - Si el stock ya no es el que mostraba la pantalla (esperado_*), hubo una venta o una recepción mientras se
--     contaba: se rechaza todo el conteo y se nombra el producto, para no borrar ese movimiento.
--   - No aplica a productos que se venden por fracción.
--   - Administrador y empleado activos.

create or replace function public.registrar_conteo_inventario(p_conteos jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_fila record;
  v_prod public.productos%rowtype;
  v_ajustados integer := 0;
  v_nota text;
  v_bodega integer;
  v_almacen integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and activo) then
    raise exception 'Tu sesión no es válida o tu usuario está inactivo';
  end if;
  if p_conteos is null or jsonb_typeof(p_conteos) <> 'array' or jsonb_array_length(p_conteos) = 0 then
    raise exception 'No hay productos contados';
  end if;
  if jsonb_array_length(p_conteos) > 1000 then
    raise exception 'Guarda el conteo por partes: máximo 1000 productos a la vez';
  end if;

  for v_fila in
    select (x->>'producto_id')::uuid        as producto_id,
           (x->>'stock_almacen')::integer   as almacen,
           (x->>'stock_bodega')::integer    as bodega,
           (x->>'esperado_almacen')::integer as esperado_almacen,
           (x->>'esperado_bodega')::integer  as esperado_bodega,
           coalesce((x->>'por_peso')::boolean, false) as por_peso
    from jsonb_array_elements(p_conteos) x
    order by 1  -- mismo orden de bloqueo en conteos simultáneos
  loop
    select * into v_prod from public.productos where id = v_fila.producto_id and activo for update;
    if not found then
      raise exception 'Uno de los productos ya no existe o está desactivado. Actualiza la página.';
    end if;
    if v_prod.vender_por_fraccion then
      raise exception '"%" se vende por fracción: ajusta su stock en Editar producto', v_prod.nombre;
    end if;
    if coalesce(v_fila.almacen, 0) < 0 or coalesce(v_fila.bodega, 0) < 0 then
      raise exception 'La cantidad contada de "%" no puede ser negativa', v_prod.nombre;
    end if;
    if (v_fila.esperado_almacen is not null and v_fila.esperado_almacen <> v_prod.stock_almacen)
       or (v_fila.esperado_bodega is not null and v_fila.esperado_bodega <> v_prod.stock_bodega) then
      raise exception 'El stock de "% %" cambió mientras contabas (una venta o una recepción). Actualiza la página y cuéntalo de nuevo.',
        v_prod.nombre, coalesce(v_prod.unidad_medida, '');
    end if;

    v_nota := case when v_fila.por_peso then 'Conteo de inventario por peso' else 'Conteo de inventario' end;
    v_bodega := coalesce(v_fila.bodega, v_prod.stock_bodega);
    v_almacen := coalesce(v_fila.almacen, v_prod.stock_almacen);

    -- Misma forma que el ajuste de guardar_producto: cantidad en positivo y stock total (bodega + almacén) antes y después
    if v_bodega <> v_prod.stock_bodega then
      insert into public.movimientos_inventario
        (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, notas, empleado_id, referencia_tipo)
      values
        (v_prod.id, 'ajuste', abs(v_bodega - v_prod.stock_bodega),
         v_prod.stock_bodega + v_prod.stock_almacen, v_bodega + v_prod.stock_almacen,
         v_nota || ' (bodega)', v_uid, 'conteo_inventario');
    end if;
    if v_almacen <> v_prod.stock_almacen then
      insert into public.movimientos_inventario
        (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, notas, empleado_id, referencia_tipo)
      values
        (v_prod.id, 'ajuste', abs(v_almacen - v_prod.stock_almacen),
         v_bodega + v_prod.stock_almacen, v_bodega + v_almacen,
         v_nota || ' (almacén)', v_uid, 'conteo_inventario');
    end if;

    if v_bodega <> v_prod.stock_bodega or v_almacen <> v_prod.stock_almacen then
      -- stock_actual lo recalcula el trigger (bodega + almacén)
      update public.productos set stock_almacen = v_almacen, stock_bodega = v_bodega where id = v_prod.id;
      v_ajustados := v_ajustados + 1;
    end if;
  end loop;

  return v_ajustados;
end;
$$;

revoke execute on function public.registrar_conteo_inventario(jsonb) from public, anon;
grant execute on function public.registrar_conteo_inventario(jsonb) to authenticated, service_role;
