-- UnifilarPro Medida · tabla de diagramas con seguridad por usuario (Row Level Security).
-- Se corre una sola vez en Supabase: SQL Editor › New query › pegar todo › Run.
-- Se puede volver a correr sin dañar nada.

-- 1) Correos con acceso. Solo quien esté aquí puede guardar o ver diagramas.
--    Para dar acceso a otra persona: insert into public.allowed_users (email) values ('correo@ejemplo.com');
--    Para quitarlo:                   delete from public.allowed_users where email = 'correo@ejemplo.com';
create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.allowed_users enable row level security;
-- Sin políticas y sin permisos: desde la app nadie la puede leer ni cambiar; solo desde el panel de Supabase.
revoke all on table public.allowed_users from anon, authenticated;

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed() from public;
grant execute on function public.is_allowed() to authenticated;

-- 2) Diagramas: uno por fila; `data` es el diagrama completo (igual al de la app).
create table if not exists public.diagrams (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb,                                   -- null cuando está borrado
  updated bigint not null,                      -- hora del cambio en el celular (ms)
  deleted boolean not null default false,       -- borrado (se guarda para avisar a los otros equipos)
  server_updated timestamptz not null default now(),
  primary key (owner, id)
);
create index if not exists diagrams_owner_server_updated on public.diagrams (owner, server_updated);

-- 3) Gana el cambio más reciente: si llega uno más viejo (otro equipo atrasado), se ignora.
--    server_updated lo pone siempre el servidor (la app baja los cambios con esta hora).
create or replace function public.diagrams_keep_newest() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated < old.updated then
    return old;
  end if;
  new.server_updated := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists diagrams_keep_newest on public.diagrams;
create trigger diagrams_keep_newest before insert or update on public.diagrams
  for each row execute function public.diagrams_keep_newest();

-- 4) Cada usuario solo ve y cambia sus propios diagramas, y solo si su correo tiene acceso.
alter table public.diagrams enable row level security;
drop policy if exists "diagrams: ver los propios" on public.diagrams;
drop policy if exists "diagrams: crear los propios" on public.diagrams;
drop policy if exists "diagrams: cambiar los propios" on public.diagrams;
drop policy if exists "diagrams: borrar los propios" on public.diagrams;
create policy "diagrams: ver los propios" on public.diagrams for select to authenticated
  using (owner = auth.uid() and public.is_allowed());
create policy "diagrams: crear los propios" on public.diagrams for insert to authenticated
  with check (owner = auth.uid() and public.is_allowed());
create policy "diagrams: cambiar los propios" on public.diagrams for update to authenticated
  using (owner = auth.uid() and public.is_allowed())
  with check (owner = auth.uid() and public.is_allowed());
create policy "diagrams: borrar los propios" on public.diagrams for delete to authenticated
  using (owner = auth.uid() and public.is_allowed());

-- 5) Tu correo (cámbialo por el tuyo antes de correr esto; va en minúsculas).
insert into public.allowed_users (email) values ('TU_CORREO@ejemplo.com') on conflict do nothing;
