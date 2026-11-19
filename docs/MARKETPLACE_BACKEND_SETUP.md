# PLANETAI Marketplace Backend

## Current status

The production site remains untouched. Development work is isolated on `planetai-premium-refresh` in draft PR #1.

- The Supabase project contains the marketplace schema, employer workspace data, job submission/payment tables, and the security migrations listed below.
- The five original Edge Functions exist in Supabase. A sixth PayPal webhook function has been added on this branch but is not deployed. All latest hardening, webhook, and payment-recovery code on this branch remains **undeployed**.
- PayPal is configured for Sandbox. No live charges have been enabled.
- The employer registration, profile, listing, moderation, and payment screens are implemented in the frontend. A complete real-account browser test is still required before release.

## Supabase project

- Project ref: `lfccdqvwpfohfuhlijso`
- Region: `ap-northeast-1`
- Project URL: `https://lfccdqvwpfohfuhlijso.supabase.co`

The browser client uses only the publishable key. Never put a Supabase secret/service-role key or PayPal credential in a `VITE_*` variable or commit one to Git.

## Applied database migrations

The shared Supabase project currently records these migrations:

- Marketplace foundation and submission security
- Employer subscriptions and workspace onboarding
- Security/query hardening and server-side onboarding grants
- Employer profile and branding storage
- Job-seeker profiles
- PayPal order/capture uniqueness
- Admin moderation and payment-write grants
- Public read access to active published jobs (still constrained by RLS)
- Unique employer account owner constraint
- Atomic Edge Function rate-limit storage and RPC

The employer account owner index was applied after verifying there were no duplicate owner records. The rate-limit RPC was tested for allowed and rejected requests, and its private table is accessible only to the service role.

## Edge Function deployment boundary

The five deployed functions are `employer-workspace`, `employer-profile`, `job-submission`, `admin-moderation`, and `paypal-listing-checkout`. The branch also contains `paypal-webhook`; it is not deployed.

The latest branch versions include:
- Exact-origin CORS allowlisting, with `APP_ALLOWED_ORIGINS` for future approved domains
- Per-user rate limits backed by the atomic database RPC
- A 32 KB job-submission body limit and explicit authentication checks
- Concurrent employer workspace setup recovery
- Payment order/capture recovery and publication retry logic

These versions remain branch-only. Do not deploy or merge them until the preview journey and Sandbox payment test pass. When a custom domain is selected, add its exact origin to `APP_ALLOWED_ORIGINS` before deploying the functions.

## Authentication and authorization

Employer route: `/?experience=employer-auth`  
Employer password recovery route: `/?experience=employer-password-reset`

1. Employer signs up and confirms their email. Email confirmations must be enabled in Supabase Auth.
2. Password recovery sends the user to a dedicated reset route. The new-password form is locked until Supabase emits a valid `PASSWORD_RECOVERY` event/session; a direct visit or expired/reused link cannot unlock it.
3. After sign-in, the authenticated workspace function validates the live Auth user record and requires `email_confirmed_at` before proceeding.
4. The function creates or loads the employer account and ensures owner membership.
5. The employer can edit the company profile, upload branding, and manage submitted listings. Employer profile and job-submission endpoints also reject unconfirmed email accounts.

Authorization rules:
- User-editable Auth metadata is used only for initial display/default values, never as proof of employer or admin authority.
- Job submission requires an authenticated employer membership with an allowed role.
- Employer profile writes are scoped to the authenticated workspace owner.
- Admin moderation checks the verified user ID against the protected `admin_users` roster on the server.
- The admin roster has no browser write privileges. Admin actions are not authorized merely because a user can sign in.

## Employer branding storage

The `employer-branding` bucket is public-read because logos and cover images are intended to appear on public employer/job pages. Anyone with an asset URL can read those images.

Upload and delete operations are restricted by Storage RLS to authenticated users whose first object-path folder matches their own Auth user ID. The bucket has a 5 MB limit and permits JPEG, PNG, and WebP. The current frontend uses unique filenames and `upsert: false`, so an UPDATE policy is not required for its upload path.

Do not store resumes, identity documents, private candidate data, or other sensitive files in this public bucket.

## Job submission and moderation

1. Employer submits through the frontend.
2. The Edge Function validates the authenticated membership, required fields, HTTPS links, salary bounds, and package tier.
3. The server creates a `pending_review` submission and records an audit event.
4. Admin moderation approves or rejects the submission.
5. Standard listings publish after approval. Featured listings move to `approved_awaiting_payment` and remain unpublished until the server verifies payment.
6. Spotlight + Marquee remains unavailable until that product placement is implemented and tested.

The public jobs table exposes only published, unexpired listings through its RLS policy. Employer contact details, moderation notes, and payment records are not part of the public job record.

## Exclusive Employer Spotlight scheduler (feature branch only)

The feature branch now includes a proposed `employer_spotlight_reservations` ledger and `employer-spotlight-scheduler` Edge Function. The migration uses a database exclusion constraint on 30-day date ranges to prevent overlapping live holds/reservations, a transaction-scoped advisory lock to allocate the next available slot, and a 15-minute hold for unpaid reservations. Only a confirmed employer owner/admin can request a slot for an approved Spotlight submission. Reservation rows are not readable or writable by browser roles.

A database worker function, `private.process_employer_spotlight_queue()`, activates due paid reservations and expires completed placements. It must be invoked by a trusted scheduled worker. That worker is not configured. The reservation migration is not applied to Supabase, the Edge Function is not deployed, the employer booking UI and reservation-to-PayPal checkout association are not complete, and the $149 tier remains disabled. This is intentionally not presented as a working booking flow yet.

The intended commercial rule is payment at reservation, with the 30-day placement period beginning on the scheduled start date. Existing Platform Opportunity Guides remain a separate multi-card curated section; paid Employer Spotlight is a separate exclusive placement.

## PayPal listing payment recovery

- PayPal remains in Sandbox.
- Featured Boost is a fixed `$49.00 USD` one-time payment for 30 days.
- Payment can begin only after moderation approval.
- The server checks employer membership and owner/admin role, creates the order, and records a pending ledger row.
- Order creation and capture use stable `PayPal-Request-Id` values.
- Before capturing, the server retrieves the order. If PayPal already reports it as completed, the server verifies the listing `custom_id`, completed capture, amount, and USD currency rather than charging again.
- If a capture succeeds but the ledger write or publication step is interrupted, a subsequent employer retry can reconcile the completed PayPal order, confirm the ledger, and safely retry publication.
- Unique provider order/capture IDs and the unique job submission link prevent duplicate payment records and duplicate published jobs.

Still required before live payments:
- Sandbox webhook registration, delivery verification, and end-to-end retry/deduplication testing for the new webhook endpoint
- Refund, reversal, and dispute handling (the new listener currently processes completed captures only; other signed event types are acknowledged without changing payment state)
- A monitored operational process for unmatched provider events and payments that cannot be reconciled automatically
- A monitored operational process for payments that cannot be reconciled automatically
- Full Sandbox test using a real test employer account and PayPal buyer account

Never treat a browser redirect or success query parameter as proof of payment. Never apply paid visibility without server-side verification.

## PayPal webhook implementation on the feature branch

The new `paypal-webhook` function verifies the PayPal transmission signature through PayPal's official verify-webhook-signature API using the configured `PAYPAL_WEBHOOK_ID`. It accepts only `PAYMENT.CAPTURE.COMPLETED` for automatic payment reconciliation, fetches the order directly from PayPal, validates the submission reference, exact USD amount and capture ID, then idempotently updates the existing payment ledger and publishes the already-approved listing. Event IDs are deduplicated in `employer_billing_events.provider_event_id`.

Before deploying, create a webhook in the matching PayPal Sandbox app, subscribe it to `PAYMENT.CAPTURE.COMPLETED`, set `PAYPAL_WEBHOOK_ID` as an Edge Function secret, and deploy this endpoint with JWT verification disabled **for this function only**. Keep PayPal in Sandbox. This branch change does not create or configure a PayPal webhook, set secrets, or deploy any function. Refunds, reversals, denials and disputes are recorded for manual reconciliation. Affected Spotlight placements are paused and their reservation slots remain blocked until an administrator resolves the case.

## Rate limiting and request protection

The current branch applies these per-user limits through the atomic database RPC:

- Job submissions: 5 per 15 minutes
- Employer workspace: 60 per minute
- Employer profile: 30 per minute
- PayPal checkout: 12 per 10 minutes
- Admin moderation: 120 per minute

The job submission endpoint also enforces a 32 KB request-body limit. If the rate-limit database call fails, the branch functions fail closed.

## Required environment configuration

Supabase Edge Functions provide the Supabase project credentials at runtime. PayPal Sandbox secrets are configured in the Supabase project:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENVIRONMENT=sandbox`

The shared CORS helper includes the existing Netlify production/preview origins and supports a comma-separated `APP_ALLOWED_ORIGINS` secret for future exact origins. Do not use wildcard origins.

## Release checklist

Before any production release:

1. Inspect Supabase Auth URL Configuration: keep Site URL at the current production origin until domain approval; allow the production and exact deploy-preview redirect origins; enable email confirmations; verify confirmation/recovery templates use the redirect target correctly. See `docs/EMPLOYER_PAYMENT_TEST_PLAN.md`.
2. Record that Supabase leaked-password protection is Pro-only and unavailable on the current Free plan. Set the strongest available Email-provider password rules (12+ characters and mixed character classes) without purchasing an upgrade unless separately approved.
3. Confirm the final approved domain and update Auth redirect URLs, CORS origins, canonical metadata, and sitemap.
4. Deploy the branch Edge Functions only to the approved test environment, then verify CORS, authentication, rate limits, and all endpoint responses.
5. Complete the Auth tests and employer/payment scenarios in `docs/EMPLOYER_PAYMENT_TEST_PLAN.md`.
6. Complete the real employer journey: signup/email confirmation → workspace creation → profile edit and branding upload → job submission → admin approval → Sandbox checkout → capture verification → publication → public listing visibility.
7. Test interruption/retry cases: duplicate create-order, capture response lost, ledger update failure, publication failure, and repeat publication.
8. Verify unauthorized users cannot access another employer's workspace, files, submissions, or admin actions.
9. Validate the exclusive Spotlight implementation: apply the branch migration only in the approved test environment, verify the pg_cron job and cron.job_run_details, run S13–S26, confirm reservation-to-PayPal association and late-capture reconciliation, then complete refund/dispute procedures before enabling the $149 tier.
10. Re-run database security/performance advisors and confirm CI type-check and frontend build pass on the final PR head.
11. Only then request explicit approval to merge and deploy.

The current source review and CI checks do not replace the real-account browser and PayPal Sandbox tests. Keep production and live payments unchanged until those tests pass.


## Exclusive Spotlight booking flow (feature branch)

- Employers can reserve only after moderation approval and only as the owner/admin of the listing's exact employer account.
- The employer booking interface requests the next available date, creates a 15-minute hold, then sends the reservation ID to the PayPal checkout Edge Function.
- Checkout reads the reservation from the database and enforces $149.00 USD. It does not trust a client-supplied price.
- The payment row stores spotlight_reservation_id. A verified PayPal capture is finalized through a service-role-only RPC that checks the exact reservation, payment row, amount, currency, capture ID, and hold expiry.
- A late capture is not allowed to take a slot that has been reallocated. It is left for manual reconciliation and no Spotlight activation is granted automatically.
- Paid Spotlight listings are published without featured=true; the database queue processor activates the Spotlight flag only on the scheduled start date.
- The migration enables pg_cron and schedules private.process_employer_spotlight_queue() once per minute. The function is private and does not expose a service key or public endpoint.
- The migration, scheduler, checkout integration, webhook integration, and employer UI are branch-only. No migration has been applied and no Edge Function has been deployed.


## PayPal dispute and reversal handling

The webhook subscribes to capture refund/reversal/denial events and dispute created/updated/resolved events. Dispute events are matched using the seller-side transaction ID to the recorded PayPal capture. If the payment belongs to a Spotlight reservation, the reservation moves to payment_review, an active placement is paused, and the reserved date range remains blocked. A dispute resolution does not automatically reactivate or reallocate the slot; an administrator must reconcile the case.
