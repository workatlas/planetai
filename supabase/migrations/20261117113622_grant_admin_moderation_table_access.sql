-- Grant only the operations used by the admin-moderation Edge Function.
-- Browser-facing roles receive no additional access; RLS remains enabled.
grant select, update on table public.job_submissions to service_role;
grant select on table public.job_payments to service_role;
grant select, insert on table public.jobs to service_role;
grant insert on table public.marketplace_audit_events to service_role;
