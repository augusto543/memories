-- =============================================================================
-- Migration: create_notes — Notinhas emocionais do usuário (Home).
-- =============================================================================

create table public.notes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  content     text        not null check (char_length(content) between 1 and 500),
  mood        text        check (mood is null or mood in ('love','longing','joy','calm','nostalgia')),
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

comment on table  public.notes         is 'Notas rápidas emocionais (saudades, gratidões, micro-memórias).';
comment on column public.notes.mood    is 'Mood opcional: love | longing | joy | calm | nostalgia.';

create index notes_user_id_created_at_idx
  on public.notes (user_id, created_at desc);

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;

create policy "notes_select_own"
  on public.notes for select to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes for delete to authenticated
  using (auth.uid() = user_id);
