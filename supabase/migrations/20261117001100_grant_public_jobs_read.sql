-- The public jobs table already has a restrictive SELECT policy for active,
-- published listings. Grant the API roles table-level SELECT so that policy
-- can be evaluated by the Supabase Data API.
grant select on table public.jobs to anon, authenticated;
