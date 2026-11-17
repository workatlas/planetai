-- Enforce one ledger row per PayPal order. Pending attempts can coexist
-- only when they have distinct provider order IDs.
create unique index if not exists job_payments_provider_order_id_unique
  on public.job_payments(provider_order_id)
  where provider_order_id is not null;
