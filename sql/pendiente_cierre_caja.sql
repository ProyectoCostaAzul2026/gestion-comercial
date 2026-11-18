-- Corrige el efectivo esperado del cierre de caja (cerrar_caja_arqueo).
--
-- Antes: ingresos = pagos en efectivo de las ventas de hoy no anuladas; egresos = todo egreso en efectivo de hoy.
--   Fallaba de dos formas: no contaba los abonos de crédito en efectivo (ni el cobro de diferencias en un cambio), y
--   una venta anulada se restaba dos veces (su pago ya no contaba y además se restaba la reversa).
-- Ahora: lo que debe haber sobre la base es el saldo del medio "efectivo" en saldos_medios_pago, que mueven todas las
--   RPC de dinero (ventas, abonos, devoluciones, cambios, anulaciones, gastos, retiros, nómina, pagos y traslados) y que
--   el propio cierre deja en 0. Así también cuenta el efectivo de días que no se cerraron.
--   ingresos_efectivo y egresos_efectivo quedan como el detalle del día, sacado de movimientos_caja; lo que venga de
--   días anteriores sin cierre se devuelve aparte como "arrastre".
create or replace function public.cerrar_caja_arqueo(
  p_conteo_base jsonb, p_conteo_sobrante jsonb, p_observacion_diferencia text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_rol text;
  v_total_base numeric := 0;
  v_total_sobrante numeric := 0;
  v_ingresos_efectivo numeric;
  v_egresos_efectivo numeric;
  v_saldo_sistema numeric;
  v_arrastre numeric;
  v_diferencia numeric;
  v_arqueo_id uuid;
  v_item jsonb;
  v_config record;
  v_fecha_hoy date;
begin
  v_fecha_hoy := (now() at time zone 'America/Bogota')::date;

  select rol into v_rol from profiles where id = v_admin_id;
  if v_rol is distinct from 'administrador' then raise exception 'Solo un administrador puede cerrar la caja'; end if;
  if exists (select 1 from arqueo_caja where fecha = v_fecha_hoy) then
    raise exception 'Ya existe un arqueo registrado para hoy';
  end if;

  select monto_base_caja_menor into v_config from configuracion_negocio limit 1;

  for v_item in select * from jsonb_array_elements(p_conteo_base) loop
    v_total_base := v_total_base + (v_item->>'subtotal')::numeric;
  end loop;

  if abs(v_total_base - coalesce(v_config.monto_base_caja_menor, 300000)) > 0 then
    raise exception 'El recuadro de caja base debe sumar exactamente $%. Total ingresado: $%',
      coalesce(v_config.monto_base_caja_menor, 300000), v_total_base;
  end if;

  for v_item in select * from jsonb_array_elements(p_conteo_sobrante) loop
    v_total_sobrante := v_total_sobrante + (v_item->>'subtotal')::numeric;
  end loop;

  -- Detalle del día: todo lo que entró y salió en efectivo (ventas, abonos, cambios, devoluciones, anulaciones, gastos...)
  select
    coalesce(sum(monto) filter (where tipo_movimiento = 'ingreso'), 0),
    coalesce(sum(monto) filter (where tipo_movimiento not in ('ingreso', 'transferencia_caja_mayor')), 0)
  into v_ingresos_efectivo, v_egresos_efectivo
  from movimientos_caja
  where fecha = v_fecha_hoy
    and origen_destino in ('efectivo', 'caja_menor');

  -- Lo que debe haber sobre la base: saldo del efectivo desde el último cierre
  select coalesce(saldo_acumulado, 0) into v_saldo_sistema from saldos_medios_pago where medio = 'efectivo';
  v_saldo_sistema := coalesce(v_saldo_sistema, 0);
  v_arrastre := v_saldo_sistema - (v_ingresos_efectivo - v_egresos_efectivo);
  v_diferencia := v_total_sobrante - v_saldo_sistema;

  if abs(v_diferencia) > 0 and (p_observacion_diferencia is null or trim(p_observacion_diferencia) = '') then
    raise exception 'Hay una diferencia de $%. Debes ingresar una observación para continuar.', v_diferencia;
  end if;

  insert into arqueo_caja (
    fecha, ingresos_efectivo, egresos_efectivo, saldo_sistema,
    total_contado_base, total_contado_sobrante, diferencia,
    observacion_diferencia, transferido_caja_mayor, registrado_por
  ) values (
    v_fecha_hoy, v_ingresos_efectivo, v_egresos_efectivo, v_saldo_sistema,
    v_total_base, v_total_sobrante, v_diferencia,
    p_observacion_diferencia, v_total_sobrante, v_admin_id
  ) returning id into v_arqueo_id;

  for v_item in select * from jsonb_array_elements(p_conteo_base) loop
    insert into arqueo_detalle (arqueo_id, tipo, denominacion, es_moneda, cantidad, subtotal)
    values (v_arqueo_id, 'base', (v_item->>'denominacion')::int4, coalesce((v_item->>'es_moneda')::boolean, false), (v_item->>'cantidad')::int4, (v_item->>'subtotal')::numeric);
  end loop;

  for v_item in select * from jsonb_array_elements(p_conteo_sobrante) loop
    insert into arqueo_detalle (arqueo_id, tipo, denominacion, es_moneda, cantidad, subtotal)
    values (v_arqueo_id, 'sobrante', (v_item->>'denominacion')::int4, coalesce((v_item->>'es_moneda')::boolean, false), (v_item->>'cantidad')::int4, (v_item->>'subtotal')::numeric);
  end loop;

  -- El efectivo vuelve a 0 siempre (aunque no haya sobrante), para que el próximo cierre parta de lo contado hoy
  update saldos_medios_pago set saldo_acumulado = 0, updated_at = now() where medio = 'efectivo';

  if v_total_sobrante > 0 then
    update caja_mayor set saldo_actual = saldo_actual + v_total_sobrante, updated_at = now();

    update saldos_medios_pago
    set saldo_acumulado = saldo_acumulado + v_total_sobrante, updated_at = now()
    where medio = 'caja_mayor';

    insert into movimientos_caja (fecha, hora, tipo_movimiento, origen_destino, monto, referencia_id, referencia_tipo, empleado_id, observaciones)
    values (v_fecha_hoy, (now() at time zone 'America/Bogota')::time,
      'transferencia_caja_mayor', 'caja_mayor', v_total_sobrante,
      v_arqueo_id, 'arqueo', v_admin_id, 'Cierre de caja — transferencia de sobrante a Caja Mayor');
  end if;

  return jsonb_build_object(
    'arqueo_id', v_arqueo_id,
    'ingresos_efectivo', v_ingresos_efectivo,
    'egresos_efectivo', v_egresos_efectivo,
    'arrastre', v_arrastre,
    'saldo_sistema', v_saldo_sistema,
    'total_sobrante', v_total_sobrante,
    'diferencia', v_diferencia,
    'transferido_caja_mayor', v_total_sobrante
  );
end;
$function$;
