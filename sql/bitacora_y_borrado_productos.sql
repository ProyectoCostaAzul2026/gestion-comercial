-- Migración bitacora_y_borrado_productos (aplicada el 2026-11-13). Tablas y columnas verificadas contra la base.
--
-- 1. BITÁCORA: registro de los cambios importantes, que no se puede cambiar ni borrar desde el sistema.
--    - La escriben solo los triggers. La app no tiene permiso de INSERT, UPDATE ni DELETE; los administradores solo leen.
--    - Cada registro lleva un número consecutivo: un salto en la numeración delata un borrado.
--    - Si alguien borra o vacía la bitácora directamente en la base (por ejemplo para reiniciar el sistema de pruebas),
--      queda una fila en `bitacora_borrados` con cuántos registros se borraron, de qué fechas y con qué usuario de la
--      base. `bitacora_borrados` rechaza UPDATE, DELETE y TRUNCATE.
--    - Límite honesto: el dueño de la base (rol postgres) siempre puede quitar un trigger o borrar la tabla entera. Eso
--      no se puede impedir desde dentro de la misma base; lo que se logra es que no se pueda hacer desde la app ni por
--      descuido, y que el borrado normal deje rastro.
-- 2. BORRADO DE PRODUCTOS DESACTIVADOS: solo los que no tienen registros (ventas, devoluciones, garantías, recepciones ni
--    movimientos distintos de la carga inicial y los ajustes). A mano (administrador) o solos a los 3 meses de desactivados.

-- ─────────────────────────────────────────── 1. BITÁCORA ───────────────────────────────────────────

create table public.bitacora (
  numero          bigint generated always as identity primary key,
  ocurrido_en     timestamptz not null default now(),
  -- 'sistema': un usuario desde la app · 'base_de_datos': directo en la base, sin sesión de la app · 'automatico': tarea programada
  origen          text not null check (origen in ('sistema', 'base_de_datos', 'automatico')),
  usuario_id      uuid,
  usuario_nombre  text,
  rol_bd          text not null,
  accion          text not null check (accion in ('crear', 'cambiar', 'borrar', 'vaciar')),
  tabla           text not null,
  registro_id     text,
  resumen         text not null,
  detalle         jsonb
);
create index idx_bitacora_fecha on public.bitacora (ocurrido_en desc);
create index idx_bitacora_tabla on public.bitacora (tabla, numero desc);

create table public.bitacora_borrados (
  id              bigint generated always as identity primary key,
  ocurrido_en     timestamptz not null default now(),
  forma           text not null check (forma in ('borrado', 'vaciado')),
  registros       bigint not null,
  numero_desde    bigint,
  numero_hasta    bigint,
  fecha_desde     timestamptz,
  fecha_hasta     timestamptz,
  usuario_id      uuid,
  rol_bd          text not null
);

alter table public.bitacora enable row level security;
alter table public.bitacora_borrados enable row level security;
create policy bitacora_leer_admin on public.bitacora for select to authenticated using ((select public.is_admin()));
create policy bitacora_borrados_leer_admin on public.bitacora_borrados for select to authenticated using ((select public.is_admin()));
revoke all on public.bitacora, public.bitacora_borrados from public, anon, authenticated;
grant select on public.bitacora, public.bitacora_borrados to authenticated;

-- Quién hace el cambio y desde dónde
create or replace function public.fn_bitacora_escribir(
  p_accion text, p_tabla text, p_registro_id text, p_resumen text, p_detalle jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_nombre text;
  v_origen text;
begin
  if v_uid is not null then
    v_origen := 'sistema';
    select nombre_completo into v_nombre from public.profiles where id = v_uid;
  elsif current_setting('app.origen_bitacora', true) = 'automatico' then
    v_origen := 'automatico';
  else
    v_origen := 'base_de_datos';
  end if;
  insert into public.bitacora (origen, usuario_id, usuario_nombre, rol_bd, accion, tabla, registro_id, resumen, detalle)
  values (v_origen, v_uid, v_nombre, session_user, p_accion, p_tabla, p_registro_id, p_resumen, p_detalle);
end;
$$;
revoke execute on function public.fn_bitacora_escribir(text, text, text, text, jsonb) from public, anon, authenticated;

-- Cambio de una fila: registra solo las columnas vigiladas que cambiaron (argumento 1: lista separada por comas, o '*'
-- para todas menos updated_at). Argumento 2: columna que nombra el registro en el resumen.
create or replace function public.fn_bitacora_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_antes jsonb := to_jsonb(old);
  v_despues jsonb := to_jsonb(new);
  v_cambios jsonb := '{}'::jsonb;
  v_col text;
  v_nombre text := coalesce(v_despues ->> tg_argv[1], v_despues ->> 'id');
begin
  for v_col in
    select k from jsonb_object_keys(v_despues) k
    where k <> 'updated_at' and (tg_argv[0] = '*' or k = any (string_to_array(tg_argv[0], ',')))
  loop
    if (v_antes -> v_col) is distinct from (v_despues -> v_col) then
      v_cambios := v_cambios || jsonb_build_object(v_col, jsonb_build_object('antes', v_antes -> v_col, 'despues', v_despues -> v_col));
    end if;
  end loop;
  if v_cambios <> '{}'::jsonb then
    perform public.fn_bitacora_escribir('cambiar', tg_table_name, v_despues ->> 'id',
      format('Cambio en %s: %s (%s)', tg_table_name, coalesce(v_nombre, '—'),
             (select string_agg(k, ', ') from jsonb_object_keys(v_cambios) k)),
      v_cambios);
  end if;
  return new;
end;
$$;

-- Alta de una fila importante (devoluciones, retiros, arqueos, ajustes manuales de stock)
create or replace function public.fn_bitacora_alta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_bitacora_escribir('crear', tg_table_name, to_jsonb(new) ->> 'id',
    format('%s', tg_argv[0]), to_jsonb(new));
  return new;
end;
$$;

-- Borrado: una fila de bitácora por instrucción, con cuántas filas se borraron. Hasta 20 filas se guardan completas.
create or replace function public.fn_bitacora_borrado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cuantas bigint;
  v_filas jsonb;
begin
  select count(*) into v_cuantas from borradas;
  if v_cuantas = 0 then return null; end if;
  if v_cuantas <= 20 then
    select jsonb_agg(to_jsonb(b)) into v_filas from borradas b;
  else
    select jsonb_build_object('primeros_ids', jsonb_agg(x.id)) into v_filas
    from (select to_jsonb(b) ->> 'id' as id from borradas b limit 20) x;
  end if;
  perform public.fn_bitacora_escribir('borrar', tg_table_name, null,
    format('Se %s %s %s de %s', case when v_cuantas = 1 then 'borró' else 'borraron' end, v_cuantas,
           case when v_cuantas = 1 then 'registro' else 'registros' end, tg_table_name),
    jsonb_build_object('registros', v_cuantas, 'filas', v_filas));
  return null;
end;
$$;

create or replace function public.fn_bitacora_vaciado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_bitacora_escribir('vaciar', tg_table_name, null,
    format('Se vació por completo la tabla %s (TRUNCATE)', tg_table_name), null);
  return null;
end;
$$;

-- Borrados y vaciados de las tablas del negocio
do $$
declare t text;
begin
  foreach t in array array[
    'ventas', 'venta_items', 'venta_pagos', 'ventas_credito', 'abonos_credito', 'devoluciones',
    'productos', 'producto_familias', 'categorias_producto', 'movimientos_inventario', 'historial_precios',
    'clientes', 'proveedores', 'facturas_proveedor', 'pagos_factura_proveedor',
    'movimientos_caja', 'gastos', 'retiros', 'arqueo_caja', 'nominas',
    'recepciones', 'recepcion_items', 'garantias', 'profiles', 'permisos_empleado'
  ] loop
    execute format('create trigger trg_bitacora_borrado after delete on public.%I referencing old table as borradas for each statement execute function public.fn_bitacora_borrado()', t);
    execute format('create trigger trg_bitacora_vaciado after truncate on public.%I for each statement execute function public.fn_bitacora_vaciado()', t);
  end loop;
end $$;

-- Cambios importantes
create trigger trg_bitacora_cambio after update on public.productos
  for each row execute function public.fn_bitacora_cambio('precio_venta,precio_por_unidad_medida,activo,nombre,codigo,marca,unidad_medida', 'nombre');
create trigger trg_bitacora_cambio after update on public.profiles
  for each row execute function public.fn_bitacora_cambio('rol,activo,salario_base,nombre_completo', 'nombre_completo');
create trigger trg_bitacora_cambio after update on public.configuracion_negocio
  for each row execute function public.fn_bitacora_cambio('*', 'nombre');
create trigger trg_bitacora_cambio after update on public.ventas
  for each row execute function public.fn_bitacora_cambio('estado,total,cliente_id', 'numero_ticket');
create trigger trg_bitacora_cambio after update on public.ventas_credito
  for each row execute function public.fn_bitacora_cambio('estado,fecha_pago_programada', 'id');
create trigger trg_bitacora_cambio after update on public.clientes
  for each row execute function public.fn_bitacora_cambio('nombre,nit_cc,activo', 'nombre');
create trigger trg_bitacora_cambio after update on public.proveedores
  for each row execute function public.fn_bitacora_cambio('nombre,nit_ruc,activo', 'nombre');
create trigger trg_bitacora_cambio after update on public.facturas_proveedor
  for each row execute function public.fn_bitacora_cambio('monto_total,monto_pagado,saldo_pendiente,estado,fecha_vencimiento', 'numero_factura');

-- Altas importantes
create trigger trg_bitacora_alta after insert on public.devoluciones
  for each row execute function public.fn_bitacora_alta('Devolución, cambio o anulación de una venta');
create trigger trg_bitacora_alta after insert on public.retiros
  for each row execute function public.fn_bitacora_alta('Retiro de dinero');
create trigger trg_bitacora_alta after insert on public.gastos
  for each row execute function public.fn_bitacora_alta('Gasto');
create trigger trg_bitacora_alta after insert on public.pagos_factura_proveedor
  for each row execute function public.fn_bitacora_alta('Pago a proveedor');
create trigger trg_bitacora_alta after insert on public.arqueo_caja
  for each row execute function public.fn_bitacora_alta('Arqueo y cierre de caja');
create trigger trg_bitacora_alta after insert on public.movimientos_inventario
  for each row when (new.tipo = 'ajuste') execute function public.fn_bitacora_alta('Ajuste manual de stock');

-- Protección de la bitácora
create or replace function public.fn_bitacora_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'La bitácora no se puede modificar';
  end if;
  -- Borrar o vaciar: nunca con una sesión de la app (ni siquiera de un administrador)
  if (select auth.uid()) is not null then
    raise exception 'La bitácora no se puede borrar desde el sistema';
  end if;
  return null;
end;
$$;
create trigger trg_bitacora_no_cambiar before update on public.bitacora
  for each statement execute function public.fn_bitacora_proteger();
create trigger trg_bitacora_no_borrar_app before delete or truncate on public.bitacora
  for each statement execute function public.fn_bitacora_proteger();

-- Borrado directo en la base: se permite (reinicio del sistema de pruebas) pero deja rastro
create or replace function public.fn_bitacora_rastro_borrado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bitacora_borrados (forma, registros, numero_desde, numero_hasta, fecha_desde, fecha_hasta, usuario_id, rol_bd)
  select 'borrado', count(*), min(numero), max(numero), min(ocurrido_en), max(ocurrido_en), (select auth.uid()), session_user
  from borradas having count(*) > 0;
  return null;
end;
$$;
create trigger trg_bitacora_rastro_borrado after delete on public.bitacora
  referencing old table as borradas for each statement execute function public.fn_bitacora_rastro_borrado();

-- TRUNCATE no entrega las filas borradas: se cuentan antes de vaciar
create or replace function public.fn_bitacora_rastro_vaciado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bitacora_borrados (forma, registros, numero_desde, numero_hasta, fecha_desde, fecha_hasta, usuario_id, rol_bd)
  select 'vaciado', count(*), min(numero), max(numero), min(ocurrido_en), max(ocurrido_en), (select auth.uid()), session_user
  from public.bitacora;
  return null;
end;
$$;
create trigger trg_bitacora_rastro_vaciado before truncate on public.bitacora
  for each statement execute function public.fn_bitacora_rastro_vaciado();

-- El registro de borrados de la bitácora no se toca
create or replace function public.fn_bitacora_borrados_proteger() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'El registro de borrados de la bitácora no se puede modificar ni borrar';
end;
$$;
create trigger trg_bitacora_borrados_fila before update or delete on public.bitacora_borrados
  for each row execute function public.fn_bitacora_borrados_proteger();
create trigger trg_bitacora_borrados_vaciar before truncate on public.bitacora_borrados
  for each statement execute function public.fn_bitacora_borrados_proteger();

revoke execute on function public.fn_bitacora_cambio(), public.fn_bitacora_alta(), public.fn_bitacora_borrado(),
  public.fn_bitacora_vaciado(), public.fn_bitacora_proteger(), public.fn_bitacora_rastro_borrado(),
  public.fn_bitacora_rastro_vaciado(), public.fn_bitacora_borrados_proteger() from public, anon, authenticated;

-- ─────────────────────────────── 2. BORRADO DE PRODUCTOS DESACTIVADOS ───────────────────────────────

-- Desde cuándo está desactivado. Los que ya están inactivos empiezan a contar hoy: nada se borra antes de 3 meses.
alter table public.productos add column desactivado_en timestamptz;
update public.productos set desactivado_en = now() where not activo;

create or replace function public.fn_marcar_desactivado() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.desactivado_en := case when new.activo then null else now() end;
  elsif new.activo is distinct from old.activo then
    new.desactivado_en := case when new.activo then null else now() end;
  end if;
  return new;
end;
$$;
create trigger trg_marcar_desactivado before insert or update of activo on public.productos
  for each row execute function public.fn_marcar_desactivado();

-- Un producto "tiene registros" si aparece en una venta, una devolución o cambio, una garantía, una recepción de
-- mercancía, o tiene movimientos de inventario distintos de la carga inicial (tipo entrada, referencia carga_inicial)
-- y de los ajustes.
create or replace function public.producto_tiene_registros(p_producto_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.venta_items where producto_id = p_producto_id)
      or exists (select 1 from public.devolucion_items where producto_id = p_producto_id)
      or exists (select 1 from public.garantias where producto_id = p_producto_id)
      or exists (select 1 from public.recepcion_items where producto_id = p_producto_id)
      or exists (select 1 from public.movimientos_inventario
                 where producto_id = p_producto_id and tipo <> 'ajuste'
                   and coalesce(referencia_tipo, '') <> 'carga_inicial');
$$;

-- Borra un producto y lo que depende solo de él. Uso interno: las dos funciones de abajo validan antes.
create or replace function public.fn_borrar_producto(p_producto_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_familia uuid;
begin
  select familia_id into v_familia from public.productos where id = p_producto_id;
  delete from public.precios_cantidad where producto_id = p_producto_id;
  delete from public.historial_precios where producto_id = p_producto_id;
  delete from public.producto_proveedores where producto_id = p_producto_id;
  delete from public.movimientos_inventario where producto_id = p_producto_id;
  delete from public.productos where id = p_producto_id;
  -- Una familia sin productos no se deja (igual que mover_productos)
  if v_familia is not null and not exists (select 1 from public.productos where familia_id = v_familia) then
    delete from public.producto_familias where id = v_familia;
  end if;
end;
$$;

create or replace function public.eliminar_producto_desactivado(p_producto_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_prod public.productos%rowtype;
begin
  if not (select public.is_admin()) then
    raise exception 'Solo un administrador puede eliminar productos';
  end if;
  select * into v_prod from public.productos where id = p_producto_id for update;
  if not found then raise exception 'El producto ya no existe'; end if;
  if v_prod.activo then raise exception 'Primero desactiva el producto'; end if;
  if coalesce(v_prod.stock_actual, 0) <> 0 then
    raise exception '"%" todavía tiene stock (%). Ponlo en 0 antes de eliminarlo.', v_prod.nombre, v_prod.stock_actual;
  end if;
  if public.producto_tiene_registros(p_producto_id) then
    raise exception '"%" tiene ventas, devoluciones, garantías o recepciones: se conserva para no perder ese historial', v_prod.nombre;
  end if;
  perform public.fn_borrar_producto(p_producto_id);
end;
$$;

-- Tarea diaria: borra los desactivados hace más de 3 meses, sin registros y sin stock. Devuelve cuántos borró.
create or replace function public.purgar_productos_desactivados() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_borrados integer := 0;
begin
  perform set_config('app.origen_bitacora', 'automatico', true);
  for v_id in
    select id from public.productos
    where not activo
      and desactivado_en is not null
      and desactivado_en < now() - interval '3 months'
      and coalesce(stock_actual, 0) = 0
      and not public.producto_tiene_registros(id)
    for update skip locked
  loop
    perform public.fn_borrar_producto(v_id);
    v_borrados := v_borrados + 1;
  end loop;
  return v_borrados;
end;
$$;

revoke execute on function public.producto_tiene_registros(uuid), public.fn_borrar_producto(uuid),
  public.eliminar_producto_desactivado(uuid), public.purgar_productos_desactivados(), public.fn_marcar_desactivado()
  from public, anon, authenticated;
grant execute on function public.eliminar_producto_desactivado(uuid), public.producto_tiene_registros(uuid)
  to authenticated, service_role;

-- Todos los días a las 3:15 a. m. de Bogotá (8:15 UTC). Con el proyecto pausado no corre; lo hace al día siguiente
-- de reactivarse.
create extension if not exists pg_cron;
select cron.schedule('purgar-productos-desactivados', '15 8 * * *', $$select public.purgar_productos_desactivados()$$);
