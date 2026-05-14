-- =============================================================================
-- Migration: create_profiles
-- Purpose:   Tabela profiles sincronizada com auth.users + RLS + trigger.
--
-- Notas:
--   * profiles.id é PK e FK para auth.users(id). Quando o usuário é deletado
--     do Auth, o profile cai junto via CASCADE.
--   * full_name e avatar_url vêm do raw_user_meta_data do Google OAuth.
--   * partner_id deixa a porta aberta para conectar dois usuários (casal) no
--     futuro sem alterar o schema. SET NULL para não quebrar se o parceiro sair.
-- =============================================================================

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       citext      not null,
  full_name   text,
  avatar_url  text,
  partner_id  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

comment on table  public.profiles            is 'Dados públicos do usuário, espelhados de auth.users.';
comment on column public.profiles.partner_id is 'ID do parceiro/parceira para funcionalidade de casal (opcional).';

-- ---------------------------------------------------------------------------
-- Trigger: mantém updated_at sempre correto, mesmo se o cliente tentar burlar.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: cria automaticamente um profile quando um usuário se registra
-- via Supabase Auth. Usa SECURITY DEFINER porque o usuário recém-criado
-- ainda não tem permissão de INSERT em public.profiles via RLS.
--
-- SET search_path = '' previne hijack via schema malicioso (CVE-2018-1058).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- SELECT: o usuário pode ver o próprio profile.
-- (Se quiser que parceiros se vejam mutuamente, adicionar OR partner_id = ...)
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- UPDATE: o usuário pode editar apenas o próprio profile.
-- WITH CHECK previne mudar o id para o de outra pessoa.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sem policy de INSERT: a criação é exclusiva do trigger handle_new_user.
-- Sem policy de DELETE: deleções acontecem em cascata via auth.users.
