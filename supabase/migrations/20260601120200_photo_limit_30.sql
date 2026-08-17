-- =============================================================================
-- Migration: photo_limit_30
-- Purpose: eleva o limite de fotos por encontro de 10 para 30.
--          Apenas o count da trigger enforce_photo_limit_per_date muda;
--          assinatura, trigger e política de segurança seguem iguais.
-- =============================================================================

create or replace function public.enforce_photo_limit_per_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.photos
  where date_id = new.date_id;

  if v_count >= 30 then
    raise exception 'Limite de 30 fotos por encontro atingido.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.enforce_photo_limit_per_date()
  is 'Garante no máximo 30 fotos por encontro. Defense-in-depth contra bypass do client.';
