import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const priceFor = (tier: string) => tier === "featured" ? "49.00" : null;
const paypalBase = () => Deno.env.get("PAYPAL_ENVIRONMENT") === "live"
  ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function paypalToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials are not configured.");
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
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
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
    .select("id, member_role")
    .eq("employer_account_id", submission.employer_account_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) return json({ error: "You do not have access to this employer listing." }, 403);
  if (!["owner", "admin"].includes(membership.member_role)) {
    return json({ error: "Only an employer workspace owner or administrator can authorize listing payments." }, 403);
  }

  const amount = priceFor(submission.package_tier);
  if (!amount) return json({ error: "This listing does not require a paid upgrade." }, 400);

  const ensurePublished = async (captureId: string, orderId: string) => {
    const { data: existingJob, error: existingJobError } = await admin.from("jobs")
      .select("id").eq("submission_id", submission.id).maybeSingle();
    if (existingJobError) throw new Error("Payment is verified, but publication status could not be checked.");

    let createdJob = false;
    if (!existingJob) {
      const slug = `${submission.job_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70)}-${submission.reference_code.toLowerCase()}`;
      const { error: jobError } = await admin.from("jobs").insert({
        submission_id: submission.id,
        employer_account_id: submission.employer_account_id,
        slug,
        job_title: submission.job_title,
        company_name: submission.company_name,
        company_website: submission.company_website,
        company_logo_url: submission.company_logo_url,
        category: submission.category,
        employment_type: submission.employment_type,
        location: submission.location,
        remote_policy: submission.remote_policy,
        salary_min: submission.salary_min,
        salary_max: submission.salary_max,
        salary_currency: submission.salary_currency,
        pay_period: submission.pay_period,
        description: submission.description,
        requirements: submission.requirements,
        tags: submission.tags,
        apply_url: submission.apply_url,
        featured: true,
        verified_employer: false,
        status: "published",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (jobError) {
        console.error("Verified payment recorded but listing publication failed", jobError);
        return false;
      }
      createdJob = true;
    }

    const { error: statusError } = await admin.from("job_submissions")
      .update({ status: "published" })
      .eq("id", submission.id)
      .in("status", ["approved_awaiting_payment", "published"]);
    if (statusError) {
      console.error("Submission status update failed after verified payment", statusError);
      return false;
    }
    if (createdJob) {
      await admin.from("marketplace_audit_events").insert({
        actor_user_id: userId,
        submission_id: submission.id,
        event_type: "paypal_payment_captured_and_listing_published",
        details: { order_id: orderId, capture_id: captureId, amount, currency: "USD", package_tier: submission.package_tier },
      });
    }
    return true;
  };

  if (body.action === "create-order") {
    if (submission.status !== "approved_awaiting_payment") {
      return json({ error: "This listing must pass moderation before payment can begin." }, 409);
    }
    const origin = req.headers.get("Origin") || "";
    const allowedOrigin = origin === "https://planetai-global.netlify.app" ||
      /^https:\/\/deploy-preview-\d+--planetai-global\.netlify\.app$/.test(origin);
    if (!allowedOrigin) return json({ error: "Checkout must be started from an authorized PLANETAI site." }, 400);

    const returnUrl = `${origin}/?experience=employer-payments&payment=success&submission_id=${encodeURIComponent(submission.id)}`;
    const cancelUrl = `${origin}/?experience=employer-payments&payment=cancelled&submission_id=${encodeURIComponent(submission.id)}`;
    const { data: existing } = await admin.from("job_payments")
      .select("id, provider_order_id, status")
      .eq("submission_id", submissionId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const token = await paypalToken();
    if (existing?.provider_order_id) {
      const savedOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(existing.provider_order_id)}`, token, "GET");
      const approveUrl = savedOrder.links?.find((link: { rel: string }) => link.rel === "approve")?.href;
      if (!approveUrl) return json({ error: "The existing PayPal order is no longer available. Contact support before creating another payment." }, 409);
      return json({ order_id: existing.provider_order_id, amount, currency: "USD", approve_url: approveUrl });
    }

    const order = await paypalRequest("/v2/checkout/orders", token, "POST", {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: submission.reference_code,
        custom_id: submission.id,
        invoice_id: submission.reference_code,
        description: `PLANETAI ${submission.package_tier} job listing promotion`,
        amount: { currency_code: "USD", value: amount },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    }, `pa-o-${submission.id.replaceAll("-", "")}`);

    const { error: paymentError } = await admin.from("job_payments").insert({
      submission_id: submission.id,
      provider: "paypal",
      provider_order_id: order.id,
      amount: Number(amount),
      currency: "USD",
      status: "pending",
    });
    if (paymentError) {
      // A concurrent request may have created the same idempotent PayPal order first.
      const { data: racedPayment } = await admin.from("job_payments")
        .select("id").eq("submission_id", submission.id).eq("provider_order_id", order.id).maybeSingle();
      if (!racedPayment) {
        console.error("Pending PayPal ledger insert failed", paymentError);
        return json({ error: "The payment order was created but could not be recorded. Contact support before retrying." }, 500);
      }
    }
    const approveUrl = order.links?.find((link: { rel: string }) => link.rel === "approve")?.href;
    if (!approveUrl) return json({ error: "PayPal did not return an approval link. Contact support before retrying." }, 502);
    return json({ order_id: order.id, amount, currency: "USD", approve_url: approveUrl });
  }

  if (body.action === "capture-order") {
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    if (!orderId) return json({ error: "A valid PayPal order is required." }, 400);
    const { data: payment, error: paymentLookupError } = await admin.from("job_payments")
      .select("id, provider_order_id, amount, currency, status, provider_capture_id")
      .eq("submission_id", submissionId)
      .eq("provider_order_id", orderId)
      .maybeSingle();
    if (paymentLookupError || !payment) return json({ error: "This PayPal order is not recorded for the selected listing." }, 404);

    if (payment.status === "completed" && payment.provider_capture_id) {
      const published = await ensurePublished(payment.provider_capture_id, orderId);
      return published
        ? json({ paid: true, published: true, capture_id: payment.provider_capture_id, already_completed: true })
        : json({ paid: true, publication_pending: true, capture_id: payment.provider_capture_id, error: "Payment is verified. Publication still needs attention." }, 202);
    }
    if (submission.status !== "approved_awaiting_payment" || payment.status !== "pending" ||
        Number(payment.amount).toFixed(2) !== amount || payment.currency.trim() !== "USD") {
      return json({ error: "Payment record does not match the approved listing price." }, 409);
    }

    const token = await paypalToken();
    const capture = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      token,
      "POST",
      {},
      `planetai-capture-${orderId}`,
    );
    const unit = capture.purchase_units?.[0];
    const captured = unit?.payments?.captures?.[0];
    if (capture.status !== "COMPLETED" || unit?.custom_id !== submission.id ||
        captured?.status !== "COMPLETED" || captured?.amount?.currency_code !== "USD" ||
        Number(captured?.amount?.value).toFixed(2) !== amount || !captured?.id) {
      console.error("PayPal capture verification mismatch", { orderId, status: capture.status, captureStatus: captured?.status });
      return json({ error: "PayPal did not return a verified payment matching this listing. No promotion was applied." }, 409);
    }

    const { data: completed, error: completeError } = await admin.from("job_payments")
      .update({ provider_capture_id: captured.id, status: "completed", confirmed_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (completeError || !completed) {
      return json({ error: "The payment was captured but its ledger confirmation needs administrator attention. Do not retry payment." }, 500);
    }

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
