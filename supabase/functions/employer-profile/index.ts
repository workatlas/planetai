import { withSupabase } from "npm:@supabase/server@1";

import { corsHeadersFor, isAllowedOrigin } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required" }, 401);

  const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    return json({ error: "Your sign-in session could not be verified. Please sign in again." }, 401);
  }
  if (!authData.user.email_confirmed_at) {
    return json({ error: "Confirm your email address before managing your company profile." }, 403);
  }

  let body: { action?: unknown; profile?: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return json({ error: "A valid JSON request body is required." }, 400); }

  const admin = ctx.supabaseAdmin;
  const rateLimit = await checkRateLimit(admin, "employer-profile", userId, 30, 60);
  if (rateLimit === null) return json({ error: "Profile protection is temporarily unavailable." }, 503);
  if (!rateLimit) return json({ error: "Too many profile requests. Please slow down." }, 429);

  const { data: account, error: lookupError } = await admin
    .from("employer_accounts")
    .select("id, owner_user_id, company_name, company_website, company_logo_url, company_cover_image_url, company_description, company_location, contact_email")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (lookupError) {
    console.error("Employer profile lookup failed", lookupError);
    return json({ error: "We could not load your company profile." }, 500);
  }
  if (!account) return json({ error: "Your employer workspace was not found." }, 404);

  if (body.action === "get") {
    const { owner_user_id: _owner, ...safeAccount } = account;
    return json({ account: safeAccount });
  }
  if (body.action !== "update") return json({ error: "Unsupported profile action." }, 400);

  const input = body.profile ?? {};
  const companyName = typeof input.company_name === "string" ? input.company_name.trim() : undefined;
  const website = typeof input.company_website === "string" ? input.company_website.trim() : undefined;
  const description = typeof input.company_description === "string" ? input.company_description.trim() : undefined;
  const location = typeof input.company_location === "string" ? input.company_location.trim() : undefined;
  const contactEmail = typeof input.contact_email === "string" ? input.contact_email.trim() : undefined;
  const logoUrl = typeof input.company_logo_url === "string" ? input.company_logo_url.trim() : undefined;
  const coverUrl = typeof input.company_cover_image_url === "string" ? input.company_cover_image_url.trim() : undefined;

  if (companyName !== undefined && (companyName.length < 2 || companyName.length > 100)) return json({ error: "Company name must be between 2 and 100 characters." }, 400);
  if (website !== undefined && (website.length > 255 || (website && !(website.startsWith("https://") || website.startsWith("http://"))))) return json({ error: "Enter a valid company website beginning with https:// or http://." }, 400);
  if (description !== undefined && description.length > 2000) return json({ error: "Company description must be 2,000 characters or fewer." }, 400);
  if (location !== undefined && location.length > 120) return json({ error: "Location must be 120 characters or fewer." }, 400);
  if (contactEmail !== undefined && (contactEmail.length > 254 || (contactEmail && (contactEmail.includes(" ") || contactEmail.split("@").length !== 2 || !contactEmail.split("@")[1].includes("."))))) return json({ error: "Enter a valid contact email address." }, 400);

  const storageBase = Deno.env.get("SUPABASE_URL") + "/storage/v1/object/public/employer-branding/" + userId + "/";
  if (logoUrl !== undefined && logoUrl && !logoUrl.startsWith(storageBase + "logo-")) return json({ error: "Company logo must be uploaded to your verified company branding storage." }, 400);
  if (coverUrl !== undefined && coverUrl && !coverUrl.startsWith(storageBase + "cover-")) return json({ error: "Company cover image must be uploaded to your verified company branding storage." }, 400);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (companyName !== undefined) updates.company_name = companyName;
  if (website !== undefined) updates.company_website = website || null;
  if (description !== undefined) updates.company_description = description || null;
  if (location !== undefined) updates.company_location = location || null;
  if (contactEmail !== undefined) updates.contact_email = contactEmail || null;
  if (logoUrl !== undefined) updates.company_logo_url = logoUrl || null;
  if (coverUrl !== undefined) updates.company_cover_image_url = coverUrl || null;

  const { data: updated, error: updateError } = await admin
    .from("employer_accounts")
    .update(updates)
    .eq("id", account.id)
    .eq("owner_user_id", userId)
    .select("id, company_name, company_website, company_logo_url, company_cover_image_url, company_description, company_location, contact_email")
    .single();

  if (updateError) {
    console.error("Employer profile update failed", updateError);
    return json({ error: "We could not save your company profile. Please try again." }, 500);
  }
  return json({ account: updated });
});

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return new Response("Origin not allowed.", { status: 403, headers: corsHeadersFor(req) });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeadersFor(req))) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
