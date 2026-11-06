-- Respostas semanais e conversa privada do casal.
-- Reexecutável: CREATE IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS evitam erros
-- se o SQL Editor tiver aplicado instruções antes de encontrar o erro de sintaxe.
-- Não altera notas/encontros antigos; só membros do mesmo casal acessam.
create table if not exists public.weekly_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  user_id uuid not null references auth.users(id),
  week_start date not null
    check (extract(isodow from week_start) = 1),
  content text not null check (char_length(btrim(content)) between 1 and 1500),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists weekly_answers_active_unique
  on public.weekly_answers(couple_id, user_id, week_start)
  where is_deleted = false;
create index if not exists weekly_answers_couple_week_idx
  on public.weekly_answers(couple_id, week_start desc)
  where is_deleted = false;
drop trigger if exists trg_weekly_answers_updated_at on public.weekly_answers;
create trigger trg_weekly_answers_updated_at
  before update on public.weekly_answers
  for each row execute function public.set_updated_at();

alter table public.weekly_answers enable row level security;
drop policy if exists weekly_answers_select_couple on public.weekly_answers;
create policy weekly_answers_select_couple on public.weekly_answers
  for select to authenticated using (
    is_deleted = false and public.is_my_couple(couple_id)
  );
drop policy if exists weekly_answers_insert_member on public.weekly_answers;
create policy weekly_answers_insert_member on public.weekly_answers
  for insert to authenticated with check (
    user_id = auth.uid() and is_deleted = false
    and public.is_my_couple(couple_id)
  );
drop policy if exists weekly_answers_update_author on public.weekly_answers;
create policy weekly_answers_update_author on public.weekly_answers
  for update to authenticated
  using (user_id = auth.uid() and is_deleted = false
    and public.is_my_couple(couple_id))
  with check (user_id = auth.uid() and is_deleted = false
    and public.is_my_couple(couple_id));

create table if not exists public.couple_comments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  answer_id uuid not null references public.weekly_answers(id),
  parent_id uuid references public.couple_comments(id),
  user_id uuid not null references auth.users(id),
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id is distinct from parent_id)
);
create index if not exists couple_comments_answer_active_idx
  on public.couple_comments(answer_id, created_at)
  where is_deleted = false;
drop trigger if exists trg_couple_comments_updated_at on public.couple_comments;
create trigger trg_couple_comments_updated_at
  before update on public.couple_comments
  for each row execute function public.set_updated_at();
alter table public.couple_comments enable row level security;

drop policy if exists couple_comments_select_member on public.couple_comments;
create policy couple_comments_select_member on public.couple_comments
  for select to authenticated using (
    is_deleted = false and public.is_my_couple(couple_id)
    and exists (
      select 1 from public.weekly_answers a
      where a.id = answer_id and a.couple_id = couple_comments.couple_id
        and a.is_deleted = false
    )
  );
-- A definer helper avoids recursive RLS when validating a reply to a comment.
create or replace function public.can_reply_to_couple_comment(
  p_parent_id uuid, p_answer_id uuid, p_couple_id uuid
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_my_couple(p_couple_id) and exists (
    select 1 from public.couple_comments p
    where p.id = p_parent_id
      and p.answer_id = p_answer_id
      and p.couple_id = p_couple_id
      and p.parent_id is null
      and p.is_deleted = false
  );
$$;
revoke all on function public.can_reply_to_couple_comment(uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.can_reply_to_couple_comment(uuid,uuid,uuid)
  to authenticated;

drop policy if exists couple_comments_insert_member on public.couple_comments;
create policy couple_comments_insert_member on public.couple_comments
  for insert to authenticated with check (
    user_id = auth.uid() and is_deleted = false
    and public.is_my_couple(couple_id)
    and exists (
      select 1 from public.weekly_answers a
      where a.id = answer_id and a.couple_id = couple_comments.couple_id
        and a.is_deleted = false
    )
    and (parent_id is null or public.can_reply_to_couple_comment(
      parent_id, answer_id, couple_id
    ))
  );
drop policy if exists couple_comments_update_author on public.couple_comments;
create policy couple_comments_update_author on public.couple_comments
  for update to authenticated
  using (
    user_id = auth.uid() and is_deleted = false
    and public.is_my_couple(couple_id)
  )
  with check (
    user_id = auth.uid() and is_deleted = false
    and public.is_my_couple(couple_id)
  );

-- Prevent client UPDATE from moving an existing comment or answer to
-- another target. Only content can be edited by its author.
create or replace function public.protect_weekly_answer_identity()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.couple_id is distinct from old.couple_id
     or new.week_start is distinct from old.week_start then
    raise exception 'Cannot move a weekly answer' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_weekly_answers_protect_identity on public.weekly_answers;
create trigger trg_weekly_answers_protect_identity
  before update on public.weekly_answers for each row
  execute function public.protect_weekly_answer_identity();

create or replace function public.protect_comment_identity()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.couple_id is distinct from old.couple_id
     or new.answer_id is distinct from old.answer_id
     or new.parent_id is distinct from old.parent_id then
    raise exception 'Cannot move a comment' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_couple_comments_protect_identity on public.couple_comments;
create trigger trg_couple_comments_protect_identity
  before update on public.couple_comments for each row
  execute function public.protect_comment_identity();

-- Use RPC for deletion because RLS SELECT only exposes active rows.
create or replace function public.soft_delete_my_weekly_answer(p_answer_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  update public.weekly_answers
  set is_deleted = true, deleted_at = now()
  where id = p_answer_id and user_id = auth.uid() and is_deleted = false;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;
revoke all on function public.soft_delete_my_weekly_answer(uuid)
  from public, anon, authenticated;
grant execute on function public.soft_delete_my_weekly_answer(uuid) to authenticated;

create or replace function public.soft_delete_my_comment(p_comment_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  update public.couple_comments
  set is_deleted = true, deleted_at = now()
  where id = p_comment_id and user_id = auth.uid() and is_deleted = false;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;
revoke all on function public.soft_delete_my_comment(uuid)
  from public, anon, authenticated;
grant execute on function public.soft_delete_my_comment(uuid) to authenticated;

-- RLS covers normal application operations, while the database API owner
-- can still restore soft-deleted rows using an explicit admin-only SQL.
