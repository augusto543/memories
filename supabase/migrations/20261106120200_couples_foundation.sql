-- Couple infrastructure only. No invitation acceptance is enabled by this migration.
create table if not exists public.couples (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.couple_members (
 couple_id uuid not null references public.couples(id),
 user_id uuid not null references auth.users(id),
 joined_at timestamptz not null default now(),
 primary key(couple_id,user_id),
 unique(user_id)
);
create table if not exists public.couple_invites (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id),
 created_by uuid not null references auth.users(id),
 token_hash text not null unique,
 expires_at timestamptz not null,
 accepted_by uuid references auth.users(id),
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists couple_invites_couple_idx on public.couple_invites(couple_id);
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invites enable row level security;

-- No direct membership writes are allowed to authenticated users.
-- A future server-side invitation flow must atomically enforce two members
-- and the invited person's explicit consent before sharing any old records.
