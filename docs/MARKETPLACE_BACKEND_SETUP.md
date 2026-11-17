# PLANETAI Marketplace Backend Setup

## Current implementation status

The existing public marketplace remains the production experience. The employer and applicant dashboard routes are still previews until their data workflows are connected and tested.

Implemented on the development branch `planetai-premium-refresh`:

- Supabase project and marketplace database foundation.
- Employer account, membership, subscription-plan, subscription, and billing-event tables with RLS.
- Employer registration and password sign-in UI at `/?experience=employer-auth`.
- Supabase browser client using the project's public publishable key.
- Authenticated `employer-workspace` Edge Function. It verifies a user session with `@supabase/server`, creates or finds the employer's workspace, and ensures owner membership.
- Database hardening for the RLS event-trigger function and timestamp trigger search path.

The workspace function is deployed to the Supabase project. Its gateway-level JWT check is disabled because the project uses the newer opaque publishable API key; the function itself validates the user session with `withSupabase({ auth: "user" })`. Never remove that in-function authentication.

Not yet complete:

- End-to-end signup and email-confirmation test in the Netlify preview.
- Real employer job creation, candidate pipeline, and dashboard data.
- Owner/admin authentication and workflows.
- Approved subscription package names, prices, billing intervals, and job limits.
- PayPal subscription creation, webhook signature verification, billing reconciliation, and cancellation handling.
- Expiry automation and full end-to-end marketplace tests.

Do not advertise the employer subscription workflow as live until these pieces have been deployed and tested.

## 1. Supabase project

Project ref: `lfccdqvwpfohfuhlijso`

Project URL: `https://lfccdqvwpfohfuhlijso.supabase.co`

The browser uses the public publishable key only. See `.env.example` for the Vite variable names. The publishable key is safe for browser use when RLS is enabled. Never put a Supabase secret key or legacy service-role key in `VITE_*` variables.

## 2. Authentication configuration

The employer auth route is:

```text
/?experience=employer-auth
```

Supabase Auth email confirmation should remain enabled. In **Authentication → URL Configuration → Redirect URLs**, allow the exact Netlify deploy-preview origin used for testing, for example:

```text
https://deploy-preview-1--planetai-global.netlify.app/**
```

Also keep the production site's correct URL in the Site URL setting. Do not add broad wildcard domains. Confirm the current preview URL before adding it if Netlify assigns a different deploy-preview number.

The signup form stores only the company name and account type as Auth user metadata. After a user confirms their email and signs in, the frontend calls the authenticated `employer-workspace` Edge Function. The function derives the user ID and email from the verified JWT; it never trusts a user ID supplied by the browser.

## 3. Edge Function secrets

The project has the following custom PayPal Sandbox secrets configured:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENVIRONMENT=sandbox`

Supabase automatically provides `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, and `SUPABASE_JWKS` to Edge Functions. Use the named `default` entry in the key dictionaries when an admin client is required. Never expose a secret key to the browser or commit secret values to Git.

The employer workspace Edge Function uses `@supabase/server` user authentication and a server-side admin client for its tightly scoped onboarding writes.

## 4. Database migrations

The following migrations have been applied to the Supabase project:

1. `marketplace_foundation`
2. `submission_security`
3. `employer_subscriptions`
4. `employer_workspace_onboarding`
5. `move_employer_onboarding_to_edge_function`
6. `security_and_query_hardening`

The temporary public onboarding RPC was removed. Employer workspace creation is handled only by the authenticated Edge Function.

## 5. Intended marketplace workflow

1. Employer creates an account and verifies their email.
2. The authenticated workspace function creates the private company workspace and owner membership.
3. Employer prepares a vacancy through a trusted server endpoint.
4. Server validates fields, anti-spam controls, and URL policy, then creates a pending submission.
5. Submission enters the private owner review queue.
6. For paid tiers, server creates a payment request; the listing remains unpublished.
7. A verified PayPal webhook confirms payment server-to-server.
8. Server publishes the approved listing and sets its expiry.
9. Public visitors can read only published, unexpired jobs.
10. Employer and owner records, contact details, payment data, and audit events remain private.

## 6. Security rules

- Never trust a browser redirect or success page as proof of payment.
- Never expose Supabase secret keys, service-role keys, or PayPal credentials to the browser.
- Do not allow anonymous clients to write directly to submissions, payments, audit events, employer accounts, memberships, subscriptions, or published jobs.
- Keep employer email addresses and review notes out of the public jobs table.
- Verify the PayPal webhook signature before changing payment or publication status.
- Store only SHA-256 token hashes for email verification and private employer-management links; never store raw tokens.
- Give verification tokens short expirations and single-use consumption; rotate or revoke employer-management tokens when necessary.
- Add rate limiting and abuse monitoring to public submission and verification endpoints.
- Keep the `job_submission_tokens` table inaccessible to browser roles; its lack of direct RLS policies is intentional defense-in-depth.

## 7. Employer workspaces and subscriptions

The employer schema adds:

- Employer company workspaces and team membership roles.
- A configurable employer subscription-plan catalogue.
- Employer subscription records with monthly, annual, or one-time billing intervals.
- Provider event records for auditable billing updates.
- Optional links from existing job submissions and published jobs to an employer workspace.

The migration intentionally does not invent subscription prices or activate a payment provider. Add approved plan rows to `employer_subscription_plans` only after package names, prices, billing interval, limits, and provider are confirmed. Existing job listings and public feed records remain intact because employer links are nullable.

All employer onboarding, workspace writes, subscription changes, and billing-event processing must be implemented in trusted server functions. Provider webhook signatures must be verified before changing subscription status or entitlements. The browser must never write billing status directly.
