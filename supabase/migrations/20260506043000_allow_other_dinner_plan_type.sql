alter table public.dinner_slots
  drop constraint if exists dinner_slots_plan_type_check;

alter table public.dinner_slots
  add constraint dinner_slots_plan_type_check
  check (plan_type in ('reservation', 'cook', 'undecided', 'other'));
