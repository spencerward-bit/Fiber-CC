-- Recorded in production as tighten_user_settings_grants.
-- TRUNCATE bypasses row level security, so anon and authenticated must not hold it.
-- Signed-in users still select, insert, and update their own row through the existing policies.

revoke all on table public.user_settings from anon;
revoke truncate, delete, references, trigger on table public.user_settings from authenticated;
grant select, insert, update on table public.user_settings to authenticated;
