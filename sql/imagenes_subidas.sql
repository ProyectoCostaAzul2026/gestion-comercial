-- Migración imagenes_subidas (2026-11-19): imágenes subidas desde la app, con prioridad sobre el enlace.
--
-- 1. Bucket público `imagenes` en Supabase Storage. La app reduce la imagen en el navegador antes de subirla (WebP,
--    800 px los productos, 512 px los logos, 400 px las fotos de empleados), así que el bucket acepta como máximo 1 MB y
--    solo WebP, JPEG o PNG. Subir pide sesión; borrar archivos, ser administrador.
-- 2. Cada tabla con imagen guarda por aparte la foto subida y el enlace de otra web. La columna de siempre
--    (imagen_url, logo_url, foto_url) es la que lee toda la app y la llena el trigger: la foto subida si hay, si no el
--    enlace. Las funciones que ya escriben esa columna (guardar_producto, guardar_familia, editar_familia,
--    editar_grupo_medidas, crear_miembro_familia_renglon) siguen igual: el trigger reconoce si lo que llega es una foto
--    subida o un enlace.

-- 1. Bucket y permisos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "imagenes: subir con sesion" on storage.objects
  for insert to authenticated with check (bucket_id = 'imagenes');
create policy "imagenes: borrar solo administrador" on storage.objects
  for delete to authenticated using (bucket_id = 'imagenes' and (select public.is_admin()));

-- 2. Columnas: foto subida y enlace por aparte
alter table public.productos add column imagen_subida text, add column imagen_enlace text;
alter table public.categorias_producto add column imagen_subida text, add column imagen_enlace text;
alter table public.producto_familias add column imagen_subida text, add column imagen_enlace text;
alter table public.proveedores add column logo_subido text, add column logo_enlace text;
alter table public.configuracion_negocio add column logo_subido text, add column logo_enlace text;
alter table public.profiles add column foto_subida text, add column foto_enlace text;

comment on column public.productos.imagen_subida is 'Foto subida a Storage (bucket imagenes). Tiene prioridad sobre imagen_enlace.';
comment on column public.productos.imagen_enlace is 'Enlace a una imagen de otra web. Se muestra si no hay foto subida.';
comment on column public.productos.imagen_url is 'Imagen que se muestra: imagen_subida o, si no hay, imagen_enlace. La llena trg_sincronizar_imagen.';

-- Todo lo que hay hoy son enlaces de otras webs (todavía no existe ninguna foto subida). Se apaga un momento el trigger
-- de updated_at para que la fecha de última modificación de cada registro no cambie por esto.
alter table public.productos disable trigger update_productos_updated_at;
alter table public.proveedores disable trigger update_proveedores_updated_at;
alter table public.profiles disable trigger update_profiles_updated_at;
update public.productos set imagen_enlace = imagen_url where imagen_url is not null;
update public.categorias_producto set imagen_enlace = imagen_url where imagen_url is not null;
update public.producto_familias set imagen_enlace = imagen_url where imagen_url is not null;
update public.proveedores set logo_enlace = logo_url where logo_url is not null;
update public.configuracion_negocio set logo_enlace = logo_url where logo_url is not null;
update public.profiles set foto_enlace = foto_url where foto_url is not null;
alter table public.productos enable trigger update_productos_updated_at;
alter table public.proveedores enable trigger update_proveedores_updated_at;
alter table public.profiles enable trigger update_profiles_updated_at;

-- 3. Trigger: la imagen que se muestra es la subida o, si no hay, el enlace.
--    Argumentos: columna que se muestra, columna de la foto subida, columna del enlace.
--    Si alguien escribe directamente la columna que se muestra (las funciones de siempre), el valor se reparte:
--    una URL del bucket queda como foto subida (el enlace se conserva de respaldo), otro enlace reemplaza la foto subida,
--    y vacío quita las dos.
create or replace function public.sincronizar_imagen()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  c_url text := tg_argv[0];
  c_sub text := tg_argv[1];
  c_enl text := tg_argv[2];
  n jsonb := to_jsonb(new);
  v_url text := nullif(trim(n->>c_url), '');
  v_sub text := nullif(trim(n->>c_sub), '');
  v_enl text := nullif(trim(n->>c_enl), '');
  v_url_antes text;
begin
  if tg_op = 'INSERT' then
    if v_sub is null and v_enl is null and v_url is not null then
      if v_url like '%/storage/v1/object/public/imagenes/%' then v_sub := v_url; else v_enl := v_url; end if;
    end if;
  else
    v_url_antes := nullif(trim(to_jsonb(old)->>c_url), '');
    if v_url is distinct from v_url_antes then
      if v_url is null then
        v_sub := null;
        v_enl := null;
      elsif v_url like '%/storage/v1/object/public/imagenes/%' then
        v_sub := v_url;
      else
        v_sub := null;
        v_enl := v_url;
      end if;
    end if;
  end if;
  new := jsonb_populate_record(new, jsonb_build_object(c_url, coalesce(v_sub, v_enl), c_sub, v_sub, c_enl, v_enl));
  return new;
end;
$$;

revoke execute on function public.sincronizar_imagen() from public, anon;

create trigger trg_sincronizar_imagen before insert or update of imagen_url, imagen_subida, imagen_enlace
  on public.productos for each row execute function public.sincronizar_imagen('imagen_url', 'imagen_subida', 'imagen_enlace');
create trigger trg_sincronizar_imagen before insert or update of imagen_url, imagen_subida, imagen_enlace
  on public.categorias_producto for each row execute function public.sincronizar_imagen('imagen_url', 'imagen_subida', 'imagen_enlace');
create trigger trg_sincronizar_imagen before insert or update of imagen_url, imagen_subida, imagen_enlace
  on public.producto_familias for each row execute function public.sincronizar_imagen('imagen_url', 'imagen_subida', 'imagen_enlace');
create trigger trg_sincronizar_imagen before insert or update of logo_url, logo_subido, logo_enlace
  on public.proveedores for each row execute function public.sincronizar_imagen('logo_url', 'logo_subido', 'logo_enlace');
create trigger trg_sincronizar_imagen before insert or update of logo_url, logo_subido, logo_enlace
  on public.configuracion_negocio for each row execute function public.sincronizar_imagen('logo_url', 'logo_subido', 'logo_enlace');
create trigger trg_sincronizar_imagen before insert or update of foto_url, foto_subida, foto_enlace
  on public.profiles for each row execute function public.sincronizar_imagen('foto_url', 'foto_subida', 'foto_enlace');
