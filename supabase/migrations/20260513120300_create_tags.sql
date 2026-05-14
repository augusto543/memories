-- =============================================================================
-- Migration: create_tags
-- Purpose:   Tags por usuário (cada um tem o próprio namespace) + RLS.
--
-- Notas:
--   * UNIQUE(user_id, name) impede o mesmo usuário criar tag duplicada.
--   * citext em name faz "Romântico" e "romântico" serem a mesma tag.
--   * Por que NÃO global? Tags globais permitem enumeração ("quais tags
--     existem?") que vaza padrões de uso. Per-user mantém escopo total.
-- =============================================================================

create table public.tags (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       citext      not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

comment on table public.tags is 'Tags personalizadas por usuário (namespace isolado).';

create index tags_user_id_idx on public.tags (user_id);

create trigger trg_tags_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tags enable row level security;

create policy "tags_select_own"
  on public.tags for select
  to authenticated
  using (auth.uid() = user_id);

create policy "tags_insert_own"
  on public.tags for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "tags_update_own"
  on public.tags for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tags_delete_own"
  on public.tags for delete
  to authenticated
  using (auth.uid() = user_id);
