alter table public.dinner_slots
  add column if not exists plan_type text not null default 'undecided';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dinner_slots_plan_type_check'
      and conrelid = 'public.dinner_slots'::regclass
  ) then
    alter table public.dinner_slots
      add constraint dinner_slots_plan_type_check
      check (plan_type in ('reservation', 'cook', 'undecided'));
  end if;
end $$;

insert into public.dinner_slots (dinner_date, title, notes, plan_type) values
  ('2026-06-27', '', '', 'undecided'),
  ('2026-06-28', '', '', 'undecided'),
  ('2026-06-29', '', '', 'undecided'),
  ('2026-06-30', '', '', 'undecided'),
  ('2026-07-01', '', '', 'undecided'),
  ('2026-07-02', '', '', 'undecided'),
  ('2026-07-03', '', '', 'undecided'),
  ('2026-07-04', '', '', 'undecided')
on conflict (dinner_date) do nothing;
