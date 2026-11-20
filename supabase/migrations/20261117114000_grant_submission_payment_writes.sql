-- Allow trusted Edge Functions using service_role to create submissions
-- and record/update payment ledger entries. No client-role privileges are added.
grant insert on table public.job_submissions to service_role;
grant insert, update on table public.job_payments to service_role;
