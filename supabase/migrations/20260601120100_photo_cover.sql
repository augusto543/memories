-- =============================================================================
-- Migration: photo_cover
-- Purpose:
--   Permite escolher qual foto é a capa do encontro (timeline/home).
--   Reaproveita a tabela photos existente — apenas marca a foto escolhida.
--
-- Regra: no máximo UMA capa por encontro (índice único parcial).
--   Sem capa explícita, o app usa a primeira foto (menor position) como fallback.
-- =============================================================================

alter table public.photos
  add column if not exists is_cover boolean not null default false;

create unique index if not exists photos_one_cover_per_date_idx
  on public.photos (date_id)
  where is_cover;

comment on column public.photos.is_cover
  is 'Marca a foto usada como capa do encontro. Máx. 1 por encontro; fallback = primeira foto.';
