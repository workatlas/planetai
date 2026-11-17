import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const slugify = (value: string) => value.toLowerCase().normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "job";

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required." }, 401);

  const admin = ctx.supabaseAdmin;
  const { data: adminRecord, error: adminError } = await admin
    .from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  if (adminError) {
    console.error("Admin authorization lookup failed", adminError);
    return json({ error: "Administrator access could not be verified." }, 500);
  }
  if (!adminRecord) return json({ error: "Administrator access required." }, 403);

  let body: { action?: string; submission_id?: string; decision?: string; notes?: string };
  try { body = await req.json(); } catch { return json({ error: "A valid JSON body is required." }, 400); }

  if (body.action === "list") {
    const { data, error } = await admin.from("job_submissions")
      .select("id, reference_code, employer_name, employer_email, company_name, company_website, company_logo_url, job_title, category, employment_type, location, remote_policy, salary_min, salary_max, salary_currency, pay_period, description, requirements, tags, apply_url, package_tier, verified_employer_addon, status, submitted_at, reviewed_at, review_notes")
      .in("status", ["pending_review", "email_verification_pending", "approved_awaiting_payment", "ready_to_publish", "published", "rejected"])
      .order("submitted_at", { ascending: false }).limit(200);
    if (error) {
      console.error("Admin submission list failed", error);
      return json({ error: "Could not load submissions." }, 500);
    }
    const ids = (data ?? []).map((row) => row.id);
    const payments = ids.length ? await admin.from("job_payments")
      .select("submission_id, provider_order_id, provider_capture_id, amount, currency, status, confirmed_at")
      .in("submission_id", ids) : { data: [], error: null };
    if (payments.error) console.error("Payment list lookup failed", payments.error);
    return json({ submissions: data ?? [], payments: payments.data ?? [] });
  }

  if (body.action !== "review") return json({ error: "Unsupported action." }, 400);
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
  const decision = body.decision;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!/^[0-9a-f-]{36}$/i.test(submissionId) || !["approve", "reject"].includes(decision ?? "")) {
    return json({ error: "A valid submission and review decision are required." }, 400);
  }

  const { data: submission, error: loadError } = await admin.from("job_submissions")
    .select("*").eq("id", submissionId).maybeSingle();
  if (loadError || !submission) return json({ error: "Submission not found." }, 404);
  if (submission.status === "published" && decision === "approve") {
    return json({ submission: { id: submissionId, status: "published" }, next_step: "This listing is already published." });
  }
  const canStartReview = submission.status === "pending_review";
  const canResumeFreePublication = submission.status === "ready_to_publish" &&
    decision === "approve" && submission.package_tier === "standard";
  if (!canStartReview && !canResumeFreePublication) {
    return json({ error: "This submission is not in a state that supports this action." }, 409);
  }

  if (decision === "reject" && !canStartReview) {
    return json({ error: "Only submissions awaiting review can be rejected." }, 409);
  }

  if (decision === "reject") {
    const { data: updated, error } = await admin.from("job_submissions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: userId, review_notes: notes || null })
      .eq("id", submissionId).eq("status", "pending_review").select("id, status").maybeSingle();
    if (error || !updated) return json({ error: "The submission changed or could not be rejected. Refresh and try again." }, 409);
    await admin.from("marketplace_audit_events").insert({
      actor_user_id: userId, submission_id: submissionId, event_type: "job_submission_rejected",
      details: { notes },
    });
    return json({ submission: updated });
  }

  if (submission.package_tier !== "standard" && submission.package_tier !== "featured") {
    return json({ error: "This listing package is not available for approval yet." }, 400);
  }

  if (submission.package_tier !== "standard") {
    const { data: updated, error } = await admin.from("job_submissions")
      .update({ status: "approved_awaiting_payment", reviewed_at: new Date().toISOString(), reviewed_by: userId, review_notes: notes || null })
      .eq("id", submissionId).eq("status", "pending_review").select("id, status").maybeSingle();
    if (error || !updated) return json({ error: "The submission changed or could not be approved. Refresh and try again." }, 409);
    await admin.from("marketplace_audit_events").insert({
      actor_user_id: userId, submission_id: submissionId, event_type: "job_submission_approved_awaiting_payment",
      details: { package_tier: submission.package_tier, notes },
    });
    return json({ submission: updated, next_step: "Payment is required before publication." });
  }

  if (canStartReview) {
    const { data: claimed, error: claimError } = await admin.from("job_submissions")
      .update({ status: "ready_to_publish", reviewed_at: new Date().toISOString(), reviewed_by: userId, review_notes: notes || null })
      .eq("id", submissionId).eq("status", "pending_review").select("id").maybeSingle();
    if (claimError || !claimed) return json({ error: "The submission changed or could not be approved. Refresh and try again." }, 409);
  }

  const { data: existingJob, error: existingJobError } = await admin.from("jobs")
    .select("id").eq("submission_id", submissionId).maybeSingle();
  if (existingJobError) {
    console.error("Existing publication lookup failed", existingJobError);
    return json({ error: "Could not verify whether this listing was already published. Please retry." }, 500);
  }

  if (!existingJob) {
    const slug = `${slugify(submission.job_title)}-${submission.reference_code.toLowerCase()}`;
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
    featured: false,
    verified_employer: false,
    status: "published",
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
    if (publishError) {
      console.error("Approved free listing publication failed", publishError);
      // A network failure can occur after the insert committed. Check once before
      // returning an error so a retry cannot create a duplicate listing.
      const { data: recoveredJob } = await admin.from("jobs")
        .select("id").eq("submission_id", submissionId).maybeSingle();
      if (!recoveredJob) {
        return json({ error: "The listing could not be published yet. It remains ready to publish; an administrator can safely retry." }, 500);
      }
    }
  }

  const { data: publishedStatus, error: publishedStatusError } = await admin.from("job_submissions")
    .update({ status: "published" }).eq("id", submissionId).eq("status", "ready_to_publish")
    .select("id, status").maybeSingle();
  if (publishedStatusError || !publishedStatus) {
    console.error("Free listing status update needs recovery", publishedStatusError);
    return json({ error: "The job exists, but its submission status needs reconciliation. Retry the publish action safely." }, 500);
  }
  await admin.from("marketplace_audit_events").insert({
    actor_user_id: userId, submission_id: submissionId, event_type: "free_job_approved_and_published",
    details: { package_tier: "standard", notes },
  });
  return json({ submission: { id: submissionId, status: "published" }, next_step: "Free listing approved and published." });
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
