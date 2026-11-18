-- PENDIENTE DE APLICAR (espera confirmación). Aplicar con apply_migration, nombre: hoja_de_tareas.
-- Después: get_advisors, DATABASE.md y database.types.ts.
--
-- Hoja de tareas: el administrador crea tareas (prioridad, fecha límite opcional, asignadas a un empleado o libres para
-- cualquiera). El empleado ve las suyas y las libres y las marca como hechas. No se repiten solas, pero el administrador
-- puede guardar plantillas para crearlas otra vez con un toque.

create table public.tareas_plantillas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (length(trim(titulo)) between 1 and 200),
  descripcion text check (descripcion is null or length(descripcion) <= 2000),
  prioridad   text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  asignado_a  uuid references public.profiles(id) on delete set null,
  veces_usada integer not null default 0,
  creado_por  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.tareas (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null check (length(trim(titulo)) between 1 and 200),
  descripcion  text check (descripcion is null or length(descripcion) <= 2000),
  prioridad    text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  -- null: libre, la puede hacer cualquier empleado
  asignado_a   uuid references public.profiles(id) on delete set null,
  fecha_limite date,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'hecha')),
  hecha_por    uuid references public.profiles(id) on delete set null,
  hecha_en     timestamptz,
  nota         text check (nota is null or length(nota) <= 500),
  plantilla_id uuid references public.tareas_plantillas(id) on delete set null,
  creado_por   uuid not null default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  check ((estado = 'hecha') = (hecha_en is not null))
);

create index idx_tareas_pendientes on public.tareas (estado, prioridad, fecha_limite);
create index idx_tareas_asignado_a on public.tareas (asignado_a);
create index idx_tareas_hecha_por on public.tareas (hecha_por);
create index idx_tareas_creado_por on public.tareas (creado_por);
create index idx_tareas_plantilla_id on public.tareas (plantilla_id);
create index idx_tareas_plantillas_asignado_a on public.tareas_plantillas (asignado_a);
create index idx_tareas_plantillas_creado_por on public.tareas_plantillas (creado_por);

alter table public.tareas enable row level security;
alter table public.tareas_plantillas enable row level security;

-- Tareas: el administrador ve y maneja todas; el empleado ve las suyas y las libres. Marcar hecha va por la función.
create policy tareas_leer on public.tareas for select to authenticated
  using ((select public.is_admin()) or asignado_a is null or asignado_a = (select auth.uid()));
create policy tareas_crear_admin on public.tareas for insert to authenticated with check ((select public.is_admin()));
create policy tareas_editar_admin on public.tareas for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tareas_borrar_admin on public.tareas for delete to authenticated using ((select public.is_admin()));

-- Plantillas: solo el administrador
create policy tareas_plantillas_admin on public.tareas_plantillas for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.tareas, public.tareas_plantillas from anon;

-- Marcar una tarea como hecha o volverla a pendiente. Cualquiera que pueda verla la marca; solo quien la marcó o un
-- administrador la devuelve a pendiente.
create or replace function public.marcar_tarea(p_tarea_id uuid, p_hecha boolean, p_nota text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean;
  v_tarea public.tareas%rowtype;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and activo) then
    raise exception 'Tu sesión no es válida o tu usuario está inactivo';
  end if;
  v_admin := (select public.is_admin());
  select * into v_tarea from public.tareas where id = p_tarea_id for update;
  if not found then raise exception 'La tarea ya no existe'; end if;
  if not v_admin and v_tarea.asignado_a is not null and v_tarea.asignado_a <> v_uid then
    raise exception 'Esta tarea está asignada a otra persona';
  end if;

  if p_hecha then
    if v_tarea.estado = 'hecha' then raise exception 'Esta tarea ya la marcó otra persona como hecha'; end if;
    update public.tareas
       set estado = 'hecha', hecha_por = v_uid, hecha_en = now(), nota = nullif(trim(coalesce(p_nota, '')), '')
     where id = p_tarea_id;
  else
    if v_tarea.estado = 'pendiente' then return; end if;
    if not v_admin and v_tarea.hecha_por is distinct from v_uid then
      raise exception 'Solo quien la marcó o un administrador puede volverla a pendiente';
    end if;
    update public.tareas set estado = 'pendiente', hecha_por = null, hecha_en = null, nota = null where id = p_tarea_id;
  end if;
end;
$$;

revoke execute on function public.marcar_tarea(uuid, boolean, text) from public, anon;
grant execute on function public.marcar_tarea(uuid, boolean, text) to authenticated, service_role;

-- Borrar tareas o plantillas queda en la bitácora, como el resto de tablas del negocio
create trigger trg_bitacora_borrado after delete on public.tareas
  referencing old table as borradas for each statement execute function public.fn_bitacora_borrado();
