-- =============================================================================
-- Migration: create_dates
-- Purpose:   Tabela principal de encontros + índices + RLS.
--
-- Notas:
--   * happened_at é a data em que o encontro aconteceu (≠ created_at, que é o
--     registro do diário). Permite registrar memórias retroativas.
--   * rating é smallint 1..10 com CHECK constraint a nível de banco.
--   * CHECK length() em title/description previne abuso de armazenamento.
-- =============================================================================

create table public.dates (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  title         text        not null check (char_length(title) between 1 and 120),
  description   text        check (description is null or char_length(description) <= 5000),
  location      text        check (location    is null or char_length(location)    <= 200),
  rating        smallint    check (rating      is null or rating between 1 and 10),
  happened_at   timestamptz not null default timezone('utc', now()),
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

comment on table  public.dates              is 'Encontros registrados pelo usuário.';
comment on column public.dates.happened_at  is 'Quando o encontro aconteceu (pode ser passado).';
comment on column public.dates.rating       is 'Nota de 1 a 10. NULL = sem avaliação.';

-- Índices para consultas frequentes -----------------------------------------
-- Timeline: encontros do usuário ordenados por data do encontro (desc).
create index dates_user_id_happened_at_idx
  on public.dates (user_id, happened_at desc);

-- Dashboard: filtros por rating em encontros do usuário.
create index dates_user_id_rating_idx
  on public.dates (user_id, rating desc nulls last);

-- Trigger updated_at --------------------------------------------------------
create trigger trg_dates_updated_at
  before update on public.dates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — privacidade total: cada usuário só enxerga e mexe nos próprios dados.
-- ---------------------------------------------------------------------------
alter table public.dates enable row level security;

-- SELECT
create policy "dates_select_own"
  on public.dates
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT — WITH CHECK garante que ninguém crie encontro em nome de outro.
create policy "dates_insert_own"
  on public.dates
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE — USING e WITH CHECK iguais previnem "transferir" para outro user.
create policy "dates_update_own"
  on public.dates
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE
create policy "dates_delete_own"
  on public.dates
  for delete
  to authenticated
  using (auth.uid() = user_id);
