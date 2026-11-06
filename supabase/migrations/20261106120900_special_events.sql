-- Calendário pessoal e compartilhado. Todas as exclusões são lógicas.
-- Dependência: 20261106120500_couple_member_read.sql (is_my_couple).
create table public.special_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  couple_id uuid references public.couples(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  event_date date not null,
  repeats_annually boolean not null default false,
  remind_days_before smallint check (remind_days_before between 0 and 365),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.special_events is
  'Datas especiais. couple_id NULL mantém o evento privado. Lembretes são exibidos dentro do app.';
create index special_events_user_active_idx
  on public.special_events(user_id, event_date)
  where is_deleted = false;
create index special_events_couple_active_idx
  on public.special_events(couple_id, event_date)
  where is_deleted = false and couple_id is not null;

create trigger trg_special_events_updated_at
  before update on public.special_events
  for each row execute function public.set_updated_at();

alter table public.special_events enable row level security;

create policy special_events_select on public.special_events
  for select to authenticated
  using (
    is_deleted = false and
    (user_id = auth.uid() or
      (couple_id is not null and public.is_my_couple(couple_id)))
  );

create policy special_events_insert_own on public.special_events
  for insert to authenticated
  with check (
    user_id = auth.uid() and
    (couple_id is null or public.is_my_couple(couple_id))
  );

-- Apenas o autor edita. Um parceiro pode visualizar um evento compartilhado.
create policy special_events_update_own on public.special_events
  for update to authenticated
  using (is_deleted = false and user_id = auth.uid())
  with check (
    user_id = auth.uid() and is_deleted = false and
    (couple_id is null or public.is_my_couple(couple_id))
  );

-- Não existe policy DELETE: nenhum usuário comum pode apagar fisicamente.
-- A RPC valida o proprietário e não usa UPDATE via PostgREST porque a nova
-- linha deixa de satisfazer a policy SELECT após is_deleted=true.
create function public.soft_delete_my_special_event(p_event_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_rows integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  update public.special_events
  set is_deleted = true, deleted_at = now()
  where id = p_event_id and user_id = v_user and is_deleted = false;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;
revoke all on function public.soft_delete_my_special_event(uuid)
  from public, anon, authenticated;
grant execute on function public.soft_delete_my_special_event(uuid)
  to authenticated;
