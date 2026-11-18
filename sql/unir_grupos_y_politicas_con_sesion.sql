-- 1) unir_grupos_medidas: une las medidas de un grupo dentro de otro en una sola transacción.
--    Antes la app hacía dos pasos (característica con mover_productos y marca con un update directo) y, si el segundo
--    fallaba, devolvía el primero a mano. Aquí la marca se cambia con un nombre temporal (no choca con nadie) y luego
--    mover_productos pone la característica y revisa los choques con la marca nueva. Si algo falla, no queda nada a medias.
--    Sirve también para deshacer (se llama con la característica y la marca del grupo de origen).
create or replace function public.unir_grupos_medidas(p_producto_ids uuid[], p_caracteristica text, p_marca text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_marca text := nullif(regexp_replace(trim(coalesce(p_marca, '')), '\s+', ' ', 'g'), '');
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para unir grupos';
  end if;
  if coalesce(array_length(p_producto_ids, 1), 0) = 0 then
    raise exception 'No hay medidas para unir';
  end if;
  if nullif(trim(coalesce(p_caracteristica, '')), '') is null then
    raise exception 'El grupo de destino no tiene característica';
  end if;
  if (select count(distinct familia_id) from productos where id = any(p_producto_ids)) > 1 then
    raise exception 'Solo se pueden unir medidas de una misma familia';
  end if;

  -- Paso 1: marca nueva con un nombre temporal; mover_productos (paso 2) revisa los choques con esa marca
  update productos set nombre = 'Mover tmp ' || id::text, marca = coalesce(v_marca, 'Generica')
   where id = any(p_producto_ids);

  -- Paso 2: característica y nombre definitivo (valida sesión, inactivos para empleados y el índice único)
  return public.mover_productos(p_producto_ids, null, null, p_caracteristica);
end;
$function$;

revoke execute on function public.unir_grupos_medidas(uuid[], text, text) from public, anon;
grant execute on function public.unir_grupos_medidas(uuid[], text, text) to authenticated, service_role;

-- 2) Políticas solo para usuarios con sesión.
--    88 políticas están "para public" (incluye anon). Todas exigen auth.uid() o is_admin(), así que anon ya no leía
--    nada; pasarlas a "authenticated" no cambia lo que ve nadie y permite quitarle a anon is_admin() y rls_auto_enable(),
--    que es lo que marca el advisor de seguridad. Si anon consulta una tabla, sigue recibiendo una lista vacía.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
            where schemaname = 'public' and roles = array['public']::name[] loop
    execute format('alter policy %I on %I.%I to authenticated', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
revoke execute on function public.rls_auto_enable() from public, anon;
