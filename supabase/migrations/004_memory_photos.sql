-- ─────────────────────────────────────────────
-- MEMORY PHOTOS
-- ─────────────────────────────────────────────
create table if not exists public.memory_photos (
  id           uuid primary key default uuid_generate_v4(),
  memory_id    uuid not null references public.memories(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index if not exists memory_photos_memory_id_idx on public.memory_photos(memory_id);

alter table public.memory_photos enable row level security;

create policy "Users can manage own memory_photos"
  on public.memory_photos for all
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- STORAGE: memory-photos bucket
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('memory-photos', 'memory-photos', false)
on conflict (id) do nothing;

-- Usuário só acessa objetos cujo caminho começa com seu user_id
create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'memory-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can read own photos"
  on storage.objects for select
  using (
    bucket_id = 'memory-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'memory-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
