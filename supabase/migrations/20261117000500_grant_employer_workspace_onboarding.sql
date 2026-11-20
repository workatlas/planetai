-- Allow the employer-workspace Edge Function's service-role client
-- to perform only the onboarding operations it needs.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT ON TABLE public.employer_accounts TO service_role;
GRANT INSERT ON TABLE public.employer_members TO service_role;
