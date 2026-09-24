drop policy if exists "Users can read their own baby activities" on public.baby_activities;
drop policy if exists "Users can create their own baby activities" on public.baby_activities;
drop policy if exists "Users can update their own baby activities" on public.baby_activities;
drop policy if exists "Users can delete their own baby activities" on public.baby_activities;

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
