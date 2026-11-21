-- Migración ventas_en_curso_y_bonos_ventas
-- 1) Ventas sin registrar que se guardan: ventas paralelas (hasta 3 por vendedor), borradores y ventas pasadas a otro
--    vendedor. Reglas: 15 minutos sin cambios -> borrador; el borrador dura 15 minutos y se elimina (queda en la
--    bitácora); una venta pasada que no se acepta en 15 minutos vuelve a quien la pasó.
-- 2) Bonos por topes de venta en configuracion_negocio (para todos y por venta), que la nómina sugiere.

create table public.ventas_en_curso (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.profiles(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  cliente_nombre text,
  lineas integer not null default 0,
  total numeric(14,2) not null default 0,
  estado text not null default 'abierta' check (estado in ('abierta', 'borrador', 'transferida')),
  transferida_por uuid references public.profiles(id) on delete set null,
  transferida_en timestamptz,
  nota text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  borrador_desde timestamptz
);
comment on table public.ventas_en_curso is 'Ventas sin registrar: paralelas, borradores y pasadas a otro vendedor. datos = estado de la pantalla de Nueva venta.';

create index idx_ventas_en_curso_vendedor on public.ventas_en_curso (vendedor_id);
create index idx_ventas_en_curso_transferida_por on public.ventas_en_curso (transferida_por);
create index idx_ventas_en_curso_estado on public.ventas_en_curso (estado, actualizado_en);

alter table public.ventas_en_curso enable row level security;

create policy "ventas_en_curso_ver" on public.ventas_en_curso for select to authenticated
  using (vendedor_id = (select auth.uid()) or transferida_por = (select auth.uid()) or (select is_admin()));
create policy "ventas_en_curso_crear" on public.ventas_en_curso for insert to authenticated
  with check (vendedor_id = (select auth.uid()) and estado = 'abierta');
create policy "ventas_en_curso_cambiar" on public.ventas_en_curso for update to authenticated
  using (vendedor_id = (select auth.uid()) and estado <> 'transferida')
  with check (vendedor_id = (select auth.uid()) and estado = 'abierta');
create policy "ventas_en_curso_borrar" on public.ventas_en_curso for delete to authenticated
  using (vendedor_id = (select auth.uid()) and estado <> 'transferida');

-- Máximo 3 ventas abiertas o en borrador por vendedor
create or replace function public.fn_limitar_ventas_en_curso()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from ventas_en_curso
      where vendedor_id = new.vendedor_id and estado in ('abierta', 'borrador') and id <> new.id) >= 3 then
    raise exception 'Ya tienes 3 ventas abiertas: registra o cancela una';
  end if;
  return new;
end $$;
create trigger trg_limitar_ventas_en_curso before insert on public.ventas_en_curso
  for each row execute function public.fn_limitar_ventas_en_curso();

-- Pasar una venta a otro vendedor (queda esperando que la acepte)
create or replace function public.transferir_venta_en_curso(p_id uuid, p_destino uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_yo uuid := auth.uid();
begin
  if v_yo is null then raise exception 'No autenticado'; end if;
  if p_destino = v_yo then raise exception 'No puedes pasarte la venta a ti mismo'; end if;
  if not exists (select 1 from profiles where id = p_destino and activo) then
    raise exception 'Ese vendedor no existe o está inactivo';
  end if;
  update ventas_en_curso
     set estado = 'transferida', transferida_por = v_yo, transferida_en = now(), vendedor_id = p_destino,
         nota = null, borrador_desde = null, actualizado_en = now()
   where id = p_id and vendedor_id = v_yo and estado <> 'transferida' and lineas > 0;
  if not found then raise exception 'No se encontró la venta, está vacía o no es tuya'; end if;
end $$;

-- Aceptar una venta pasada: queda como una de las ventas abiertas de quien la acepta
create or replace function public.aceptar_venta_en_curso(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_yo uuid := auth.uid();
begin
  if v_yo is null then raise exception 'No autenticado'; end if;
  if (select count(*) from ventas_en_curso where vendedor_id = v_yo and estado in ('abierta', 'borrador')) >= 3 then
    raise exception 'Ya tienes 3 ventas abiertas: registra o cancela una para aceptar esta';
  end if;
  update ventas_en_curso set estado = 'abierta', nota = null, actualizado_en = now()
   where id = p_id and vendedor_id = v_yo and estado = 'transferida';
  if not found then raise exception 'La venta ya no está esperando por ti'; end if;
end $$;

-- Rechazar una venta pasada: vuelve a quien la pasó, con una nota
create or replace function public.rechazar_venta_en_curso(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_yo uuid := auth.uid();
begin
  if v_yo is null then raise exception 'No autenticado'; end if;
  update ventas_en_curso
     set vendedor_id = transferida_por, estado = 'abierta', actualizado_en = now(),
         nota = 'Rechazada por ' || coalesce((select nombre_completo from profiles where id = v_yo), 'el otro vendedor')
   where id = p_id and vendedor_id = v_yo and estado = 'transferida' and transferida_por is not null;
  if not found then raise exception 'La venta ya no está esperando por ti'; end if;
end $$;

-- Tarea de cada minuto: devuelve transferencias vencidas, pasa a borrador y elimina borradores vencidos
create or replace function public.vencer_ventas_en_curso()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform set_config('app.origen_bitacora', 'automatico', true);

  update ventas_en_curso v
     set vendedor_id = v.transferida_por, estado = 'abierta', actualizado_en = now(),
         nota = 'No la aceptó a tiempo ' || coalesce((select nombre_completo from profiles where id = v.vendedor_id), 'el otro vendedor')
   where v.estado = 'transferida' and v.transferida_en < now() - interval '15 minutes' and v.transferida_por is not null;

  update ventas_en_curso set estado = 'borrador', borrador_desde = now()
   where estado = 'abierta' and actualizado_en < now() - interval '15 minutes';

  for r in
    delete from ventas_en_curso where estado = 'borrador' and borrador_desde < now() - interval '15 minutes'
    returning id, vendedor_id, cliente_nombre, lineas, total, datos
  loop
    perform fn_bitacora_escribir('borrar', 'ventas_en_curso', r.id::text,
      'Venta sin registrar eliminada tras 15 minutos en borrador: ' || coalesce(r.cliente_nombre, 'Mostrador')
        || ' · ' || r.lineas || ' líneas · $' || to_char(r.total, 'FM999G999G999'),
      jsonb_build_object('vendedor', (select nombre_completo from profiles where id = r.vendedor_id), 'venta', r.datos));
  end loop;
end $$;

revoke execute on function public.transferir_venta_en_curso(uuid, uuid) from public, anon;
revoke execute on function public.aceptar_venta_en_curso(uuid) from public, anon;
revoke execute on function public.rechazar_venta_en_curso(uuid) from public, anon;
grant execute on function public.transferir_venta_en_curso(uuid, uuid) to authenticated, service_role;
grant execute on function public.aceptar_venta_en_curso(uuid) to authenticated, service_role;
grant execute on function public.rechazar_venta_en_curso(uuid) to authenticated, service_role;
revoke execute on function public.vencer_ventas_en_curso() from public, anon, authenticated;
revoke execute on function public.fn_limitar_ventas_en_curso() from public, anon, authenticated;

select cron.schedule('vencer-ventas-en-curso', '* * * * *', 'select public.vencer_ventas_en_curso()');

-- 2) Bonos por topes de venta. equipo: ventas netas del día >= tope -> bono para cada empleado que se paga ese día
--    (el tope más alto alcanzado). individual: cada venta de un vendedor >= tope -> bono de ese tope para él.
--    Formato: {"equipo": [{"tope": 2000000, "bono": 5000}, ...], "individual": [{"tope": 500000, "bono": 2000}, ...]}
alter table public.configuracion_negocio
  add column bonos_ventas jsonb not null default '{"equipo": [], "individual": []}'::jsonb;
