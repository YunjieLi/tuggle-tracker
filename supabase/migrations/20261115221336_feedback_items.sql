create table public.feedback_items (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index feedback_items_user_created_idx
  on public.feedback_items (user_id, created_at desc, id);

alter table public.feedback_items enable row level security;
revoke all on public.feedback_items from anon, authenticated;
grant select, insert, update, delete on public.feedback_items to authenticated;

create policy "Users manage their own feedback"
  on public.feedback_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
