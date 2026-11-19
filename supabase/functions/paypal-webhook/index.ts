import { createClient } from "npm:@supabase/supabase-js@2";

import { verifyCompletedPayPalOrder } from "../_shared/paypal-validation.ts";
import { getPayPalCaptureOrderId, readPayPalWebhookHeaders } from "../_shared/paypal-webhook.ts";

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
  if (!response.ok || typeof data.access_token !== "string") throw new Error("PayPal authentication failed.");
  return data.access_token as string;
}

async function verifySignature(
  token: string,
  webhookId: string,
  headers: NonNullable<ReturnType<typeof readPayPalWebhookHeaders>>,
  event: unknown,
) {
  const response = await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.auth_algo,
      cert_url: headers.cert_url,
      transmission_id: headers.transmission_id,
      transmission_sig: headers.transmission_sig,
      transmission_time: headers.transmission_time,
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  const result = await response.json();
  return response.ok && result?.verification_status === "SUCCESS";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 65_536) return json({ error: "Webhook payload too large." }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!supabaseUrl || !serviceRoleKey || !webhookId) {
    console.error("PayPal webhook is missing Supabase configuration or PAYPAL_WEBHOOK_ID.");
    return json({ error: "Webhook endpoint is not configured." }, 503);
  }

  const signatureHeaders = readPayPalWebhookHeaders(req.headers);
  if (!signatureHeaders) return json({ error: "Required PayPal signature headers are missing or invalid." }, 400);

  let rawBody = "";
  let event: Record<string, unknown>;
  try {
    rawBody = await req.text();
    if (rawBody.length > 65_536) return json({ error: "Webhook payload too large." }, 413);
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ error: "Invalid webhook event." }, 400);
    }
    event = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid webhook event." }, 400);
  }

  const eventId = typeof event.id === "string" ? event.id.trim() : "";
  const eventType = typeof event.event_type === "string" ? event.event_type.trim() : "";
  if (!eventId || eventId.length > 128 || !eventType || eventType.length > 128) {
    return json({ error: "Webhook event ID or type is missing." }, 400);
  }

  try {
    const token = await paypalToken();
    const verified = await verifySignature(token, webhookId, signatureHeaders, event);
    if (!verified) {
      console.warn("PayPal webhook signature verification failed.", { eventId, eventType });
      return json({ error: "Webhook signature verification failed." }, 401);
    }

    // Only a signed completed capture can grant paid listing publication.
    // Other event types are acknowledged but never mutate payment or listing state.
    const captureReference = getPayPalCaptureOrderId(event);
    if (!captureReference) {
      console.info("Verified PayPal event acknowledged without state mutation.", { eventId, eventType });
      return json({ received: true, processed: false });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: payment, error: paymentError } = await admin.from("job_payments")
      .select("id, submission_id, provider_order_id, provider_capture_id, amount, currency, status")
      .eq("provider", "paypal")
      .eq("provider_order_id", captureReference.orderId)
      .maybeSingle();
    if (paymentError) throw new Error("Payment ledger lookup failed.");
    if (!payment) {
      console.error("Verified PayPal capture has no matching PLANETAI order.", {
        eventId, orderId: captureReference.orderId, captureId: captureReference.captureId,
      });
      return json({ received: true, processed: false, reconciliation_required: true });
    }

    const { data: submission, error: submissionError } = await admin.from("job_submissions")
      .select("id, employer_account_id, reference_code, package_tier, status, job_title, company_name, company_website, company_logo_url, category, employment_type, location, remote_policy, salary_min, salary_max, salary_currency, pay_period, description, requirements, tags, apply_url")
      .eq("id", payment.submission_id)
      .maybeSingle();
    if (submissionError || !submission?.employer_account_id) throw new Error("Employer submission lookup failed.");

    const { data: existingEvent, error: existingEventError } = await admin.from("employer_billing_events")
      .select("id, event_status")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (existingEventError) throw new Error("Webhook event ledger lookup failed.");
    if (existingEvent?.event_status === "processed" || existingEvent?.event_status === "ignored") {
      return json({ received: true, duplicate: true });
    }

    let eventRowId = existingEvent?.id;
    if (!eventRowId) {
      const { data: insertedEvent, error: insertEventError } = await admin.from("employer_billing_events")
        .insert({
          employer_account_id: submission.employer_account_id,
          billing_provider: "paypal",
          provider_event_id: eventId,
          event_type: eventType,
          event_status: "received",
          amount_minor: Math.round(Number(payment.amount) * 100),
          currency: payment.currency,
          payload: { order_id: captureReference.orderId, capture_id: captureReference.captureId, resource_id: captureReference.resourceId },
        })
        .select("id")
        .maybeSingle();
      if (insertEventError?.code === "23505") {
        const { data: racedEvent, error: racedEventError } = await admin.from("employer_billing_events")
          .select("id, event_status").eq("provider_event_id", eventId).maybeSingle();
        if (racedEventError || !racedEvent) throw new Error("Webhook deduplication lookup failed.");
        if (racedEvent.event_status === "processed" || racedEvent.event_status === "ignored") {
          return json({ received: true, duplicate: true });
        }
        eventRowId = racedEvent.id;
      } else if (insertEventError || !insertedEvent) {
        throw new Error("Webhook event could not be recorded.");
      } else {
        eventRowId = insertedEvent.id;
      }
    } else {
      const { error: retryEventError } = await admin.from("employer_billing_events")
        .update({ event_status: "received", payload: { order_id: captureReference.orderId, capture_id: captureReference.captureId } })
        .eq("id", eventRowId);
      if (retryEventError) throw new Error("Webhook retry could not be recorded.");
    }

    if (["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED", "PAYMENT.CAPTURE.DENIED"].includes(eventType)) {
      // Provider-side reversals are recorded for manual reconciliation. A
      // partial refund must never silently cancel a whole listing or be
      // represented as a full refund in the payment ledger.
      await admin.from("employer_billing_events")
        .update({
          event_status: "failed",
          payload: { order_id: captureReference.orderId, capture_id: captureReference.captureId, resource_id: captureReference.resourceId, manual_reconciliation_required: true },
        })
        .eq("id", eventRowId);
      console.error("PayPal refund/reversal/denial requires administrator reconciliation.", {
        eventId, eventType, orderId: captureReference.orderId, captureId: captureReference.captureId,
      });
      return json({ received: true, reconciliation_required: true });
    }

    const expectedAmount = priceFor(submission.package_tier);
    if (!expectedAmount || Number(payment.amount).toFixed(2) !== expectedAmount ||
        payment.currency.trim() !== "USD" || payment.provider_order_id !== captureReference.orderId) {
      await admin.from("employer_billing_events").update({ event_status: "failed" }).eq("id", eventRowId);
      return json({ received: true, reconciliation_required: true });
    }

    const orderResponse = await fetch(
      `${paypalBase()}/v2/checkout/orders/${encodeURIComponent(captureReference.orderId)}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );
    const order = await orderResponse.json();
    if (!orderResponse.ok) throw new Error("PayPal order could not be retrieved for reconciliation.");
    const verifiedCapture = verifyCompletedPayPalOrder(order, submission.id, expectedAmount);
    if (!verifiedCapture || verifiedCapture.id !== captureReference.captureId) {
      await admin.from("employer_billing_events").update({ event_status: "failed" }).eq("id", eventRowId);
      return json({ received: true, reconciliation_required: true });
    }

    if (payment.status === "completed") {
      if (payment.provider_capture_id !== verifiedCapture.id) {
        await admin.from("employer_billing_events").update({ event_status: "failed" }).eq("id", eventRowId);
        return json({ received: true, reconciliation_required: true });
      }
    } else if (payment.status === "pending") {
      const { data: completed, error: completeError } = await admin.from("job_payments")
        .update({
          provider_capture_id: verifiedCapture.id,
          status: "completed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (completeError) throw new Error("Verified payment could not be reconciled to the ledger.");
      if (!completed) {
        const { data: current, error: currentError } = await admin.from("job_payments")
          .select("status, provider_capture_id").eq("id", payment.id).maybeSingle();
        if (currentError || current?.status !== "completed" || current.provider_capture_id !== verifiedCapture.id) {
          throw new Error("Concurrent payment reconciliation needs administrator review.");
        }
      }
    } else {
      await admin.from("employer_billing_events").update({ event_status: "failed" }).eq("id", eventRowId);
      return json({ received: true, reconciliation_required: true });
    }

    const { data: existingJob, error: existingJobError } = await admin.from("jobs")
      .select("id").eq("submission_id", submission.id).maybeSingle();
    if (existingJobError) throw new Error("Published listing lookup failed.");
    if (!existingJob) {
      const slug = `${submission.job_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70)}-${submission.reference_code.toLowerCase()}`;
      const { error: publishError } = await admin.from("jobs").insert({
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
      if (publishError) {
        const { data: racedJob, error: racedJobError } = await admin.from("jobs")
          .select("id").eq("submission_id", submission.id).maybeSingle();
        if (racedJobError || !racedJob) throw new Error("Verified payment is recorded but listing publication needs reconciliation.");
      }
    }

    const { data: published, error: publishStatusError } = await admin.from("job_submissions")
      .update({ status: "published" })
      .eq("id", submission.id)
      .in("status", ["approved_awaiting_payment", "published"])
      .select("id")
      .maybeSingle();
    if (publishStatusError || !published) throw new Error("Verified payment is recorded but submission status needs reconciliation.");

    await admin.from("marketplace_audit_events").insert({
      submission_id: submission.id,
      event_type: "paypal_webhook_payment_reconciled",
      details: { event_id: eventId, order_id: captureReference.orderId, capture_id: verifiedCapture.id, amount: expectedAmount, currency: "USD" },
    });
    const { error: markProcessedError } = await admin.from("employer_billing_events")
      .update({ event_status: "processed", processed_at: new Date().toISOString() })
      .eq("id", eventRowId);
    if (markProcessedError) throw new Error("Payment is reconciled but webhook event status needs attention.");

    return json({ received: true, processed: true });
  } catch (error) {
    console.error("PayPal webhook processing failed.", error);
    return json({ error: "Webhook processing failed; PayPal may retry this delivery." }, 500);
  }
});
