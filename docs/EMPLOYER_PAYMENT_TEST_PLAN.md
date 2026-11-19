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
- Check Authentication → Security and enable leaked-password protection if the current plan/settings permit it. If the Free plan does not expose the control, record it as a release blocker and choose an approved mitigation/upgrade only after discussing cost.

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

## 3. Employer journey

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

## 4. Authorization and storage isolation

- Employer A cannot read, update, or delete Employer B's profile, workspace, submissions, payment records, or branding objects.
- Employer A cannot submit a listing using Employer B's submission/account identifier.
- An authenticated non-admin cannot call admin moderation successfully.
- Editing user metadata such as `account_type` or `company_name` cannot grant employer membership or admin privileges.
- An unverified account cannot create a workspace, change a profile, or submit a listing.
- Public/anonymous visitors can read only active published jobs and intentionally public employer branding assets.
- No private applicant documents or personal data are stored in the public employer-branding bucket.

## 5. PayPal Sandbox recovery and idempotency tests

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

## 6. Webhook-specific prerequisites

- Create a webhook in the PayPal Sandbox app and subscribe to `PAYMENT.CAPTURE.COMPLETED`.
- Store the matching `PAYPAL_WEBHOOK_ID` as an Edge Function secret.
- Deploy only the webhook to the approved test environment with JWT verification disabled for that endpoint only; its PayPal signature verification remains mandatory.
- Keep JWT verification enabled for all user-facing Edge Functions.
- Deliver valid, invalid, duplicate, and mismatched Sandbox events and inspect the billing event ledger.
- Document an owner and response process for refunds, reversals, disputes, unmatched events, and reconciliation failures before live payments.

## 7. Sign-off criteria

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
- The project has no test submissions or payment ledger records yet.
- Supabase Auth dashboard settings have not been independently verified or changed through the available project connection.
- PayPal remains Sandbox. No real charge, production deployment, merge, paid provider, or domain purchase is authorized.
