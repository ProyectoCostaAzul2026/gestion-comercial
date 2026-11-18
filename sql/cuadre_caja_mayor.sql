-- Caja mayor con un solo saldo y traslados que dejan rastro de ambos lados.
--
-- Problema: la caja mayor tenía dos saldos. cerrar_caja_arqueo y transferir_entre_fondos sumaban en caja_mayor.saldo_actual,
-- pero los gastos, retiros, pagos a proveedores, nómina y abonos hechos "desde caja mayor" descontaban de
-- saldos_medios_pago (medio 'caja_mayor'), que no tenía fila: esos descuentos se perdían y la caja mayor no bajaba.
-- Además un traslado entre medios solo registraba el movimiento de llegada, así que no se podía reconstruir el saldo
-- del medio de salida a partir de movimientos_caja.
--
-- Arreglo:
--  1. saldos_medios_pago tiene la fila 'caja_mayor' y es el saldo de verdad (arranca con el de caja_mayor).
--  2. Un trigger copia ese saldo a caja_mayor.saldo_actual, que es lo que leen algunas pantallas.
--  3. transferir_entre_fondos ya no toca caja_mayor directo y deja también el movimiento de salida
--     (tipo transferencia_caja_mayor, referencia_tipo 'transferencia_salida'; los reportes ya excluyen ese tipo).
--  4. cerrar_caja_arqueo solo suma el sobrante en saldos_medios_pago (el trigger actualiza caja_mayor).
-- 5. registrar_retiro guardaba en retiros.registrado_por, una columna que no existía: todo retiro fallaba. Se agrega.

insert into public.saldos_medios_pago (medio, saldo_acumulado)
select 'caja_mayor', coalesce((select saldo_actual from public.caja_mayor limit 1), 0)
where not exists (select 1 from public.saldos_medios_pago where medio = 'caja_mayor');

create or replace function public.fn_sincronizar_caja_mayor()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.medio = 'caja_mayor' then
    update caja_mayor set saldo_actual = new.saldo_acumulado, updated_at = now();
  end if;
  return new;
end;
$function$;

revoke execute on function public.fn_sincronizar_caja_mayor() from public, anon, authenticated;

drop trigger if exists trg_sincronizar_caja_mayor on public.saldos_medios_pago;
create trigger trg_sincronizar_caja_mayor
  after insert or update of saldo_acumulado on public.saldos_medios_pago
  for each row execute function public.fn_sincronizar_caja_mayor();

update public.caja_mayor set saldo_actual = (select saldo_acumulado from public.saldos_medios_pago where medio = 'caja_mayor'), updated_at = now();

create or replace function public.transferir_entre_fondos(p_origen text, p_destino text, p_monto numeric, p_observaciones text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_rol text;
  v_saldo_origen numeric;
  v_origen_norm text;
  v_destino_norm text;
  v_obs text;
begin
  select rol into v_rol from profiles where id = v_admin_id;
  if v_rol is distinct from 'administrador' then raise exception 'Solo un administrador puede transferir fondos'; end if;
  if p_monto <= 0 then raise exception 'El monto debe ser mayor a 0'; end if;

  v_origen_norm := case when p_origen in ('efectivo', 'caja_menor') then 'efectivo' else p_origen end;
  v_destino_norm := case when p_destino in ('efectivo', 'caja_menor') then 'efectivo' else p_destino end;
  if v_origen_norm = v_destino_norm then raise exception 'El origen y destino no pueden ser iguales'; end if;

  select saldo_acumulado into v_saldo_origen from saldos_medios_pago where medio = v_origen_norm for update;
  if v_saldo_origen is null or v_saldo_origen < p_monto then
    raise exception 'Saldo insuficiente en %. Disponible: $%', p_origen, coalesce(v_saldo_origen, 0);
  end if;
  if not exists (select 1 from saldos_medios_pago where medio = v_destino_norm) then
    raise exception 'El medio de destino % no existe', p_destino;
  end if;

  update saldos_medios_pago set saldo_acumulado = saldo_acumulado - p_monto, updated_at = now() where medio = v_origen_norm;
  update saldos_medios_pago set saldo_acumulado = saldo_acumulado + p_monto, updated_at = now() where medio = v_destino_norm;

  v_obs := coalesce(nullif(trim(p_observaciones), ''), 'Transferencia de ' || p_origen || ' a ' || p_destino);
  -- Salida y llegada: así cada medio se puede cuadrar con sus movimientos
  insert into movimientos_caja (fecha, hora, tipo_movimiento, origen_destino, monto, referencia_tipo, empleado_id, observaciones)
  values
    ((now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::time,
     'transferencia_caja_mayor', v_origen_norm, p_monto, 'transferencia_salida', v_admin_id, v_obs),
    ((now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::time,
     'transferencia_caja_mayor', v_destino_norm, p_monto, 'transferencia', v_admin_id, v_obs);
end;
$function$;

-- cerrar_caja_arqueo: el sobrante entra solo por saldos_medios_pago (el trigger mantiene caja_mayor)
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.cerrar_caja_arqueo(jsonb, jsonb, text)'::regprocedure) into v_def;
  v_def := replace(v_def, 'update caja_mayor set saldo_actual = saldo_actual + v_total_sobrante, updated_at = now();', '');
  execute v_def;
end $$;

alter table public.retiros add column if not exists registrado_por uuid references public.profiles(id);
create index if not exists idx_retiros_registrado_por on public.retiros (registrado_por);
