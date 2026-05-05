-- Guardrails for the self-serve magic-link profile claim flow.
-- Keep existing prepopulated trip_guests rows; only prevent duplicate claims.

create unique index if not exists trip_guests_email_lower_idx
on public.trip_guests (lower(email))
where email is not null;

create unique index if not exists trip_guests_auth_user_id_idx
on public.trip_guests (auth_user_id)
where auth_user_id is not null;
