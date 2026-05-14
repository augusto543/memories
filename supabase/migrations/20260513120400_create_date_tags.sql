-- =============================================================================
-- Migration: create_date_tags
-- Purpose:   Junction table N:N entre dates e tags + RLS.
--
-- Notas:
--   * Sem user_id direto — derivado via JOIN com dates. RLS faz EXISTS check.
--   * UNIQUE(date_id, tag_id) garante que o mesmo par não se repita.
--   * Surrogate UUID PK (em vez de PK composta) por uniformidade com o resto
--     do schema (regra do usuário: todas as tabelas com UUID PK).
-- =============================================================================

create table public.date_tags (
  id         uuid        primary key default gen_random_uuid(),
  date_id    uuid        not null references public.dates(id) on delete cascade,
  tag_id     uuid        not null references public.tags(id)  on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (date_id, tag_id)
);

comment on table public.date_tags is 'Relação N:N entre encontros e tags.';

-- Índices para os dois sentidos do JOIN -------------------------------------
create index date_tags_date_id_idx on public.date_tags (date_id);
create index date_tags_tag_id_idx  on public.date_tags (tag_id);

create trigger trg_date_tags_updated_at
  before update on public.date_tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — segurança por transitividade: precisa ser dono do date E da tag.
-- ---------------------------------------------------------------------------
alter table public.date_tags enable row level security;

-- SELECT: usuário vê associações cujo date é dele.
create policy "date_tags_select_own"
  on public.date_tags for select
  to authenticated
  using (
    exists (
      select 1 from public.dates d
      where d.id = date_tags.date_id
        and d.user_id = auth.uid()
    )
  );

-- INSERT: WITH CHECK exige que o usuário seja dono TANTO do date QUANTO da tag.
-- Isso previne que alguém anexe uma tag de outro usuário em seu próprio date.
create policy "date_tags_insert_own"
  on public.date_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.dates d
      where d.id = date_tags.date_id
        and d.user_id = auth.uid()
    )
    and
    exists (
      select 1 from public.tags t
      where t.id = date_tags.tag_id
        and t.user_id = auth.uid()
    )
  );

-- DELETE: dono do date pode remover a associação.
create policy "date_tags_delete_own"
  on public.date_tags for delete
  to authenticated
  using (
    exists (
      select 1 from public.dates d
      where d.id = date_tags.date_id
        and d.user_id = auth.uid()
    )
  );

-- Sem UPDATE: junction table — para "trocar" a tag, apaga e cria.
