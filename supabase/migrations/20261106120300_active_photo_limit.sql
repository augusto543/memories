-- A removed photo no longer occupies a visible photo slot.
create or replace function public.enforce_photo_limit_per_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.photos
  where date_id = new.date_id and is_deleted = false;
  if v_count >= 30 then
    raise exception 'Limite de 30 fotos por encontro atingido.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
-- Restoring a photo must also check the 30-photo limit before changing is_deleted.
-- Do not expose restoration to ordinary users until that check is implemented.
