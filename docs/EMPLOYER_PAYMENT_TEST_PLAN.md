# PLANETAI Employer and Payment End-to-End Test Plan

## Test boundary

Run this plan only against the approved Netlify Deploy Preview and PayPal Sandbox. Do not use a real card, live PayPal account, production credentials, or production data. The latest branch Edge Functions are not deployed, so the backend portions below are **blocked until a separately approved test deployment**. No production deployment is authorized by this document.

## 1. Supabase Auth dashboard configuration

Open Supabase Dashboard → Authentication → URL Configuration for project `lfccdqvwpfohfuhlijso`.

Before testing, inspect and record the actual values; do not assume the dashboard matches the application source.

- Site URL: keep the current production origin `https://planetai-global.netlify.app` until the final custom domain is selected and approved.
- Additional Redirect URLs must include the current production origin and the exact preview origin:
  - `https://planetai-global.netlify.app/**`
  - `https://deploy-preview-1--planetai-global.netlify.app/**`
- Add localhost only if a local development server is actually used; do not add broad wildcard domains.
- After a final custom domain is purchased and approved, change Site URL and add its exact HTTPS origin/path. Remove obsolete preview entries when no longer required.
- Confirm Authentication → Providers → Email has email/password sign-in enabled and email confirmations enabled.
- Review the confirmation and recovery email templates. If they use a custom `redirectTo`, ensure the confirmation/recovery link uses Supabase's `{{ .RedirectTo }}` variable where required.
- Confirm SMTP delivery and sender identity before relying on production email. Do not configure paid SMTP or change sender DNS without approval.
- Review OTP expiry and Auth email rate limits. Keep recovery links short-lived and single-use.
- Leaked-password protection is a Supabase Pro-plan feature and is not available on this project's Free plan. Do not keep searching for a missing toggle or upgrade without approval. In Authentication → Sign In / Providers → Email, set the strongest available minimum password length (recommended 12+) and require lowercase, uppercase, digits and symbols. Record that the Auth-level HaveIBeenPwned check remains unavailable on Free.

Dashboard settings are not changed by this source-code branch. A project owner must inspect and apply the dashboard values, then record a screenshot or change log before sign-off.

## 2. Auth functional tests

Use a dedicated test employer mailbox that the tester controls. Never use a real employer's account.

| ID | Test | Expected result |
|---|---|---|
| A1 | Sign up with a new email, valid password and company name | Confirmation email sent; no employer workspace is created before email confirmation |
| A2 | Open confirmation link on the preview origin | Redirect returns to employer auth; confirmed user can sign in |
| A3 | Sign in with correct credentials | Auth session established and employer workspace loads |
| A4 | Sign in with wrong password | Generic safe error; no session |
| A5 | Request password reset | Neutral response that does not disclose whether the email exists |
| A6 | Open valid recovery link | Dedicated employer reset route receives Supabase PASSWORD_RECOVERY event and unlocks reset form |
| A7 | Open reset route directly without recovery link | Reset form remains locked; expired/missing-link message shown |
| A8 | Reuse an already-consumed recovery link | Reset rejected; user must request a fresh link |
| A9 | Submit mismatched/short new password | Client blocks submission; server Auth policy remains authoritative |
| A10 | Update password with valid recovery session | Password updated; recovery session signed out; new password can sign in |
| A11 | Attempt employer workspace/profile/listing action before email confirmation | Server rejects with 403 |
| A12 | Sign out and revisit protected employer actions | Request rejected; no workspace data returned |

## 3. Exclusive Employer Spotlight scheduler

The Spotlight + Marquee product is a separate paid placement from the multi-card Platform Opportunity Guides section. The planned price is $149 USD for one exclusive 30-day slot. Employers pay when reserving; the 30-day placement begins on the scheduled start date. The existing $49 Featured Boost remains a different product.

The feature-branch migration adds a server-only reservation ledger, a 15-minute unpaid hold, an atomic next-slot allocator, a database exclusion constraint preventing overlapping live reservations, and a queue processor that activates/ends placements. The feature-branch Edge Function validates confirmed Auth identity, employer owner/admin membership and approved Spotlight submissions. The migration and Edge Function are not deployed; the reservation checkout flow and scheduled worker are not enabled. Therefore Spotlight remains unavailable for purchase.

Required scheduler tests before enabling the $149 tier:

| ID | Scenario | Expected result |
|---|---|---|
| S1 | Two employers reserve simultaneously | Database lock and exclusion constraint allow only one reservation per 30-day slot |
| S2 | Employer repeats reservation request | Same live reservation is returned; no duplicate slot is created |
| S3 | Unpaid 15-minute hold expires | Slot becomes available again |
| S4 | Unapproved or non-Spotlight submission requests a slot | Request rejected; no reservation created |
| S5 | Another employer submits a guessed submission ID | No listing or reservation data disclosed |
| S6 | Payment succeeds during a valid hold | Reservation becomes scheduled and stores the verified payment reference |
| S7 | Payment arrives after hold expiry or slot reassignment | No automatic placement; manual reconciliation/refund path required |
| S8 | Scheduled start date arrives | Trusted worker activates the placement and starts the 30-day period |
| S9 | Scheduled end date arrives | Trusted worker ends placement and releases the slot |
| S10 | Worker runs more than once | Activation/expiry remain idempotent |
| S11 | Worker misses a run and resumes | Due placement is reconciled without overlap or duplicate activation |
| S12 | Refund, reversal or dispute | Placement is paused/flagged according to documented operations; no silent renewal |

A trusted scheduled worker must invoke `private.process_employer_spotlight_queue()` at least every few minutes. Configure and verify that worker only after the approved test deployment. Do not enable checkout before the payment ledger, webhook, worker, refunds and end-to-end scheduler tests are complete.

## 4. Employer journey

After Auth dashboard configuration and approved preview backend deployment:

1. Create a dedicated test employer account and confirm email.
2. Sign in and create/load the private employer workspace.
3. Edit company profile and save.
4. Upload a small PNG/WebP logo to the employer's own storage folder.
5. Confirm the public logo URL renders as intended.
6. Submit a valid Free Standard listing. Verify it enters pending review and is not publicly visible.
7. As the authorized admin, approve the listing. Verify it becomes published and appears in public job discovery.
8. Submit a Featured Boost listing. Verify it remains unpublished after moderation approval until payment is confirmed.
9. Attempt checkout as a different employer. Verify authorization denies access.
10. Complete the Featured Boost checkout using PayPal Sandbox buyer credentials only.
11. Verify server-side order/capture status, exact USD amount ($49.00), submission reference, capture ID and ledger state.
12. Verify the approved listing publishes once, is visible publicly, and displays its employer-supplied pay range or “Salary not disclosed” when pay is absent/invalid.
13. Verify the employer portal reflects the same payment and publication state after refresh and a new sign-in.

## 5. Authorization and storage isolation

- Employer A cannot read, update, or delete Employer B's profile, workspace, submissions, payment records, or branding objects.
- Employer A cannot submit a listing using Employer B's submission/account identifier.
- An authenticated non-admin cannot call admin moderation successfully.
- Editing user metadata such as `account_type` or `company_name` cannot grant employer membership or admin privileges.
- An unverified account cannot create a workspace, change a profile, or submit a listing.
- Public/anonymous visitors can read only active published jobs and intentionally public employer branding assets.
- No private applicant documents or personal data are stored in the public employer-branding bucket.

## 6. PayPal Sandbox recovery and idempotency tests

Use a fresh approved test submission for each scenario. Capture request IDs, PayPal Sandbox order/capture IDs, webhook event IDs, and corresponding ledger rows. Never expose credentials or tokens in the evidence.

| ID | Scenario | Expected result |
|---|---|---|
| P1 | Normal order create → buyer approval → capture | One completed $49.00 USD payment; one published job |
| P2 | Repeat create-order request | Existing valid order reused or duplicate prevented; no second charge |
| P3 | Buyer cancels checkout | No completed payment; listing remains unpublished |
| P4 | Capture succeeds but browser response is lost | Retry fetches provider order and reconciles same capture; no second charge |
| P5 | Ledger write fails after successful capture | API reports recoverable/pending state; retry repairs ledger using same capture |
| P6 | Publication fails after capture | Payment remains recorded; retry publishes once after approval |
| P7 | Repeat capture request after completed capture | Existing capture is reconciled; no second capture |
| P8 | Duplicate signed webhook delivery | Event deduplicated; no duplicate ledger mutation or publication |
| P9 | Invalid webhook signature / missing headers | Rejected; no payment or listing mutation |
| P10 | Correct signature but unknown/mismatched order/submission/amount/currency | Flagged for reconciliation; no automatic publication |
| P11 | Refund, reversal, denial, dispute, unmatched event | No silent state change; surfaced for manual reconciliation under documented operations |
| P12 | Concurrent checkout/capture retries | Unique constraints and reconciliation result in one payment and one published job |

## 7. Webhook-specific prerequisites

- Create a webhook in the PayPal Sandbox app and subscribe to `PAYMENT.CAPTURE.COMPLETED`.
- Store the matching `PAYPAL_WEBHOOK_ID` as an Edge Function secret.
- Deploy only the webhook to the approved test environment with JWT verification disabled for that endpoint only; its PayPal signature verification remains mandatory.
- Keep JWT verification enabled for all user-facing Edge Functions.
- Deliver valid, invalid, duplicate, and mismatched Sandbox events and inspect the billing event ledger.
- Document an owner and response process for refunds, reversals, disputes, unmatched events, and reconciliation failures before live payments.

## 8. Sign-off criteria

Do not call the employer/payment journey launch-ready until:

- A1–A12 pass.
- Employer journey steps 1–13 pass.
- Cross-employer authorization and storage isolation tests pass.
- P1–P12 pass in Sandbox, including webhook delivery and failure recovery.
- Security and performance advisors are reviewed; no unresolved critical findings remain.
- Frontend build, TypeScript checks, Edge Function type checks and tests pass on the exact PR head.
- Auth dashboard values, email delivery, domain redirect configuration and sender authentication are recorded.
- Refund/dispute/manual reconciliation ownership is assigned.
- The user explicitly approves any merge, production deployment, or activation of live PayPal.

## Current execution status

- Source implementation and CI are not a substitute for these live tests.
- The branch contains the payment recovery and webhook implementation, but those latest Edge Function changes have not been deployed.
- The exclusive Spotlight reservation migration, authenticated scheduler, employer booking interface, PayPal order association, capture confirmation RPC, and database Cron activation job are implemented on the feature branch only. They have not been applied or deployed; the $149 tier remains unavailable in production until the full Sandbox plan passes.
- The project has no test submissions or payment ledger records yet.
- Supabase Auth dashboard settings have not been independently verified or changed through the available project connection.
- PayPal remains Sandbox. No real charge, production deployment, merge, paid provider, or domain purchase is authorized.


## 9. Exclusive Spotlight reservation and payment scenarios

The feature branch now connects the employer booking flow to a 15-minute reservation hold and a $149 USD PayPal order. A verified capture is associated with the exact reservation, and a database RPC changes the reservation to scheduled only while the hold is still valid. The listing is published after verified payment but remains unfeatured until its reserved start date. A database Cron job invokes the queue processor every minute to activate the exclusive placement and expire it after 30 days.

| ID | Scenario | Expected result |
|---|---|---|
| S13 | Approved Spotlight employer opens booking | Next available 30-day start date is returned |
| S14 | Employer reserves next slot | One 15-minute hold is created for the correct employer and submission |
| S15 | Employer alters reservation ID or listing ID | Checkout is rejected; no PayPal order or payment row is created |
| S16 | Employer alters amount or currency | Server enforces exactly $149.00 USD |
| S17 | Employer retries checkout for the same valid hold | Existing PayPal order is reused; no duplicate charge |
| S18 | PayPal capture is verified before hold expiry | Payment ledger and reservation are linked; reservation becomes scheduled |
| S19 | Capture arrives after hold expiry | Payment is not assigned a slot or published as Spotlight; manual reconciliation required |
| S20 | Duplicate capture request or signed webhook | Same reservation remains scheduled; no duplicate slot or placement |
| S21 | Two employers reserve concurrently | Database exclusion constraint permits no overlapping live reservations |
| S22 | Scheduled start date arrives | Cron processor activates the reservation and sets the job Spotlight flag |
| S23 | Scheduled placement reaches day 30 | Cron processor completes the reservation and clears the active job flag |
| S24 | Scheduler runs repeatedly for same reservation | Activation and expiry remain idempotent |
| S25 | User belongs to multiple employer accounts | Scheduler authorizes only membership in the account that owns the submitted listing |
| S26 | Refund, reversal, denial or dispute occurs | Event is flagged for manual reconciliation; placement is not silently reallocated |

Do not mark S13–S26 passed until executed against a dedicated test environment with the migration applied and PayPal Sandbox configured. Confirm Cron job creation and inspect cron.job_run_details for successful processor runs.
