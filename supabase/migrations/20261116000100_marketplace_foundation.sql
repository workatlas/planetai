-- PLANETAI marketplace foundation
-- Apply this migration to a new Supabase project before enabling public submissions.
-- All writes to private workflow tables must go through trusted server-side functions
-- using the Supabase service-role key. Never expose that key in browser code.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_planetai_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

create table if not exists public.job_submissions (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  employer_name text not null,
  employer_email text not null,
  company_name text not null,
  company_website text,
  company_logo_url text,
  job_title text not null,
  category text not null,
  employment_type text not null,
  location text not null,
  remote_policy text not null default 'Remote',
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency char(3) not null default 'USD',
  pay_period text,
  description text not null,
  requirements text[] not null default '{}',
  tags text[] not null default '{}',
  apply_url text not null,
  package_tier text not null default 'standard'
    check (package_tier in ('standard', 'featured', 'spotlight')),
  verified_employer_addon boolean not null default false,
  status text not null default 'email_verification_pending'
    check (status in (
      'email_verification_pending', 'pending_review', 'rejected',
      'approved_awaiting_payment', 'ready_to_publish', 'published', 'expired'
    )),
  email_verified_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_submissions_status_submitted_idx
  on public.job_submissions(status, submitted_at desc);
create index if not exists job_submissions_employer_email_idx
  on public.job_submissions(lower(employer_email));

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid unique references public.job_submissions(id) on delete set null,
  slug text not null unique,
  job_title text not null,
  company_name text not null,
  company_website text,
  company_logo_url text,
  category text not null,
  employment_type text not null,
  location text not null,
  remote_policy text not null,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency char(3) not null default 'USD',
  pay_period text,
  description text not null,
  requirements text[] not null default '{}',
  tags text[] not null default '{}',
  apply_url text not null,
  featured boolean not null default false,
  verified_employer boolean not null default false,
  status text not null default 'published'
    check (status in ('published', 'expired', 'withdrawn')),
  published_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_public_listing_idx
  on public.jobs(status, expires_at, published_at desc);

create table if not exists public.job_payments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.job_submissions(id) on delete cascade,
  provider text not null default 'paypal',
  provider_order_id text,
  provider_capture_id text unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_payments_submission_idx
  on public.job_payments(submission_id, created_at desc);

create table if not exists public.marketplace_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  submission_id uuid references public.job_submissions(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_audit_submission_idx
  on public.marketplace_audit_events(submission_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_submissions_set_updated_at on public.job_submissions;
create trigger job_submissions_set_updated_at
before update on public.job_submissions
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists job_payments_set_updated_at on public.job_payments;
create trigger job_payments_set_updated_at
before update on public.job_payments
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.job_submissions enable row level security;
alter table public.jobs enable row level security;
alter table public.job_payments enable row level security;
alter table public.marketplace_audit_events enable row level security;

-- Only authenticated platform administrators can inspect admin/workflow records.
drop policy if exists "Admins can read admin roster" on public.admin_users;
create policy "Admins can read admin roster"
  on public.admin_users for select to authenticated
  using (public.is_planetai_admin());

drop policy if exists "Admins can read submissions" on public.job_submissions;
create policy "Admins can read submissions"
  on public.job_submissions for select to authenticated
  using (public.is_planetai_admin());

drop policy if exists "Admins can update submissions" on public.job_submissions;
create policy "Admins can update submissions"
  on public.job_submissions for update to authenticated
  using (public.is_planetai_admin())
  with check (public.is_planetai_admin());

drop policy if exists "Public can read active published jobs" on public.jobs;
create policy "Public can read active published jobs"
  on public.jobs for select to anon, authenticated
  using (status = 'published' and expires_at > now());

drop policy if exists "Admins can manage jobs" on public.jobs;
create policy "Admins can manage jobs"
  on public.jobs for all to authenticated
  using (public.is_planetai_admin())
  with check (public.is_planetai_admin());

drop policy if exists "Admins can read payments" on public.job_payments;
create policy "Admins can read payments"
  on public.job_payments for select to authenticated
  using (public.is_planetai_admin());

drop policy if exists "Admins can read audit events" on public.marketplace_audit_events;
create policy "Admins can read audit events"
  on public.marketplace_audit_events for select to authenticated
  using (public.is_planetai_admin());

-- Intentionally no anon/authenticated INSERT policies for submissions or payments.
-- Public submissions and payment updates must be validated by trusted server functions.
