-- Soft delete: memórias ficam na lixeira por 30 dias antes de serem removidas
alter table public.memories
  add column if not exists deleted_at timestamptz default null;

create index if not exists memories_deleted_at_idx on public.memories(deleted_at)
  where deleted_at is not null;
