# PLANETAI Marketplace Backend Setup

## Current status

The premium marketplace and owner dashboard are still previews. This migration creates the initial Supabase data model and access-control boundary; it does not, by itself, make submissions, email verification, payments, or publishing operational.

## 1. Create the database

1. Create a new Supabase project for PLANETAI.
2. Open **SQL Editor** in the Supabase dashboard.
3. Run the migration at `supabase/migrations/20261116000100_marketplace_foundation.sql`.
4. In **Authentication → Users**, create the initial owner account.
5. Add that owner's auth UUID to `public.admin_users` using the SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('YOUR_OWNER_AUTH_USER_UUID');
```

Do not insert an email address in place of the UUID.

## 2. Required server-side environment variables

The future Netlify Functions implementation will require:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is secret. Store it only in Netlify environment variables for server-side functions. Never add it to `VITE_*` variables, client-side source, GitHub commits, or public documentation.

The browser may use a separate public/anon key for reading published listings only, with the database row-level security policies in place.

## 3. Workflow boundary

The intended production workflow is:

1. Employer submits a vacancy through a server endpoint.
2. Server validates fields, anti-spam controls, and URL policy, then creates a pending submission.
3. Employer verifies their email using a short-lived, single-use token.
4. Submission enters the private owner review queue.
5. Owner approves or rejects it.
6. For paid tiers, server creates a payment request; the listing remains unpublished.
7. A verified PayPal webhook confirms payment server-to-server.
8. Server publishes the approved listing and sets its 30-day expiry.
9. Public visitors can read only published, unexpired jobs.
10. Owner-only records, employer contact details, payment data, and audit events remain private.

## 4. Security rules

- Never trust a browser redirect or success page as proof of payment.
- Never expose the Supabase service-role key or PayPal webhook secret to the browser.
- Do not allow anonymous clients to write directly to submissions, payments, audit events, or published jobs.
- Keep employer email addresses and review notes out of the public jobs table.
- Verify the PayPal webhook signature before changing payment or publication status.
- Add rate limiting and abuse monitoring to public submission and verification endpoints.

## 5. Not yet implemented

This foundation still needs server-side submission and verification functions, authenticated owner dashboard integration, PayPal order/webhook handling, secure employer management links, expiry automation, and end-to-end tests. Do not advertise the new workflow as live until those pieces are deployed and tested.
