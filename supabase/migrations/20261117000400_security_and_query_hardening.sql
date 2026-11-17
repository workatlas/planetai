-- PLANETAI security and query-plan hardening
-- Keep the platform-owned RLS event trigger operational, but prevent API callers
-- from invoking its SECURITY DEFINER trigger function as an RPC.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Make the shared timestamp trigger independent of caller-controlled search_path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Cover foreign keys identified by the Supabase performance advisor.
create index if not exists employer_billing_events_subscription_idx
  on public.employer_billing_events(subscription_id)
  where subscription_id is not null;

create index if not exists employer_subscriptions_plan_idx
  on public.employer_subscriptions(plan_id);

create index if not exists job_submissions_reviewed_by_idx
  on public.job_submissions(reviewed_by)
  where reviewed_by is not null;

create index if not exists marketplace_audit_events_actor_idx
  on public.marketplace_audit_events(actor_user_id)
  where actor_user_id is not null;
