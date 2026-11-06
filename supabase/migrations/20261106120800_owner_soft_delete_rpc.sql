-- Soft deletion through ownership-checked, atomic RPCs.
--
-- Rationale: SELECT policies intentionally hide is_deleted=true rows.
-- Some PostgREST UPDATE operations enforce SELECT visibility on the result,
-- so flipping is_deleted from false to true can raise an RLS error.
-- These SECURITY DEFINER functions perform only the authorized change.
-- They never bypass ownership checks or expose deleted data.
--
-- IMPORTANT: Run this migration in Supabase SQL Editor before testing the
-- new application actions. It does not delete records or storage objects.

create or replace function public.soft_delete_my_note(p_note_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.notes
  set is_deleted = true, deleted_at = now()
  where id = p_note_id
    and user_id = v_user_id
    and is_deleted = false;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.soft_delete_my_note(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_my_note(uuid) to authenticated;
comment on function public.soft_delete_my_note(uuid)
is 'Soft delete one active note owned by the authenticated user. Returns false if missing, deleted or unauthorized.';

create or replace function public.soft_delete_my_date(p_date_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.dates
  set is_deleted = true, deleted_at = now()
  where id = p_date_id
    and user_id = v_user_id
    and is_deleted = false;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.soft_delete_my_date(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_my_date(uuid) to authenticated;
comment on function public.soft_delete_my_date(uuid)
is 'Soft delete one active date owned by the authenticated user, preserving photos and tags.';

create or replace function public.soft_delete_my_photo(p_photo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.photos as p
  set is_deleted = true,
      deleted_at = now(),
      is_cover = false
  from public.dates as d
  where p.id = p_photo_id
    and p.date_id = d.id
    and d.user_id = v_user_id
    and d.is_deleted = false
    and p.is_deleted = false;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.soft_delete_my_photo(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_my_photo(uuid) to authenticated;
comment on function public.soft_delete_my_photo(uuid)
is 'Soft delete one active photo in an active date owned by the authenticated user; preserve storage file.';

-- Verify installed functions/permissions with:
-- select p.proname, p.prosecdef, p.proacl
-- from pg_proc p
-- where p.pronamespace = 'public'::regnamespace
--   and p.proname like 'soft_delete_my_%';
