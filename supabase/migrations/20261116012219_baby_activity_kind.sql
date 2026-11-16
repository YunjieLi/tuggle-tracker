alter table public.baby_activities
  drop constraint baby_activities_kind_check,
  add constraint baby_activities_kind_check
    check (kind in ('feed', 'pump', 'diaper', 'sleep', 'activity'));
