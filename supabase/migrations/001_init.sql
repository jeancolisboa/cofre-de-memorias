-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- MEMORIES
-- ─────────────────────────────────────────────
create table if not exists public.memories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  text        text not null,
  mood        text,
  music       text,
  location    text,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique(user_id, date)
);

create index if not exists memories_user_id_date_idx on public.memories(user_id, date);

-- ─────────────────────────────────────────────
-- MEMORY MUSIC
-- ─────────────────────────────────────────────
create table if not exists public.memory_music (
  id          uuid primary key default uuid_generate_v4(),
  memory_id   uuid not null references public.memories(id) on delete cascade,
  title       text not null,
  artist      text,
  created_at  timestamptz not null default now()
);

create index if not exists memory_music_memory_id_idx on public.memory_music(memory_id);

-- ─────────────────────────────────────────────
-- MEMORY PEOPLE
-- ─────────────────────────────────────────────
create table if not exists public.memory_people (
  id          uuid primary key default uuid_generate_v4(),
  memory_id   uuid not null references public.memories(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists memory_people_memory_id_idx on public.memory_people(memory_id);

-- ─────────────────────────────────────────────
-- MEMORY TAGS
-- ─────────────────────────────────────────────
create table if not exists public.memory_tags (
  id          uuid primary key default uuid_generate_v4(),
  memory_id   uuid not null references public.memories(id) on delete cascade,
  tag         text not null,
  created_at  timestamptz not null default now()
);

create index if not exists memory_tags_memory_id_idx on public.memory_tags(memory_id);
create index if not exists memory_tags_tag_idx on public.memory_tags(tag);

-- ─────────────────────────────────────────────
-- COLLECTIONS
-- ─────────────────────────────────────────────
create table if not exists public.collections (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  cover_emoji   text,
  created_at    timestamptz not null default now()
);

create index if not exists collections_user_id_idx on public.collections(user_id);

-- ─────────────────────────────────────────────
-- COLLECTION MEMORIES (junction)
-- ─────────────────────────────────────────────
create table if not exists public.collection_memories (
  id              uuid primary key default uuid_generate_v4(),
  collection_id   uuid not null references public.collections(id) on delete cascade,
  memory_id       uuid not null references public.memories(id) on delete cascade,
  added_at        timestamptz not null default now(),

  unique(collection_id, memory_id)
);

create index if not exists collection_memories_collection_id_idx on public.collection_memories(collection_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.memories enable row level security;
alter table public.memory_music enable row level security;
alter table public.memory_people enable row level security;
alter table public.memory_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_memories enable row level security;

-- Memories: user owns their data
create policy "Users can manage own memories"
  on public.memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Memory music: accessible if parent memory belongs to user
create policy "Users can manage own memory_music"
  on public.memory_music for all
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );

-- Memory people
create policy "Users can manage own memory_people"
  on public.memory_people for all
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );

-- Memory tags
create policy "Users can manage own memory_tags"
  on public.memory_tags for all
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );

-- Collections
create policy "Users can manage own collections"
  on public.collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Collection memories
create policy "Users can manage own collection_memories"
  on public.collection_memories for all
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memories_updated_at
  before update on public.memories
  for each row execute procedure public.handle_updated_at();
