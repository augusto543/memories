alter table public.dates add column if not exists is_deleted boolean not null default false;
alter table public.dates add column if not exists deleted_at timestamptz;
alter table public.photos add column if not exists is_deleted boolean not null default false;
alter table public.photos add column if not exists deleted_at timestamptz;
alter table public.notes add column if not exists is_deleted boolean not null default false;
alter table public.notes add column if not exists deleted_at timestamptz;
