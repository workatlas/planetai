-- Remove the temporary public RPC onboarding endpoint.
-- Workspace creation is now handled by the authenticated employer-workspace Edge Function.
drop function if exists public.create_employer_workspace(text);
