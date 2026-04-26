-- ═══════════════════════════════════════════════════════════════
-- FASE 3 — Compartilhamento, Grupos e Notificações
-- (idempotente: pode ser re-executada com segurança)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- MEMORY MEMBERS
-- ─────────────────────────────────────────────
create table if not exists public.memory_members (
  id          uuid        primary key default uuid_generate_v4(),
  memory_id   uuid        not null references public.memories(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  role        text        not null check (role in ('owner', 'contributor', 'viewer')),
  invited_by  uuid        references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique(memory_id, user_id)
);
create index if not exists memory_members_memory_id_idx on public.memory_members(memory_id);
create index if not exists memory_members_user_id_idx   on public.memory_members(user_id);

-- ─────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────
create table if not exists public.groups (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  emoji       text,
  created_by  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists groups_created_by_idx on public.groups(created_by);

drop trigger if exists groups_updated_at on public.groups;
create trigger groups_updated_at
  before update on public.groups
  for each row execute procedure public.handle_updated_at();

-- ─────────────────────────────────────────────
-- GROUP MEMBERS
-- ─────────────────────────────────────────────
create table if not exists public.group_members (
  id          uuid        primary key default uuid_generate_v4(),
  group_id    uuid        not null references public.groups(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  role        text        not null check (role in ('admin', 'member')),
  created_at  timestamptz not null default now(),
  unique(group_id, user_id)
);
create index if not exists group_members_group_id_idx on public.group_members(group_id);
create index if not exists group_members_user_id_idx  on public.group_members(user_id);

-- ─────────────────────────────────────────────
-- GROUP MEMORIES
-- ─────────────────────────────────────────────
create table if not exists public.group_memories (
  id          uuid        primary key default uuid_generate_v4(),
  group_id    uuid        not null references public.groups(id)   on delete cascade,
  memory_id   uuid        not null references public.memories(id) on delete cascade,
  added_by    uuid        references auth.users(id) on delete set null,
  added_at    timestamptz not null default now(),
  unique(group_id, memory_id)
);
create index if not exists group_memories_group_id_idx  on public.group_memories(group_id);
create index if not exists group_memories_memory_id_idx on public.group_memories(memory_id);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
create table if not exists public.notifications (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  type         text        not null check (type in (
                             'memory_tag', 'group_invite',
                             'group_new_memory', 'on_this_day'
                           )),
  memory_id    uuid        references public.memories(id) on delete cascade,
  group_id     uuid        references public.groups(id)   on delete cascade,
  from_user_id uuid        references auth.users(id) on delete set null,
  meta         jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_user_id_idx         on public.notifications(user_id);
create index if not exists notifications_user_id_read_at_idx on public.notifications(user_id, read_at);

-- ═══════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════
alter table public.memory_members  enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.group_memories  enable row level security;
alter table public.notifications   enable row level security;

-- ═══════════════════════════════════════════════════════════════
-- MEMORIES — substituir policy FOR ALL por granulares
-- ═══════════════════════════════════════════════════════════════
drop policy if exists "Users can manage own memories"  on public.memories;
drop policy if exists "memories_select"                on public.memories;
drop policy if exists "memories_insert"                on public.memories;
drop policy if exists "memories_update"                on public.memories;
drop policy if exists "memories_delete"                on public.memories;

create policy "memories_select" on public.memories for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.memory_members mm
      where mm.memory_id = memories.id
        and mm.user_id   = auth.uid()
        and mm.accepted_at is not null
    )
  );

create policy "memories_insert" on public.memories for insert
  with check (auth.uid() = user_id);

create policy "memories_update" on public.memories for update
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "memories_delete" on public.memories for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- MEMORY MEMBERS POLICIES
-- ═══════════════════════════════════════════════════════════════
drop policy if exists "memory_members_select" on public.memory_members;
drop policy if exists "memory_members_insert" on public.memory_members;
drop policy if exists "memory_members_update" on public.memory_members;
drop policy if exists "memory_members_delete" on public.memory_members;

create policy "memory_members_select" on public.memory_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.memories m
      where m.id = memory_members.memory_id and m.user_id = auth.uid()
    )
  );

create policy "memory_members_insert" on public.memory_members for insert
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_members.memory_id and m.user_id = auth.uid()
    )
  );

create policy "memory_members_update" on public.memory_members for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.memories m
      where m.id = memory_members.memory_id and m.user_id = auth.uid()
    )
  );

create policy "memory_members_delete" on public.memory_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.memories m
      where m.id = memory_members.memory_id and m.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- GROUPS POLICIES
-- ═══════════════════════════════════════════════════════════════
drop policy if exists "groups_select" on public.groups;
drop policy if exists "groups_insert" on public.groups;
drop policy if exists "groups_update" on public.groups;
drop policy if exists "groups_delete" on public.groups;

create policy "groups_select" on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "groups_insert" on public.groups for insert
  with check (auth.uid() = created_by);

create policy "groups_update" on public.groups for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

create policy "groups_delete" on public.groups for delete
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- GROUP MEMBERS POLICIES
-- ═══════════════════════════════════════════════════════════════
drop policy if exists "group_members_select" on public.group_members;
drop policy if exists "group_members_insert" on public.group_members;
drop policy if exists "group_members_update" on public.group_members;
drop policy if exists "group_members_delete" on public.group_members;

create policy "group_members_select" on public.group_members for select
  using (auth.uid() = user_id);

create policy "group_members_insert" on public.group_members for insert
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id  = auth.uid()
        and gm.role     = 'admin'
    )
  );

create policy "group_members_update" on public.group_members for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id  = auth.uid()
        and gm.role     = 'admin'
    )
  );

create policy "group_members_delete" on public.group_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id  = auth.uid()
        and gm.role     = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- GROUP MEMORIES POLICIES
-- ═══════════════════════════════════════════════════════════════
drop policy if exists "group_memories_select" on public.group_memories;
drop policy if exists "group_memories_insert" on public.group_memories;
drop policy if exists "group_memories_update" on public.group_memories;
drop policy if exists "group_memories_delete" on public.group_memories;

create policy "group_memories_select" on public.group_memories for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_memories.group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_memories_insert" on public.group_memories for insert
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_memories.group_id and gm.user_id = auth.uid()
    )
    and (
      exists (
        select 1 from public.memories m
        where m.id = group_memories.memory_id and m.user_id = auth.uid()
      )
      or exists (
        select 1 from public.memory_members mm
        where mm.memory_id = group_memories.memory_id
          and mm.user_id   = auth.uid()
          and mm.accepted_at is not null
      )
    )
  );

create policy "group_memories_update" on public.group_memories for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_memories.group_id
        and gm.user_id  = auth.uid()
        and gm.role     = 'admin'
    )
  );

create policy "group_memories_delete" on public.group_memories for delete
  using (
    auth.uid() = added_by
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_memories.group_id
        and gm.user_id  = auth.uid()
        and gm.role     = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS POLICIES
-- ═══════════════════════════════════════════════════════════════
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;

create policy "notifications_select" on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_insert" on public.notifications for insert
  with check (auth.uid() = from_user_id);

create policy "notifications_update" on public.notifications for update
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications_delete" on public.notifications for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÃO HELPER: create_group_with_admin
-- ═══════════════════════════════════════════════════════════════
create or replace function public.create_group_with_admin(
  p_name  text,
  p_emoji text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  insert into public.groups (name, emoji, created_by)
  values (p_name, p_emoji, auth.uid())
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'admin');

  return v_group_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.notifications;
