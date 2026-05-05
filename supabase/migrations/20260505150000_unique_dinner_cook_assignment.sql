-- One dinner cook/co-lead assignment per guest.
-- This protects against double-booking a person if two people submit at once.
create unique index if not exists dinner_signups_one_cook_per_guest
  on public.dinner_signups (guest_name)
  where role = 'cook';
