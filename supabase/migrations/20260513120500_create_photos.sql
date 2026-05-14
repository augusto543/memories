-- =============================================================================
-- Migration: create_photos
-- Purpose:   Tabela de fotos vinculadas a encontros + RLS.
--
-- Notas:
--   * storage_path em vez de image_url: guarda o caminho dentro do bucket
--     ('{user_id}/{date_id}/{uuid}.jpg'). A URL é gerada sob demanda (signed
--     URL) pelo servidor. Isso permite:
--       - Mudar bucket / mover assets sem migration de dados.
--       - Bucket privado → URLs assinadas com TTL.
--   * width/height são opcionais (preenchidos no upload se a imagem for lida).
--   * position permite reordenação manual no futuro.
-- =============================================================================

create table public.photos (
  id           uuid        primary key default gen_random_uuid(),
  date_id      uuid        not null references public.dates(id) on delete cascade,
  storage_path text        not null check (char_length(storage_path) between 1 and 500),
  width        integer     check (width  is null or width  > 0),
  height       integer     check (height is null or height > 0),
  position     integer     not null default 0,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

comment on table  public.photos              is 'Fotos anexadas a encontros (arquivos no bucket memories-photos).';
comment on column public.photos.storage_path is 'Caminho relativo no bucket: {user_id}/{date_id}/{filename}.';

create index photos_date_id_position_idx on public.photos (date_id, position);

create trigger trg_photos_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — segurança transitiva via JOIN com dates.
-- ---------------------------------------------------------------------------
alter table public.photos enable row level security;

create policy "photos_select_own"
  on public.photos for select
  to authenticated
  using (
    exists (
      select 1 from public.dates d
      where d.id = photos.date_id
        and d.user_id = auth.uid()
    )
  );

create policy "photos_insert_own"
  on public.photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.dates d
      where d.id = photos.date_id
        and d.user_id = auth.uid()
    )
  );

create policy "photos_update_own"
  on public.photos for update
  to authenticated
  using (
    exists (
      select 1 from public.dates d
      where d.id = photos.date_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dates d
      where d.id = photos.date_id
        and d.user_id = auth.uid()
    )
  );

create policy "photos_delete_own"
  on public.photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.dates d
      where d.id = photos.date_id
        and d.user_id = auth.uid()
    )
  );
