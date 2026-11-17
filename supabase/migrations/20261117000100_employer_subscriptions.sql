-- PLANETAI employer workspace and subscription foundation
-- This migration adds employer-owned workspace records without changing the
-- existing public job feed or the current submission-review workflow.
-- All privileged writes and billing-provider updates must use trusted server
-- functions. Never expose the Supabase service-role key in browser code.

create table if not exists public.employer_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  company_name text not null,
  company_website text,
  company_logo_url text,
  company_description text,
  company_location text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employer_accounts_owner_idx
  on public.employer_accounts(owner_user_id);

create table if not exists public.employer_members (
  id uuid primary key default gen_random_uuid(),
  employer_account_id uuid not null references public.employer_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'owner'
    check (member_role in ('owner', 'admin', 'recruiter', 'viewer')),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employer_account_id, user_id)
);

create index if not exists employer_members_user_idx
  on public.employer_members(user_id, employer_account_id);

create or replace function public.is_employer_member(account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employer_members m
    where m.employer_account_id = account_id
      and m.user_id = auth.uid()
  );
$$;

create table if not exists public.employer_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  display_name text not null,
  description text,
  billing_interval text not null
    check (billing_interval in ('month', 'year', 'one_time')),
  amount_minor integer not null default 0 check (amount_minor >= 0),
  currency char(3) not null default 'USD',
  job_post_limit integer,
  featured_listing_limit integer,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employer_account_id uuid not null references public.employer_accounts(id) on delete cascade,
  plan_id uuid not null references public.employer_subscription_plans(id) on delete restrict,
  billing_provider text not null
    check (billing_provider in ('paypal', 'stripe', 'manual')),
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employer_subscriptions_account_idx
  on public.employer_subscriptions(employer_account_id, created_at desc);
create index if not exists employer_subscriptions_status_idx
  on public.employer_subscriptions(status, current_period_end);

create table if not exists public.employer_billing_events (
  id uuid primary key default gen_random_uuid(),
  employer_account_id uuid not null references public.employer_accounts(id) on delete cascade,
  subscription_id uuid references public.employer_subscriptions(id) on delete set null,
  billing_provider text not null
    check (billing_provider in ('paypal', 'stripe', 'manual')),
  provider_event_id text unique,
  event_type text not null,
  event_status text not null default 'received'
    check (event_status in ('received', 'processed', 'ignored', 'failed')),
  amount_minor integer check (amount_minor is null or amount_minor >= 0),
  currency char(3),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists employer_billing_events_account_idx
  on public.employer_billing_events(employer_account_id, created_at desc);

-- Link employer workspaces to existing listing/submission records. Nullable
-- columns preserve all current records and the public job feed.
alter table public.job_submissions
  add column if not exists employer_account_id uuid
  references public.employer_accounts(id) on delete set null;

alter table public.jobs
  add column if not exists employer_account_id uuid
  references public.employer_accounts(id) on delete set null;

create index if not exists job_submissions_employer_account_idx
  on public.job_submissions(employer_account_id, submitted_at desc);
create index if not exists jobs_employer_account_idx
  on public.jobs(employer_account_id, published_at desc);

drop trigger if exists employer_accounts_set_updated_at on public.employer_accounts;
create trigger employer_accounts_set_updated_at
before update on public.employer_accounts
for each row execute function public.set_updated_at();

drop trigger if exists employer_subscription_plans_set_updated_at on public.employer_subscription_plans;
create trigger employer_subscription_plans_set_updated_at
before update on public.employer_subscription_plans
for each row execute function public.set_updated_at();

drop trigger if exists employer_subscriptions_set_updated_at on public.employer_subscriptions;
create trigger employer_subscriptions_set_updated_at
before update on public.employer_subscriptions
for each row execute function public.set_updated_at();

alter table public.employer_accounts enable row level security;
alter table public.employer_members enable row level security;
alter table public.employer_subscription_plans enable row level security;
alter table public.employer_subscriptions enable row level security;
alter table public.employer_billing_events enable row level security;

-- Employers can read their own workspace and membership roster. No direct
-- browser writes are granted; onboarding/invites are handled by server code.
drop policy if exists "Employer members can read their account" on public.employer_accounts;
create policy "Employer members can read their account"
  on public.employer_accounts for select to authenticated
  using (public.is_employer_member(id) or public.is_planetai_admin());

drop policy if exists "Employer members can read account membership" on public.employer_members;
create policy "Employer members can read account membership"
  on public.employer_members for select to authenticated
  using (public.is_employer_member(employer_account_id) or public.is_planetai_admin());

drop policy if exists "Public can read active employer plans" on public.employer_subscription_plans;
create policy "Public can read active employer plans"
  on public.employer_subscription_plans for select to anon, authenticated
  using (active = true);

drop policy if exists "Employer members can read their subscriptions" on public.employer_subscriptions;
create policy "Employer members can read their subscriptions"
  on public.employer_subscriptions for select to authenticated
  using (public.is_employer_member(employer_account_id) or public.is_planetai_admin());

drop policy if exists "Employer members can read their billing events" on public.employer_billing_events;
create policy "Employer members can read their billing events"
  on public.employer_billing_events for select to authenticated
  using (public.is_employer_member(employer_account_id) or public.is_planetai_admin());

drop policy if exists "Employer members can read their submitted jobs" on public.job_submissions;
create policy "Employer members can read their submitted jobs"
  on public.job_submissions for select to authenticated
  using (
    (employer_account_id is not null and public.is_employer_member(employer_account_id))
    or public.is_planetai_admin()
  );

drop policy if exists "Employer members can read their published jobs" on public.jobs;
create policy "Employer members can read their published jobs"
  on public.jobs for select to authenticated
  using (
    (employer_account_id is not null and public.is_employer_member(employer_account_id))
    or public.is_planetai_admin()
  );

-- The membership helper is only exposed to authenticated users. It is
-- SECURITY DEFINER so RLS can safely query the membership table.
revoke all on function public.is_employer_member(uuid) from public;
revoke all on function public.is_employer_member(uuid) from anon;
grant execute on function public.is_employer_member(uuid) to authenticated;

-- No client INSERT/UPDATE/DELETE policies are created for employer accounts,
-- memberships, subscriptions or billing events. Trusted server functions
-- must validate ownership, plan limits and signed provider webhooks.
