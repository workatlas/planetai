-- Allow the admin-moderation Edge Function's service-role client to verify
-- membership in the private admin roster. No browser-facing role receives access.
grant select on table public.admin_users to service_role;
