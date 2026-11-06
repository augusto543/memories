-- Preserve records; disable client-side hard deletes.
drop policy if exists dates_delete_own on public.dates;
drop policy if exists photos_delete_own on public.photos;
drop policy if exists notes_delete_own on public.notes;

-- Read policies hide soft-deleted rows; the application filters too.
drop policy if exists dates_select_own on public.dates;
create policy dates_select_own on public.dates for select to authenticated
using (user_id = auth.uid() and is_deleted = false);
drop policy if exists notes_select_own on public.notes;
create policy notes_select_own on public.notes for select to authenticated
using (user_id = auth.uid() and is_deleted = false);
drop policy if exists photos_select_own on public.photos;
create policy photos_select_own on public.photos for select to authenticated
using (is_deleted = false and exists (
 select 1 from public.dates d
 where d.id = photos.date_id and d.user_id = auth.uid() and d.is_deleted = false
));
create index if not exists dates_active_idx on public.dates(user_id, happened_at desc) where is_deleted = false;
create index if not exists notes_active_idx on public.notes(user_id, created_at desc) where is_deleted = false;
create index if not exists photos_active_idx on public.photos(date_id, position) where is_deleted = false;
