import { withSupabase } from "npm:@supabase/server@1";

import { corsHeadersFor, isAllowedOrigin } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // @supabase/server exposes the verified user's ID as `id`, not the raw JWT `sub` claim.
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required" }, 401);

  // Validate the live Auth user record, not only the JWT identity. This prevents
  // unconfirmed email accounts from creating or accessing employer workspaces.
  const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    return json({ error: "Your sign-in session could not be verified. Please sign in again." }, 401);
  }
  if (!authData.user.email_confirmed_at) {
    return json({ error: "Confirm your email address before accessing an employer workspace." }, 403);
  }
  const userEmail = authData.user.email || null;

  let body: { company_name?: unknown; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "A valid JSON request body is required." }, 400);
  }

  const admin = ctx.supabaseAdmin;
  const rateLimit = await checkRateLimit(admin, "employer-workspace", userId, 60, 60);
  if (rateLimit === null) return json({ error: "Workspace protection is temporarily unavailable. Please try again shortly." }, 503);
  if (!rateLimit) return json({ error: "Too many workspace requests. Please wait before trying again." }, 429);

  if (body.action === "list") {
    const { data: memberships, error: membershipError } = await admin
      .from("employer_members")
      .select("employer_account_id")
      .eq("user_id", userId);
    if (membershipError) {
      console.error("Employer listing membership lookup failed", membershipError);
      return json({ error: "We could not verify your employer workspace." }, 500);
    }
    const employerAccountIds = [...new Set((memberships || []).map(item => item.employer_account_id).filter(Boolean))];
    if (!employerAccountIds.length) return json({ listings: [] });
    const { data: submissions, error: submissionsError } = await admin
      .from("job_submissions")
      .select("id, reference_code, job_title, company_name, package_tier, status, submitted_at")
      .in("employer_account_id", employerAccountIds)
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (submissionsError) {
      console.error("Employer listing query failed", submissionsError);
      return json({ error: "We could not load your submitted listings." }, 500);
    }
    const ids = (submissions || []).map((item) => item.id);
    const { data: payments, error: paymentsError } = ids.length
      ? await admin.from("job_payments")
          .select("submission_id, status, amount, currency, provider_order_id, confirmed_at, spotlight_reservation_id")
          .in("submission_id", ids)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (paymentsError) {
      console.error("Employer payment query failed", paymentsError);
      return json({ error: "We could not load your payment records." }, 500);
    }
    const latestPayment = new Map<string, { status: string; amount: number; currency: string; provider_order_id: string | null; confirmed_at: string | null; spotlight_reservation_id: string | null }>();
    for (const payment of payments || []) {
      if (!latestPayment.has(payment.submission_id)) latestPayment.set(payment.submission_id, payment);
    }
    const { data: reservations, error: reservationsError } = ids.length
      ? await admin.from("employer_spotlight_reservations")
          .select("id, submission_id, slot_start, slot_end, status, paid_at, activated_at")
          .in("submission_id", ids)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (reservationsError) {
      console.error("Employer Spotlight reservation lookup failed", reservationsError);
      return json({ error: "We could not load your Spotlight booking details." }, 500);
    }
    const latestReservation = new Map<string, { id: string; slot_start: string; slot_end: string; status: string; paid_at: string | null; activated_at: string | null }>();
    for (const reservation of reservations || []) {
      if (!latestReservation.has(reservation.submission_id)) latestReservation.set(reservation.submission_id, reservation);
    }
    return json({
      listings: (submissions || []).map((item) => ({
        ...item,
        payment: latestPayment.get(item.id) || null,
        reservation: latestReservation.get(item.id) || null,
      })),
    });
  }

  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
  if (companyName.length < 2 || companyName.length > 100) {
    return json({ error: "Company name must be between 2 and 100 characters." }, 400);
  }
  const { data: existing, error: lookupError } = await admin
    .from("employer_accounts")
    .select("id, company_name")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (lookupError) {
    console.error("Employer workspace lookup failed", lookupError);
    return json({ error: "We could not load your employer workspace." }, 500);
  }

  let account = existing;
  if (!account) {
    const { data: created, error: createError } = await admin
      .from("employer_accounts")
      .insert({
        owner_user_id: userId,
        company_name: companyName,
        contact_email: userEmail,
      })
      .select("id, company_name")
      .single();

    if (createError) {
      // If an owner-uniqueness constraint is present, recover from a concurrent
      // first-time setup by loading the account created by the winning request.
      if (createError.code === "23505") {
        const { data: racedAccount, error: raceLookupError } = await admin
          .from("employer_accounts")
          .select("id, company_name")
          .eq("owner_user_id", userId)
          .maybeSingle();
        if (!raceLookupError && racedAccount) {
          account = racedAccount;
        } else {
          console.error("Employer workspace race recovery failed", raceLookupError);
          return json({ error: "Your workspace setup is being finalized. Please refresh and try again." }, 409);
        }
      } else {
        console.error("Employer workspace creation failed", createError);
        return json({ error: "We could not create your employer workspace." }, 500);
      }
    } else {
      account = created;
    }
  }

  const { error: membershipError } = await admin
    .from("employer_members")
    .upsert(
      {
        employer_account_id: account.id,
        user_id: userId,
        member_role: "owner",
        joined_at: new Date().toISOString(),
      },
      { onConflict: "employer_account_id,user_id", ignoreDuplicates: true },
    );

  if (membershipError) {
    console.error("Employer owner membership setup failed", membershipError);
    return json({ error: "Your company workspace was created but access setup needs attention." }, 500);
  }

  return json({ account: { id: account.id, company_name: account.company_name } });
});

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return new Response("Origin not allowed.", { status: 403, headers: corsHeadersFor(req) });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeadersFor(req))) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
