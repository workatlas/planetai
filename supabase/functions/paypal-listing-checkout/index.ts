import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const priceFor = (tier: string) => tier === "featured" ? "49.00" : tier === "spotlight" ? "149.00" : null;
const paypalBase = () => Deno.env.get("PAYPAL_ENVIRONMENT") === "live"
  ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function paypalToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials are not configured.");
  const auth = btoa(`${id}:${secret}`);
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("PayPal authentication failed.");
  return data.access_token as string;
}
async function paypalRequest(path: string, token: string, method: string, body?: unknown, requestId?: string) {
  const response = await fetch(`${paypalBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("PayPal API request failed", response.status, data?.name);
    throw new Error("PayPal could not complete this payment request.");
  }
  return data;
}
const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required." }, 401);
  let body: { action?: string; submission_id?: string; order_id?: string };
  try { body = await req.json(); } catch { return json({ error: "A valid JSON body is required." }, 400); }
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: "A valid submission is required." }, 400);

  const admin = ctx.supabaseAdmin;
  const { data: submission, error: submissionError } = await admin.from("job_submissions")
    .select("id, reference_code, package_tier, status, employer_account_id, job_title, company_name, company_website, company_logo_url, category, employment_type, location, remote_policy, salary_min, salary_max, salary_currency, pay_period, description, requirements, tags, apply_url")
    .eq("id", submissionId).maybeSingle();
  if (submissionError || !submission) return json({ error: "Submission not found." }, 404);
  if (!submission.employer_account_id) return json({ error: "This listing is not attached to an employer workspace." }, 403);
  const { data: membership, error: membershipError } = await admin.from("employer_members")
    .select("id").eq("employer_account_id", submission.employer_account_id).eq("user_id", userId).maybeSingle();
  if (membershipError || !membership) return json({ error: "You do not have access to this employer listing." }, 403);
  const amount = priceFor(submission.package_tier);
  if (!amount) return json({ error: "This listing does not require a paid upgrade." }, 400);

  const ensurePublished = async (captureId: string, orderId: string) => {
    const { data: existingJob, error: existingJobError } = await admin.from("jobs")
      .select("id").eq("submission_id", submission.id).maybeSingle();
    if (existingJobError) throw new Error("Payment is verified, but publication status could not be checked.");
    if (!existingJob) {
      const published = await ensurePublished(captured.id, orderId);
    if (!published) return json({ paid: true, publication_pending: true, error: "Payment is verified. Publication needs administrator attention." }, 202);
    return json({ paid: true, published: true, capture_id: captured.id });
  }
  return json({ error: "Unsupported PayPal action." }, 400);
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const response = await handler(req);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.error("PayPal checkout error", error);
    return json({ error: error instanceof Error ? error.message : "Payment service unavailable." }, 500);
  }
});
