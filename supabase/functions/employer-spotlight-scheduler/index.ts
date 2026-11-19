import { withSupabase } from "npm:@supabase/server@1";

import { corsHeadersFor, isAllowedOrigin } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required." }, 401);

  const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    return json({ error: "Your sign-in session could not be verified. Please sign in again." }, 401);
  }
  if (!authData.user.email_confirmed_at) {
    return json({ error: "Confirm your email before reserving a Spotlight placement." }, 403);
  }

  let body: { action?: unknown; submission_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "A valid JSON request body is required." }, 400);
  }
  const action = typeof body.action === "string" ? body.action : "";
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
  if (!["next-slot", "reserve-next"].includes(action) || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
    return json({ error: "A supported action and valid submission are required." }, 400);
  }

  const admin = ctx.supabaseAdmin;
  const limited = await checkRateLimit(admin, "employer-spotlight-scheduler", userId, 10, 600);
  if (limited === null) return json({ error: "Scheduling protection is temporarily unavailable. Please try again shortly." }, 503);
  if (!limited) return json({ error: "Too many scheduling requests. Please wait before trying again." }, 429);

  const { data: membership, error: membershipError } = await admin
    .from("employer_members")
    .select("employer_account_id, member_role")
    .eq("user_id", userId)
    .in("member_role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) {
    return json({ error: "Employer owner or administrator access is required." }, 403);
  }

  const { data: submission, error: submissionError } = await admin
    .from("job_submissions")
    .select("id, employer_account_id, package_tier, status")
    .eq("id", submissionId)
    .eq("employer_account_id", membership.employer_account_id)
    .maybeSingle();
  if (submissionError || !submission) return json({ error: "Listing not found in your employer workspace." }, 404);
  if (submission.package_tier !== "spotlight" || submission.status !== "approved_awaiting_payment") {
    return json({ error: "Only an approved Spotlight listing can reserve a placement." }, 409);
  }

  if (action === "next-slot") {
    const { data, error } = await admin.schema("private").rpc("next_employer_spotlight_slot");
    if (error || !data) {
      console.error("Spotlight next-slot lookup failed.", error);
      return json({ error: "The next Spotlight date is temporarily unavailable." }, 503);
    }
    return json({ next_available_start: data, duration_days: 30, amount: "149.00", currency: "USD" });
  }

  const { data, error } = await admin.schema("private").rpc("reserve_next_employer_spotlight_slot", {
    p_submission_id: submissionId,
    p_employer_account_id: membership.employer_account_id,
    p_user_id: userId,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    console.error("Spotlight reservation failed.", error);
    return json({ error: "We could not reserve the next Spotlight slot. Please refresh and try again." }, 409);
  }
  return json({
    reservation: data[0],
    payment_required: true,
    amount: "149.00",
    currency: "USD",
    checkout_enabled: false,
    message: "Your 15-minute slot hold is created. Checkout remains disabled until payment reconciliation and the scheduled activation worker are enabled.",
  }, 202);
});

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return new Response("Origin not allowed.", { status: 403, headers: corsHeadersFor(req) });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  try {
    const response = await handler(req);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeadersFor(req))) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.error("Employer Spotlight scheduler error.", error);
    return new Response(JSON.stringify({ error: "Spotlight scheduling is temporarily unavailable." }), {
      status: 500,
      headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
    });
  }
});
