create table if not exists public.baby_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  created_at timestamptz not null default now()
);

alter table public.baby_usernames enable row level security;
revoke all on table public.baby_usernames from public, anon, authenticated;
grant select, insert, update, delete on table public.baby_usernames to service_role;
