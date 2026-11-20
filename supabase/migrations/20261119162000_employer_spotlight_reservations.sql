-- PLANETAI exclusive Employer Spotlight queue.
-- This migration is intentionally committed to the feature branch only.
-- It is NOT applied to the shared Supabase project by this change.

-- Supabase Cron runs the queue processor inside Postgres without exposing a
-- service key or depending on an externally managed scheduler.
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.employer_spotlight_reservations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.job_submissions(id) on delete restrict,
  employer_account_id uuid not null references public.employer_accounts(id) on delete restrict,
  slot_start date not null,
  slot_end date not null,
  status text not null default 'payment_pending'
    check (status in ('payment_pending', 'scheduled', 'active', 'payment_review', 'completed', 'cancelled', 'expired')),
  hold_expires_at timestamptz,
  payment_id uuid references public.job_payments(id) on delete restrict,
  amount numeric(10,2) not null default 149.00 check (amount = 149.00),
  currency char(3) not null default 'USD' check (currency = 'USD'),
  created_by uuid not null references auth.users(id) on delete restrict,
  paid_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_spotlight_slot_dates_valid check (slot_end = slot_start + 30)
);

create index if not exists employer_spotlight_reservations_employer_idx
  on public.employer_spotlight_reservations(employer_account_id, created_at desc);
create index if not exists employer_spotlight_reservations_submission_idx
  on public.employer_spotlight_reservations(submission_id, created_at desc);
create unique index if not exists employer_spotlight_one_live_reservation_per_submission
  on public.employer_spotlight_reservations(submission_id)
  where status in ('payment_pending', 'scheduled', 'active', 'payment_review');

-- A GiST exclusion constraint is the final database-level guard against
-- overlapping exclusive Spotlight slots, including concurrent reservations.
alter table public.employer_spotlight_reservations
  add constraint employer_spotlight_no_overlapping_slots
  exclude using gist (daterange(slot_start, slot_end, '[)') with &&)
  where (status in ('payment_pending', 'scheduled', 'active', 'payment_review'));

alter table public.employer_spotlight_reservations enable row level security;
revoke all on table public.employer_spotlight_reservations from public, anon, authenticated;
grant select, insert, update, delete on table public.employer_spotlight_reservations to service_role;

alter table public.job_payments
  add column if not exists spotlight_reservation_id uuid
  references public.employer_spotlight_reservations(id) on delete restrict;
create unique index if not exists job_payments_spotlight_reservation_unique
  on public.job_payments(spotlight_reservation_id)
  where spotlight_reservation_id is not null;

alter table public.jobs
  add column if not exists spotlight_active boolean not null default false,
  add column if not exists spotlight_reservation_id uuid
    references public.employer_spotlight_reservations(id) on delete set null,
  add column if not exists spotlight_started_at timestamptz,
  add column if not exists spotlight_expires_at timestamptz;

-- All queue operations serialize on one transaction-scoped lock. Expired
-- unpaid holds are released before the next contiguous 30-day slot is found.
create or replace function private.next_employer_spotlight_slot()
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate date := (timezone('UTC', now()))::date + 1;
  v_attempt integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('planetai_employer_spotlight_queue'));

  update public.employer_spotlight_reservations as r
  set status = 'expired', updated_at = now()
  where r.status = 'payment_pending'
    and r.hold_expires_at is not null
    and r.hold_expires_at <= now();

  loop
    if not exists (
      select 1
      from public.employer_spotlight_reservations r
      where r.status in ('payment_pending', 'scheduled', 'active', 'payment_review')
        and daterange(r.slot_start, r.slot_end, '[)')
            && daterange(v_candidate, v_candidate + 30, '[)')
    ) then
      return v_candidate;
    end if;

    v_candidate := v_candidate + 1;
    v_attempt := v_attempt + 1;
    if v_attempt > 3650 then
      raise exception 'No Spotlight slot is available in the next ten years'
        using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create or replace function private.reserve_next_employer_spotlight_slot(
  p_submission_id uuid,
  p_employer_account_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  slot_start date,
  slot_end date,
  status text,
  hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.job_submissions%rowtype;
  v_existing public.employer_spotlight_reservations%rowtype;
  v_start date;
  v_created public.employer_spotlight_reservations%rowtype;
begin
  if p_submission_id is null or p_employer_account_id is null or p_user_id is null then
    raise exception 'A valid submission, employer account and user are required'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('planetai_employer_spotlight_queue'));

  update public.employer_spotlight_reservations as r
  set status = 'expired', updated_at = now()
  where r.status = 'payment_pending'
    and r.hold_expires_at is not null
    and r.hold_expires_at <= now();

  select s.* into v_submission
  from public.job_submissions s
  where s.id = p_submission_id
    and s.employer_account_id = p_employer_account_id
    and s.package_tier = 'spotlight'
    and s.status = 'approved_awaiting_payment';

  if not found then
    raise exception 'Spotlight reservation requires an approved Spotlight submission'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.employer_members m
    where m.employer_account_id = p_employer_account_id
      and m.user_id = p_user_id
      and m.member_role in ('owner', 'admin')
  ) then
    raise exception 'Employer owner or administrator access is required'
      using errcode = '42501';
  end if;

  select r.* into v_existing
  from public.employer_spotlight_reservations r
  where r.submission_id = p_submission_id
    and r.status in ('payment_pending', 'scheduled', 'active', 'payment_review')
  order by r.created_at desc
  limit 1;

  if found then
    return query select v_existing.id, v_existing.slot_start, v_existing.slot_end,
      v_existing.status, v_existing.hold_expires_at;
    return;
  end if;

  v_start := private.next_employer_spotlight_slot();

  insert into public.employer_spotlight_reservations (
    submission_id, employer_account_id, slot_start, slot_end,
    status, hold_expires_at, created_by, amount, currency
  ) values (
    p_submission_id, p_employer_account_id, v_start, v_start + 30,
    'payment_pending', now() + interval '15 minutes', p_user_id, 149.00, 'USD'
  )
  returning * into v_created;

  return query select v_created.id, v_created.slot_start, v_created.slot_end,
    v_created.status, v_created.hold_expires_at;
end;
$$;

-- Called by a trusted scheduler worker. The worker must be configured before
-- the $149 tier can be enabled. No browser role can invoke these functions.
create or replace function private.process_employer_spotlight_queue()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_today date := (timezone('UTC', now()))::date;
begin
  perform pg_advisory_xact_lock(hashtext('planetai_employer_spotlight_queue'));

  update public.employer_spotlight_reservations r
  set status = 'completed', completed_at = now(), updated_at = now()
  where r.status = 'active'
    and r.slot_end <= v_today;

  update public.jobs j
  set spotlight_active = false,
      spotlight_expires_at = now(),
      updated_at = now()
  where j.spotlight_active = true
    and exists (
      select 1 from public.employer_spotlight_reservations r
      where r.id = j.spotlight_reservation_id
        and r.status = 'completed'
    );

  with due as (
    select r.id, r.submission_id, r.slot_start, r.slot_end
    from public.employer_spotlight_reservations r
    join public.jobs j on j.submission_id = r.submission_id
    where r.status = 'scheduled'
      and r.slot_start <= v_today
      and r.slot_end > v_today
    for update of r
  ),
  activated as (
    update public.employer_spotlight_reservations r
    set status = 'active', activated_at = now(), updated_at = now()
    from due d
    where r.id = d.id
    returning r.id, r.submission_id, d.slot_start, d.slot_end
  )
  update public.jobs j
  set spotlight_active = true,
      spotlight_reservation_id = a.id,
      spotlight_started_at = a.slot_start::timestamptz,
      spotlight_expires_at = a.slot_end::timestamptz,
      updated_at = now()
  from activated a
  where j.submission_id = a.submission_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.next_employer_spotlight_slot() from public, anon, authenticated;
revoke all on function private.reserve_next_employer_spotlight_slot(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.process_employer_spotlight_queue() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.next_employer_spotlight_slot() to service_role;
grant execute on function private.reserve_next_employer_spotlight_slot(uuid, uuid, uuid) to service_role;
grant execute on function private.process_employer_spotlight_queue() to service_role;


-- PostgREST exposes the public schema to service-role clients. These narrow
-- wrappers keep the implementation private while allowing trusted Edge
-- Functions and the scheduled worker to invoke it through the supported API.
create or replace function public.next_employer_spotlight_slot()
returns date
language sql
security definer
set search_path = ''
as $$
  select private.next_employer_spotlight_slot();
$$;

create or replace function public.reserve_next_employer_spotlight_slot(
  p_submission_id uuid,
  p_employer_account_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  slot_start date,
  slot_end date,
  status text,
  hold_expires_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select * from private.reserve_next_employer_spotlight_slot(
    p_submission_id, p_employer_account_id, p_user_id
  );
$$;

create or replace function public.process_employer_spotlight_queue()
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.process_employer_spotlight_queue();
$$;

revoke all on function public.next_employer_spotlight_slot() from public, anon, authenticated;
revoke all on function public.reserve_next_employer_spotlight_slot(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.process_employer_spotlight_queue() from public, anon, authenticated;
grant execute on function public.next_employer_spotlight_slot() to service_role;
grant execute on function public.reserve_next_employer_spotlight_slot(uuid, uuid, uuid) to service_role;
grant execute on function public.process_employer_spotlight_queue() to service_role;


-- Finalize a verified PayPal capture into a scheduled placement. The Edge
-- Function calls this only after PayPal's order has been fetched and verified.
-- The hold must still be valid; late captures are deliberately sent to manual
-- reconciliation rather than silently stealing a later employer's slot.
create or replace function private.confirm_employer_spotlight_payment(
  p_reservation_id uuid,
  p_payment_id uuid,
  p_capture_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.employer_spotlight_reservations%rowtype;
  v_payment public.job_payments%rowtype;
begin
  if p_reservation_id is null or p_payment_id is null or coalesce(length(trim(p_capture_id)), 0) = 0 then
    raise exception 'A reservation, payment and verified capture are required'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('planetai_employer_spotlight_queue'));

  select * into v_reservation
  from public.employer_spotlight_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Spotlight reservation not found' using errcode = 'P0002';
  end if;

  if v_reservation.status = 'scheduled' and v_reservation.payment_id = p_payment_id then
    return true;
  end if;

  if v_reservation.status <> 'payment_pending'
     or v_reservation.hold_expires_at is null
     or v_reservation.hold_expires_at <= now() then
    raise exception 'Spotlight hold expired; payment requires manual reconciliation'
      using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.job_payments
  where id = p_payment_id
    and submission_id = v_reservation.submission_id
    and spotlight_reservation_id = v_reservation.id
  for update;

  if not found
     or v_payment.provider <> 'paypal'
     or v_payment.status <> 'completed'
     or v_payment.provider_capture_id <> p_capture_id
     or v_payment.amount <> 149.00
     or btrim(v_payment.currency) <> 'USD' then
    raise exception 'Verified payment does not match the Spotlight reservation'
      using errcode = '23514';
  end if;

  update public.employer_spotlight_reservations
  set status = 'scheduled',
      payment_id = p_payment_id,
      paid_at = coalesce(paid_at, now()),
      hold_expires_at = null,
      updated_at = now()
  where id = v_reservation.id;

  return true;
end;
$$;

create or replace function public.confirm_employer_spotlight_payment(
  p_reservation_id uuid,
  p_payment_id uuid,
  p_capture_id text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.confirm_employer_spotlight_payment(
    p_reservation_id, p_payment_id, p_capture_id
  );
$$;

revoke all on function private.confirm_employer_spotlight_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function private.confirm_employer_spotlight_payment(uuid, uuid, text) to service_role;
revoke all on function public.confirm_employer_spotlight_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_employer_spotlight_payment(uuid, uuid, text) to service_role;


-- Activate scheduled Spotlight reservations and expire placements every minute.
-- This is database-internal and does not expose a callable public endpoint.
select cron.schedule(
  'planetai-employer-spotlight-queue',
  '* * * * *',
  'select private.process_employer_spotlight_queue();'
);
