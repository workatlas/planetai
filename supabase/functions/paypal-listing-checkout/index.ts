import { withSupabase } from "npm:@supabase/server@1";

import { corsHeadersFor, isAllowedOrigin } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { verifyCompletedPayPalOrder } from "../_shared/paypal-validation.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
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


type PayPalOrderLink = { rel?: unknown; href?: unknown };
function getPayPalApprovalUrl(order: { links?: PayPalOrderLink[] }): string | null {
  const links = Array.isArray(order.links) ? order.links : [];
  // Orders created with payment_source.paypal may return payer-action.
  // Retain approve as a compatibility fallback for older PayPal flows.
  const selected = links.find((link) => link.rel === "payer-action")
    ?? links.find((link) => link.rel === "approve");
  if (!selected || typeof selected.href !== "string") return null;
  try {
    const url = new URL(selected.href);
    if (url.protocol !== "https:" || !/(^|\.)paypal\.com$/i.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (!isAllowedOrigin(req)) return new Response("Origin not allowed.", { status: 403, headers: corsHeadersFor(req) });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required." }, 401);

  let body: { action?: string; submission_id?: string; order_id?: string; reservation_id?: string };
  try { body = await req.json(); } catch { return json({ error: "A valid JSON body is required." }, 400); }
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: "A valid submission is required." }, 400);

  const admin = ctx.supabaseAdmin;
  const rateLimit = await checkRateLimit(admin, "paypal-listing-checkout", userId, 12, 600);
  if (rateLimit === null) return json({ error: "Payment protection is temporarily unavailable. Please try again shortly." }, 503);
  if (!rateLimit) return json({ error: "Too many payment requests. Please wait 10 minutes before trying again." }, 429);

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

  const isSpotlight = submission.package_tier === "spotlight";
  const amount = isSpotlight ? "149.00" : priceFor(submission.package_tier);
  if (!amount) return json({ error: "This listing does not require a paid upgrade." }, 400);

  if (body.action === "inspect-order") {
    // Read-only verification: never approve, capture, or mutate payment state.
    if (Deno.env.get("PAYPAL_ENVIRONMENT") !== "sandbox") {
      return json({ error: "Read-only order inspection is restricted to the configured PayPal Sandbox environment." }, 409);
    }
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    if (!orderId || orderId.length > 128) return json({ error: "A valid PayPal order is required." }, 400);
    const { data: payment, error: paymentError } = await admin.from("job_payments")
      .select("provider_order_id, amount, currency, status")
      .eq("submission_id", submissionId)
      .eq("provider", "paypal")
      .eq("provider_order_id", orderId)
      .maybeSingle();
    if (paymentError || !payment) return json({ error: "This PayPal order is not recorded for the selected listing." }, 404);
    if (payment.status !== "pending" || Number(payment.amount).toFixed(2) !== amount || payment.currency.trim() !== "USD") {
      return json({ error: "The payment ledger does not match the expected pending Sandbox order." }, 409);
    }
    const token = await paypalToken();
    const order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, token, "GET");
    const units = Array.isArray(order.purchase_units) ? order.purchase_units : [];
    if (units.length !== 1) return json({ error: "PayPal order has an unexpected purchase-unit count; manual review required." }, 409);
    const unit = units[0];
    const orderAmount = unit.amount;
    const exactMatch = unit.custom_id === submission.id &&
      unit.reference_id === submission.reference_code &&
      unit.invoice_id === submission.reference_code &&
      orderAmount?.currency_code === "USD" &&
      orderAmount?.value === amount;
    if (!exactMatch) return json({ error: "PayPal order details do not exactly match this listing and price; do not pay." }, 409);
    const payee = unit.payee && typeof unit.payee === "object" ? unit.payee : {};
    const email = typeof payee.email_address === "string" ? payee.email_address : "";
    const maskedEmail = email.includes("@")
      ? `${email.slice(0, 2)}•••@${email.split("@")[1]}`
      : null;
    const merchantId = typeof payee.merchant_id === "string" ? payee.merchant_id : null;
    const brandName = typeof payee.display_data?.brand_name === "string" ? payee.display_data.brand_name : null;
    return json({
      read_only: true,
      environment: "sandbox",
      order_id: order.id,
      order_status: order.status,
      amount,
      currency: "USD",
      description: typeof unit.description === "string" ? unit.description : null,
      recipient: { merchant_id: merchantId, masked_email: maskedEmail, brand_name: brandName },
      listing_match: true,
      payment_ledger_status: payment.status,
      capture_performed: false,
    });
  }

  const confirmSpotlightPayment = async (reservationId: string, paymentId: string, captureId: string) => {
    const { data, error } = await admin.rpc("confirm_employer_spotlight_payment", {
      p_reservation_id: reservationId,
      p_payment_id: paymentId,
      p_capture_id: captureId,
    });
    if (error || data !== true) {
      console.error("Verified Spotlight capture requires reservation reconciliation.", error);
      return false;
    }
    return true;
  };

  const ensurePublished = async (captureId: string, orderId: string) => {
    let spotlightReservation: { id: string; slot_end: string } | null = null;
    if (isSpotlight) {
      const { data, error } = await admin.from("employer_spotlight_reservations")
        .select("id, slot_end")
        .eq("submission_id", submission.id)
        .in("status", ["scheduled", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        console.error("Paid Spotlight reservation is not scheduled for publication.", error);
        return false;
      }
      spotlightReservation = data;
    }
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
        featured: !isSpotlight,
        ...(isSpotlight ? {
          spotlight_active: false,
          spotlight_reservation_id: spotlightReservation?.id || null,
          spotlight_started_at: null,
          spotlight_expires_at: null,
        } : {}),
        verified_employer: false,
        status: "published",
        published_at: new Date().toISOString(),
        expires_at: isSpotlight && spotlightReservation
          ? new Date(spotlightReservation.slot_end + "T00:00:00.000Z").toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (jobError) {
        // A concurrent recovery request may have inserted the unique listing
        // after our initial lookup. Treat that exact submission as recovered.
        const { data: recoveredJob, error: recoveryError } = await admin.from("jobs")
          .select("id").eq("submission_id", submission.id).maybeSingle();
        if (recoveryError || !recoveredJob) {
          console.error("Verified payment recorded but listing publication failed", jobError);
          return false;
        }
      } else {
        createdJob = true;
      }
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
    if (!origin || !isAllowedOrigin(req)) {
      return json({ error: "Checkout must be started from an authorized PLANETAI site." }, 400);
    }

    const returnUrl = `${origin}/?experience=employer-payments&payment=success&submission_id=${encodeURIComponent(submission.id)}`;
    const cancelUrl = `${origin}/?experience=employer-payments&payment=cancelled&submission_id=${encodeURIComponent(submission.id)}`;
    const reservationId = typeof body.reservation_id === "string" ? body.reservation_id : "";
    if (isSpotlight) {
      if (!/^[0-9a-f-]{36}$/i.test(reservationId)) return json({ error: "Reserve a Spotlight date before checkout." }, 400);
      const { data: reservation, error: reservationError } = await admin.from("employer_spotlight_reservations")
        .select("id, submission_id, employer_account_id, status, hold_expires_at, amount, currency")
        .eq("id", reservationId).eq("submission_id", submission.id)
        .eq("employer_account_id", submission.employer_account_id).maybeSingle();
      if (reservationError || !reservation || reservation.status !== "payment_pending" ||
          !reservation.hold_expires_at || new Date(reservation.hold_expires_at).getTime() <= Date.now() ||
          Number(reservation.amount).toFixed(2) !== "149.00" || reservation.currency.trim() !== "USD") {
        return json({ error: "This Spotlight reservation is no longer valid. Refresh the available dates and reserve again." }, 409);
      }
    }

    const { data: existing, error: existingPaymentError } = await admin.from("job_payments")
      .select("id, provider_order_id, provider_capture_id, amount, currency, status, spotlight_reservation_id")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingPaymentError) {
      console.error("Existing payment lookup failed", existingPaymentError);
      return json({ error: "We could not verify the previous payment attempt. Please try again shortly." }, 503);
    }
    if (existing?.status === "completed") {
      if (isSpotlight && existing.spotlight_reservation_id !== reservationId) return json({ error: "A different Spotlight reservation already has a completed payment. Contact support before paying again." }, 409);
      if (Number(existing.amount).toFixed(2) !== amount || existing.currency.trim() !== "USD" || !existing.provider_capture_id) {
        return json({ error: "The completed payment record does not match the approved price or capture reference. Administrator reconciliation is required; do not pay again." }, 409);
      }
      if (isSpotlight && (!existing.spotlight_reservation_id || !await confirmSpotlightPayment(existing.spotlight_reservation_id, existing.id, existing.provider_capture_id))) {
        return json({ paid: true, reconciliation_required: true, error: "Payment is recorded, but the Spotlight slot needs administrator reconciliation. Do not pay again." }, 202);
      }
      const published = await ensurePublished(existing.provider_capture_id, existing.provider_order_id || "");
      return published
        ? json({ paid: true, published: true, spotlight_scheduled: isSpotlight, already_completed: true, capture_id: existing.provider_capture_id })
        : json({ paid: true, publication_pending: true, already_completed: true, capture_id: existing.provider_capture_id, error: "Payment is verified. Publication still needs attention." }, 202);
    }

    const token = await paypalToken();
    if (existing?.provider_order_id) {
      if (isSpotlight && existing.spotlight_reservation_id !== reservationId) return json({ error: "A different Spotlight reservation already has a pending payment. Resume that checkout or contact support." }, 409);
      const savedOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(existing.provider_order_id)}`, token, "GET");
      if (savedOrder.status === "COMPLETED") {
        const verifiedCapture = verifyCompletedPayPalOrder(savedOrder, submission.id, amount);
        if (Number(existing.amount).toFixed(2) !== amount || existing.currency.trim() !== "USD" || !verifiedCapture) {
          console.error("Completed PayPal order did not match its pending listing", { orderId: existing.provider_order_id });
          return json({ error: "PayPal reports a completed order, but its details need administrator reconciliation. No additional payment will be requested." }, 409);
        }
        const { data: recovered, error: recoveryError } = await admin.from("job_payments")
          .update({ provider_capture_id: verifiedCapture.id, status: "completed", confirmed_at: new Date().toISOString() })
          .eq("id", existing.id).eq("status", "pending").select("id").maybeSingle();
        if (recoveryError) {
          console.error("Completed PayPal order ledger recovery failed", recoveryError);
          return json({ error: "PayPal confirms payment, but the payment ledger needs administrator reconciliation. Do not pay again." }, 202);
        }
        if (!recovered) {
          const { data: currentPayment, error: currentPaymentError } = await admin.from("job_payments")
            .select("status, provider_capture_id").eq("id", existing.id).maybeSingle();
          if (currentPaymentError || currentPayment?.status !== "completed" || currentPayment.provider_capture_id !== verifiedCapture.id) {
            return json({ error: "PayPal confirms payment, but the payment ledger needs administrator reconciliation. Do not pay again." }, 202);
          }
        }
        if (isSpotlight && (!existing.spotlight_reservation_id || !await confirmSpotlightPayment(existing.spotlight_reservation_id, existing.id, verifiedCapture.id))) {
          return json({ paid: true, reconciliation_required: true, error: "PayPal confirms payment, but the Spotlight slot needs administrator reconciliation. Do not pay again." }, 202);
        }
        const published = await ensurePublished(verifiedCapture.id, existing.provider_order_id);
        return published
          ? json({ paid: true, published: true, spotlight_scheduled: isSpotlight, already_completed: true, capture_id: verifiedCapture.id })
          : json({ paid: true, publication_pending: true, already_completed: true, capture_id: verifiedCapture.id, error: "Payment is verified. Publication still needs attention." }, 202);
      }
      const approveUrl = getPayPalApprovalUrl(savedOrder);
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
      ...(isSpotlight ? { spotlight_reservation_id: reservationId } : {}),
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
    const approveUrl = getPayPalApprovalUrl(order);
    if (!approveUrl) return json({ error: "PayPal did not return an approval link. Contact support before retrying." }, 502);
    return json({ order_id: order.id, amount, currency: "USD", approve_url: approveUrl });
  }

  if (body.action === "capture-order") {
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    if (!orderId) return json({ error: "A valid PayPal order is required." }, 400);
    const { data: payment, error: paymentLookupError } = await admin.from("job_payments")
      .select("id, provider_order_id, amount, currency, status, provider_capture_id, spotlight_reservation_id")
      .eq("submission_id", submissionId)
      .eq("provider_order_id", orderId)
      .maybeSingle();
    if (paymentLookupError || !payment) return json({ error: "This PayPal order is not recorded for the selected listing." }, 404);

    if (payment.status === "completed" && payment.provider_capture_id) {
      if (Number(payment.amount).toFixed(2) !== amount || payment.currency.trim() !== "USD") {
        return json({ error: "The completed payment ledger does not match the approved listing price. Administrator reconciliation is required." }, 409);
      }
      if (isSpotlight && (!payment.spotlight_reservation_id || !await confirmSpotlightPayment(payment.spotlight_reservation_id, payment.id, payment.provider_capture_id))) {
        return json({ paid: true, reconciliation_required: true, error: "Payment is recorded, but the Spotlight slot needs administrator reconciliation. Do not pay again." }, 202);
      }
      const published = await ensurePublished(payment.provider_capture_id, orderId);
      return published
        ? json({ paid: true, published: true, spotlight_scheduled: isSpotlight, capture_id: payment.provider_capture_id, already_completed: true })
        : json({ paid: true, publication_pending: true, capture_id: payment.provider_capture_id, error: "Payment is verified. Publication still needs attention." }, 202);
    }
    if (submission.status !== "approved_awaiting_payment" || payment.status !== "pending" ||
        Number(payment.amount).toFixed(2) !== amount || payment.currency.trim() !== "USD") {
      return json({ error: "Payment record does not match the approved listing price." }, 409);
    }

    const token = await paypalToken();
    // Re-read PayPal first: a previous capture may have succeeded even if our
    // browser, function, or database connection failed before recording it.
    let capture = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      token,
      "GET",
    );
    if (capture.status !== "COMPLETED") {
      if (capture.status !== "APPROVED") {
        return json({ error: "This PayPal order has not been approved yet. Return to PayPal and complete approval before retrying." }, 409);
      }
      capture = await paypalRequest(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        token,
        "POST",
        {},
        `planetai-capture-${orderId}`,
      );
    }
    const verifiedCapture = verifyCompletedPayPalOrder(capture, submission.id, amount);
    if (!verifiedCapture) {
      console.error("PayPal capture verification mismatch", { orderId, status: capture.status });
      return json({ error: "PayPal did not return a verified payment matching this listing. No promotion was applied." }, 409);
    }

    const { data: completed, error: completeError } = await admin.from("job_payments")
      .update({ provider_capture_id: verifiedCapture.id, status: "completed", confirmed_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (completeError) {
      console.error("PayPal capture succeeded but payment ledger update failed", completeError);
      return json({ error: "PayPal confirms payment, but its ledger confirmation needs administrator attention. Do not pay again." }, 202);
    }
    if (!completed) {
      // Another request may have won the same capture race. Accept only the
      // exact same completed capture; never overwrite a different transaction.
      const { data: currentPayment, error: currentPaymentError } = await admin.from("job_payments")
        .select("status, provider_capture_id").eq("id", payment.id).maybeSingle();
      if (currentPaymentError || currentPayment?.status !== "completed" || currentPayment.provider_capture_id !== verifiedCapture.id) {
        return json({ error: "PayPal confirms payment, but the payment ledger needs administrator reconciliation. Do not pay again." }, 202);
      }
    }

    if (isSpotlight && (!payment.spotlight_reservation_id || !await confirmSpotlightPayment(payment.spotlight_reservation_id, payment.id, verifiedCapture.id))) {
      return json({ paid: true, reconciliation_required: true, error: "PayPal confirms payment, but the Spotlight slot needs administrator reconciliation. Do not pay again." }, 202);
    }
    const published = await ensurePublished(verifiedCapture.id, orderId);
    if (!published) return json({ paid: true, publication_pending: true, error: "Payment is verified. Publication needs administrator attention." }, 202);
    return json({ paid: true, published: true, spotlight_scheduled: isSpotlight, capture_id: verifiedCapture.id });
  }
  return json({ error: "Unsupported PayPal action." }, 400);
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
    console.error("PayPal checkout error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Payment service unavailable." }), { status: 500, headers: { ...corsHeadersFor(req), "Content-Type": "application/json" } });
  }
});
