-- Little Days activity storage. Apply in the Supabase SQL editor.
create table if not exists public.baby_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('feed', 'pump', 'diaper', 'sleep')),
  occurred_at timestamptz not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists baby_activities_user_occurred_idx
  on public.baby_activities (user_id, occurred_at desc);

alter table public.baby_activities enable row level security;

create policy "Users can read their own baby activities"
  on public.baby_activities for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own baby activities"
  on public.baby_activities for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own baby activities"
  on public.baby_activities for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own baby activities"
  on public.baby_activities for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.baby_activities to authenticated;
