create table public.baby_growth_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date,
  weight_kg numeric check (weight_kg > 0 and weight_kg < 'Infinity'::numeric),
  length_cm numeric check (length_cm > 0 and length_cm < 'Infinity'::numeric),
  head_cm numeric check (head_cm > 0 and head_cm < 'Infinity'::numeric),
  created_at timestamptz not null default now(),
  check (num_nonnulls(weight_kg, length_cm, head_cm) > 0)
);

create index baby_growth_records_user_history_idx
  on public.baby_growth_records (user_id, measured_on desc nulls last, created_at desc);

alter table public.baby_growth_records enable row level security;

create policy "Users can read their own growth records"
  on public.baby_growth_records for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own growth records"
  on public.baby_growth_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.baby_growth_records from anon, authenticated;
grant select, insert on public.baby_growth_records to authenticated;
