-- =============================================================================
-- Migration: create_rpc_and_limits
-- Purpose:
--   1. Trigger que limita o número de fotos por encontro (10).
--   2. RPC create_date_with_relations(): cria date + tags + photos numa única
--      transação Postgres. Usado pelo flow "criar novo encontro" do app.
--
-- Decisões:
--   * security invoker — a função roda com privilégios do caller, então RLS
--     continua aplicando. auth.uid() funciona normalmente.
--   * Tags são upsert por nome — UI envia strings, RPC garante existência.
--   * Falha em qualquer step = rollback automático (transação implícita PLpgSQL).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Limite de fotos por encontro
-- ---------------------------------------------------------------------------
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

  if v_count >= 10 then
    raise exception 'Limite de 10 fotos por encontro atingido.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_photo_limit
  before insert on public.photos
  for each row execute function public.enforce_photo_limit_per_date();

comment on function public.enforce_photo_limit_per_date()
  is 'Garante no máximo 10 fotos por encontro. Defense-in-depth contra bypass do client.';

-- ---------------------------------------------------------------------------
-- 2. RPC transacional: cria encontro + tags + fotos atomicamente
-- ---------------------------------------------------------------------------
create or replace function public.create_date_with_relations(
  p_title        text,
  p_description  text,
  p_location     text,
  p_rating       smallint,
  p_happened_at  timestamptz,
  p_tag_names    text[],
  p_photo_paths  text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id  uuid := auth.uid();
  v_date_id  uuid;
  v_tag_id   uuid;
  v_tag_name text;
  v_path     text;
  v_position int := 0;
begin
  if v_user_id is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  -- 2.1 Cria o encontro
  insert into public.dates (user_id, title, description, location, rating, happened_at)
  values (v_user_id, p_title, p_description, p_location, p_rating,
          coalesce(p_happened_at, timezone('utc', now())))
  returning id into v_date_id;

  -- 2.2 Upsert das tags e ligação ao encontro
  if p_tag_names is not null then
    foreach v_tag_name in array p_tag_names loop
      v_tag_name := trim(v_tag_name);
      continue when v_tag_name = '';

      insert into public.tags (user_id, name)
      values (v_user_id, v_tag_name)
      on conflict (user_id, name)
        do update set name = excluded.name      -- noop só pra disparar RETURNING
      returning id into v_tag_id;

      insert into public.date_tags (date_id, tag_id)
      values (v_date_id, v_tag_id)
      on conflict (date_id, tag_id) do nothing;
    end loop;
  end if;

  -- 2.3 Insere as fotos preservando a ordem do array
  if p_photo_paths is not null then
    foreach v_path in array p_photo_paths loop
      insert into public.photos (date_id, storage_path, position)
      values (v_date_id, v_path, v_position);
      v_position := v_position + 1;
    end loop;
  end if;

  return v_date_id;
end;
$$;

comment on function public.create_date_with_relations
  is 'Cria date + date_tags + photos numa única transação. Tags são upsert por nome.';

-- ---------------------------------------------------------------------------
-- Permissões: apenas usuários autenticados podem chamar.
-- ---------------------------------------------------------------------------
grant execute on function public.create_date_with_relations(
  text, text, text, smallint, timestamptz, text[], text[]
) to authenticated;

revoke execute on function public.create_date_with_relations(
  text, text, text, smallint, timestamptz, text[], text[]
) from anon, public;
