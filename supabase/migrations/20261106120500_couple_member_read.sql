-- Read members of your own couple without recursive RLS.
create or replace function public.is_my_couple(p_couple_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = auth.uid()
  );
$$;
revoke all on function public.is_my_couple(uuid) from public;
grant execute on function public.is_my_couple(uuid) to authenticated;
create policy couple_members_read_partner on public.couple_members
for select to authenticated using (public.is_my_couple(couple_id));
create policy couples_read_member on public.couples
for select to authenticated using (public.is_my_couple(id));
-- Keep the invitation token hash hidden: no SELECT policy on couple_invites.
