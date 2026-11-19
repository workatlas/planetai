import { withSupabase } from "npm:@supabase/server";

import { corsHeadersFor, isAllowedOrigin } from "../_shared/cors.ts";


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // @supabase/server exposes the verified user's ID as `id`, not the raw JWT `sub` claim.
  const userId = ctx.userClaims?.id;
  const userEmail = typeof ctx.userClaims?.email === "string" ? ctx.userClaims.email : null;
  if (!userId) return json({ error: "Authentication required" }, 401);

  let body: { company_name?: unknown; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "A valid JSON request body is required." }, 400);
  }

  const admin = ctx.supabaseAdmin;

  if (body.action === "list") {
    const { data: membership, error: membershipError } = await admin
      .from("employer_members")
      .select("employer_account_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (membershipError) {
      console.error("Employer listing membership lookup failed", membershipError);
      return json({ error: "We could not verify your employer workspace." }, 500);
    }
    if (!membership?.employer_account_id) return json({ listings: [] });
    const { data: submissions, error: submissionsError } = await admin
      .from("job_submissions")
      .select("id, reference_code, job_title, company_name, package_tier, status, submitted_at")
      .eq("employer_account_id", membership.employer_account_id)
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (submissionsError) {
      console.error("Employer listing query failed", submissionsError);
      return json({ error: "We could not load your submitted listings." }, 500);
    }
    const ids = (submissions || []).map((item) => item.id);
    const { data: payments, error: paymentsError } = ids.length
      ? await admin.from("job_payments")
          .select("submission_id, status, amount, currency, provider_order_id, confirmed_at")
          .in("submission_id", ids)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (paymentsError) {
      console.error("Employer payment query failed", paymentsError);
      return json({ error: "We could not load your payment records." }, 500);
    }
    const latestPayment = new Map<string, { status: string; amount: number; currency: string; provider_order_id: string | null; confirmed_at: string | null }>();
    for (const payment of payments || []) {
      if (!latestPayment.has(payment.submission_id)) latestPayment.set(payment.submission_id, payment);
    }
    return json({
      listings: (submissions || []).map((item) => ({
        ...item,
        payment: latestPayment.get(item.id) || null,
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
