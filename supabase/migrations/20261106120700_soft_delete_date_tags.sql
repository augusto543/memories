-- Preserve tag associations when a user removes a tag from a date.
alter table public.date_tags
  add column if not exists is_deleted boolean not null default false;
alter table public.date_tags
  add column if not exists deleted_at timestamptz;

drop policy if exists date_tags_delete_own on public.date_tags;
drop policy if exists date_tags_select_own on public.date_tags;
create policy date_tags_select_own on public.date_tags
for select to authenticated using (
  exists (
    select 1 from public.dates d
    where d.id = date_tags.date_id and d.user_id = auth.uid() and d.is_deleted = false
  )
);
create policy date_tags_update_own on public.date_tags
for update to authenticated
using (exists (
  select 1 from public.dates d
  where d.id = date_tags.date_id and d.user_id = auth.uid() and d.is_deleted = false
))
with check (exists (
  select 1 from public.dates d
  where d.id = date_tags.date_id and d.user_id = auth.uid() and d.is_deleted = false
));
-- Owners can read hidden links for reactivation; UI queries must filter is_deleted=false.
-- Existing uniqueness(date_id, tag_id) remains: reattachment reactivates the row.
create index if not exists date_tags_active_idx
on public.date_tags(date_id, tag_id) where is_deleted = false;
