create policy "Users can update their own growth records"
  on public.baby_growth_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant update (measured_on, weight_kg, length_cm, head_cm)
  on public.baby_growth_records to authenticated;
