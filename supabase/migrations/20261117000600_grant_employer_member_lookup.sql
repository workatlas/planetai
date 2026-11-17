-- The owner-membership upsert uses PostgREST's INSERT ... ON CONFLICT path,
-- which also requires SELECT on the target table.
GRANT SELECT, INSERT ON TABLE public.employer_members TO service_role;
