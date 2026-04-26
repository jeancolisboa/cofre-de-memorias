-- ═══════════════════════════════════════════════════════════════
-- FASE 3.2 — Tabela pública de perfis + user_id em memory_people
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  email        text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Qualquer usuário autenticado pode ver perfis (necessário para o autocomplete)
create policy "profiles_select"
  on public.profiles for select
  using (auth.uid() is not null);

-- Apenas o próprio usuário pode atualizar seu perfil
create policy "profiles_update"
  on public.profiles for update
  using    (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- TRIGGER: popula profiles automaticamente no signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- BACKFILL: popula perfis de usuários já existentes
-- ─────────────────────────────────────────────
insert into public.profiles (id, email, display_name, avatar_url)
select
  id,
  email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- MEMORY PEOPLE: adiciona user_id
-- NULL = texto livre (comportamento legado)
-- ─────────────────────────────────────────────
alter table public.memory_people
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists memory_people_user_id_idx on public.memory_people(user_id);
