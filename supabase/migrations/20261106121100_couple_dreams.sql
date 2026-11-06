-- Sonhos e experiências do casal. RLS restringe a membros atuais.
-- Depende de public.couples, public.is_my_couple(uuid) e public.set_updated_at().
-- Nenhum registro existente de datas/notas é compartilhado por esta migration.
create table public.couple_dreams (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  details text check (details is null or char_length(details) <= 1500),
  category text not null default 'outro'
    check (category in ('viagem', 'encontro', 'aventura', 'projeto', 'outro')),
  status text not null default 'sonho'
    check (status in ('sonho', 'planejado', 'realizado')),
  target_date date,
  completed_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.couple_dreams is
  'Lista compartilhada de sonhos. Só membros atuais do casal podem consultar e editar. Exclusões são lógicas.';
create index couple_dreams_active_couple_idx
  on public.couple_dreams(couple_id, status, created_at desc)
  where is_deleted = false;

create trigger trg_couple_dreams_updated_at
  before update on public.couple_dreams
  for each row execute function public.set_updated_at();

-- Sempre gerenciar a data de conclusão no banco; não confiar no cliente.
create function public.couple_dreams_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.couple_id is distinct from old.couple_id
       or new.created_by is distinct from old.created_by
       or new.is_deleted is distinct from old.is_deleted
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Cannot transfer or physically delete a dream through UPDATE'
        using errcode = '42501';
    end if;
    if new.status = 'realizado' and old.status <> 'realizado' then
      new.completed_at := now();
    elsif new.status <> 'realizado' then
      new.completed_at := null;
    else
      new.completed_at := old.completed_at;
    end if;
  else
    if new.is_deleted or new.deleted_at is not null then
      raise exception 'Cannot insert deleted dream' using errcode = '42501';
    end if;
    new.completed_at := case when new.status = 'realizado' then now() else null end;
  end if;
  return new;
end;
$$;

create trigger trg_couple_dreams_guard
  before insert or update on public.couple_dreams
  for each row execute function public.couple_dreams_guard();

alter table public.couple_dreams enable row level security;

create policy couple_dreams_select_member on public.couple_dreams
  for select to authenticated
  using (is_deleted = false and public.is_my_couple(couple_id));

create policy couple_dreams_insert_member on public.couple_dreams
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and is_deleted = false
    and deleted_at is null
    and public.is_my_couple(couple_id)
  );

create policy couple_dreams_update_member on public.couple_dreams
  for update to authenticated
  using (is_deleted = false and public.is_my_couple(couple_id))
  with check (is_deleted = false and public.is_my_couple(couple_id));

-- Sem policy DELETE. Exclusão lógica feita por função com verificação no banco.
create function public.soft_delete_couple_dream(p_dream_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_rows integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.couple_dreams
  set is_deleted = true, deleted_at = now()
  where id = p_dream_id
    and is_deleted = false
    and public.is_my_couple(couple_id);
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;
revoke all on function public.soft_delete_couple_dream(uuid)
  from public, anon, authenticated;
grant execute on function public.soft_delete_couple_dream(uuid)
  to authenticated;
