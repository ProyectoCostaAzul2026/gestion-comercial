-- registrar_venta guardaba los pagos tal como llegaban, sin comprobar que sumaran el total de la venta. La pantalla sí lo
-- valida, pero si algo fallara (o alguien llamara la RPC directo) los saldos de los medios quedarían descuadrados.
-- Ahora, antes de guardar los pagos: ningún monto negativo y la suma igual al total (con $1 de tolerancia).
do $$
declare
  v_def text;
  v_ancla constant text := 'for v_pago in select * from jsonb_array_elements(p_pagos) loop';
begin
  select pg_get_functiondef('public.registrar_venta(uuid,text,jsonb,jsonb,boolean,text,numeric,boolean,text,jsonb,numeric)'::regprocedure) into v_def;
  if position(v_ancla in v_def) = 0 then raise exception 'No se encontró el punto donde se guardan los pagos'; end if;
  if position('v_suma_pagos' in v_def) > 0 then return; end if;  -- ya aplicada
  v_def := replace(v_def, v_ancla,
'-- Los pagos deben sumar exactamente el total de la venta (la pantalla también lo valida)
  declare v_suma_pagos numeric;
  begin
    if exists (select 1 from jsonb_array_elements(p_pagos) p where coalesce((p->>''monto'')::numeric, 0) < 0) then
      raise exception ''Un pago no puede ser negativo'';
    end if;
    select coalesce(sum((p->>''monto'')::numeric), 0) into v_suma_pagos from jsonb_array_elements(p_pagos) p;
    if abs(v_suma_pagos - v_total_redondeado) > 1 then
      raise exception ''Los pagos ($%) no suman el total de la venta ($%). Revisa los montos e intenta de nuevo.'', round(v_suma_pagos)::bigint, round(v_total_redondeado)::bigint;
    end if;
  end;

  ' || v_ancla);
  execute v_def;
end $$;
