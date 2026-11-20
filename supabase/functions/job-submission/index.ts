import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeadersFor, isAllowedOrigin } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const PLACEHOLDER_HOSTS = new Set(["test.com", "example.com", "example.org", "example.net", "localhost"]);
const SHORTENER_HOSTS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly"]);
const safeHttpsUrl = (value: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const rawHost = url.hostname.toLowerCase();
    const host = rawHost.startsWith("www.") ? rawHost.slice(4) : rawHost;
    if (url.protocol !== "https:") return null;
    if (PLACEHOLDER_HOSTS.has(host) || host.endsWith(".invalid") || host.endsWith(".example") || SHORTENER_HOSTS.has(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const handler = async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("Job submission function is missing Supabase environment configuration.");
    return json({ error: "Job submission is temporarily unavailable." }, 503);
  }

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 32_768) return json({ error: "The submission request is too large." }, 413);

  let body: Record<string, unknown>;
  try {
    const rawBody = await req.text();
    if (rawBody.length > 32_768) return json({ error: "The submission request is too large." }, 413);
    body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "A valid JSON request body is required." }, 400);
    }
  } catch {
    return json({ error: "A valid JSON request body is required." }, 400);
  }

  // Honeypot: silently reject automated submissions without creating a record.
  if (clean(body.bot_check, 200)) return json({ error: "Submission rejected." }, 400);

  const company = clean(body.company, 100);
  const title = clean(body.title, 120);
  const email = clean(body.contact_email, 254).toLowerCase();
  const location = clean(body.location, 120) || "Worldwide Remote";
  const description = clean(body.description, 4000);
  const category = clean(body.category, 80);
  const employmentType = clean(body.employment_type, 80);
  const remotePolicy = clean(body.remote_policy, 40) || "Remote";
  const websiteRaw = clean(body.company_website, 500);
  const logoRaw = clean(body.company_logo_url, 500);
  const applyRaw = clean(body.apply_url, 500);
  const min = body.salary_min === null || body.salary_min === undefined ? null : Number(body.salary_min);
  const max = body.salary_max === null || body.salary_max === undefined ? null : Number(body.salary_max);
  const payPeriod = clean(body.pay_period, 30);
  const requirements = Array.isArray(body.requirements)
    ? body.requirements.map((v) => clean(v, 180)).filter(Boolean).slice(0, 10)
    : [];
  const tags = Array.isArray(body.tags)
    ? body.tags.map((v) => clean(v, 40)).filter(Boolean).slice(0, 10)
    : [];

  if (company.length < 2 || title.length < 3 || !validEmail(email)) {
    return json({ error: "Enter a valid company name, job title, and contact email." }, 400);
  }
  if (!category || !employmentType || !location || description.length < 80) {
    return json({ error: "Complete the role category, work type, location, and a role overview of at least 80 characters." }, 400);
  }
  if (requirements.length < 2 || requirements.some((item) => item.length < 8)) {
    return json({ error: "Provide at least two specific qualifications or setup requirements." }, 400);
  }
  if (min !== null && (!Number.isFinite(min) || min < 0 || min > 10000000)) {
    return json({ error: "Enter a valid minimum salary." }, 400);
  }
  if (max !== null && (!Number.isFinite(max) || max < 0 || max > 10000000)) {
    return json({ error: "Enter a valid maximum salary." }, 400);
  }
  if (min !== null && max !== null && max < min) {
    return json({ error: "Maximum salary must be greater than or equal to minimum salary." }, 400);
  }

  const website = websiteRaw ? safeHttpsUrl(websiteRaw) : null;
  const logo = logoRaw ? safeHttpsUrl(logoRaw) : null;
  const applyUrl = safeHttpsUrl(applyRaw);
  if ((websiteRaw && !website) || (logoRaw && !logo) || !applyUrl) {
    return json({ error: "Company, logo, and application links must be valid HTTPS URLs. Shortened links are not accepted." }, 400);
  }

  // Paid listing requests are accepted for authenticated employer workspaces only.
  // They remain pending moderation; no paid visibility is granted at submission time.
  const requestedTier = clean(body.package_tier, 30) || "standard";
  if (!["standard", "free", "featured"].includes(requestedTier)) {
    return json({ error: "Choose an available listing package. Spotlight is not available yet." }, 400);
  }
  if (body.verified_employer_addon === true || body.verified === true) {
    return json({ error: "Employer verification is based on review and cannot be purchased." }, 400);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  const authorization = req.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data.user) return json({ error: "Your sign-in session could not be verified. Please sign in again." }, 401);
    if (!data.user.email_confirmed_at) {
      return json({ error: "Confirm your email address before submitting a job listing." }, 403);
    }
    userId = data.user.id;
  }

  if (!userId) return json({ error: "Create or sign in to your employer workspace before submitting a listing." }, 401);

  const { data: membership, error: memberError } = await admin
    .from("employer_members")
    .select("employer_account_id, member_role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (memberError) {
    console.error("Employer membership lookup failed", memberError);
    return json({ error: "We could not verify your employer workspace." }, 500);
  }
  if (!membership?.employer_account_id) {
    return json({ error: "Create your free employer workspace before submitting a job listing." }, 403);
  }
  if (![ "owner", "admin", "recruiter" ].includes(membership.member_role)) {
    return json({ error: "Your employer workspace role does not allow job submissions." }, 403);
  }
  const employerAccountId = membership.employer_account_id;
  const rateLimit = await checkRateLimit(admin, "job-submission", userId, 5, 900);
  if (rateLimit === null) return json({ error: "Submission protection is temporarily unavailable. Please try again shortly." }, 503);
  if (!rateLimit) return json({ error: "Too many submissions. Please wait 15 minutes before trying again." }, 429);

  const referenceCode = `PAI-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const status = "pending_review";

  const { data: submission, error: insertError } = await admin
    .from("job_submissions")
    .insert({
      reference_code: referenceCode,
      employer_name: company,
      employer_email: email,
      company_name: company,
      company_website: website,
      company_logo_url: logo,
      job_title: title,
      category,
      employment_type: employmentType,
      location,
      remote_policy: remotePolicy,
      salary_min: min,
      salary_max: max,
      salary_currency: "USD",
      pay_period: payPeriod || null,
      description,
      requirements,
      tags,
      apply_url: applyUrl,
      package_tier: requestedTier === "free" ? "standard" : requestedTier,
      verified_employer_addon: false,
      status,
      employer_account_id: employerAccountId,
    })
    .select("id, reference_code, status, submitted_at")
    .single();

  if (insertError || !submission) {
    console.error("Job submission insert failed", insertError);
    return json({ error: "We could not save your job submission. Please try again." }, 500);
  }

  const { error: auditError } = await admin.from("marketplace_audit_events").insert({
    actor_user_id: userId,
    submission_id: submission.id,
    event_type: "job_submission_created",
    details: {
      reference_code: referenceCode,
      channel: "authenticated_employer",
      package_tier: requestedTier === "free" ? "standard" : requestedTier,
      status,
    },
  });
  if (auditError) console.error("Job submission audit event failed", auditError);

  return json({
    submission: {
      reference_code: submission.reference_code,
      status: submission.status,
      submitted_at: submission.submitted_at,
    },
    next_step: "Your submission is saved and awaiting moderation.",
    email_verification_delivery: "not_required_verified_employer_session",
  }, 201);
};

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return new Response("Origin not allowed.", { status: 403, headers: corsHeadersFor(req) });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  try {
    const response = await handler(req);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeadersFor(req))) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.error("Unhandled job submission error", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred while submitting your job." }), { status: 500, headers: { ...corsHeadersFor(req), "Content-Type": "application/json" } });
  }
});
