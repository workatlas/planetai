import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "Authentication required" }, 401);

  let body: { action?: unknown; profile?: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return json({ error: "A valid JSON request body is required." }, 400); }

  const admin = ctx.supabaseAdmin;
  const { data: account, error: lookupError } = await admin
    .from("employer_accounts")
    .select("id, owner_user_id, company_name, company_website, company_logo_url, company_description, company_location, contact_email")
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
  const companyName = typeof input.company_name === "string" ? input.company_name.trim() : "";
  const website = typeof input.company_website === "string" ? input.company_website.trim() : "";
  const description = typeof input.company_description === "string" ? input.company_description.trim() : "";
  const location = typeof input.company_location === "string" ? input.company_location.trim() : "";
  const contactEmail = typeof input.contact_email === "string" ? input.contact_email.trim() : "";

  if (companyName.length < 2 || companyName.length > 100) return json({ error: "Company name must be between 2 and 100 characters." }, 400);
  if (website.length > 255 || (website && !/^https?:\/\//i.test(website))) return json({ error: "Enter a valid company website beginning with https:// or http://." }, 400);
  if (description.length > 2000) return json({ error: "Company description must be 2,000 characters or fewer." }, 400);
  if (location.length > 120) return json({ error: "Location must be 120 characters or fewer." }, 400);
  if (contactEmail.length > 254 || (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) return json({ error: "Enter a valid contact email address." }, 400);

  const { data: updated, error: updateError } = await admin
    .from("employer_accounts")
    .update({
      company_name: companyName,
      company_website: website || null,
      company_description: description || null,
      company_location: location || null,
      contact_email: contactEmail || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .eq("owner_user_id", userId)
    .select("id, company_name, company_website, company_logo_url, company_description, company_location, contact_email")
    .single();

  if (updateError) {
    console.error("Employer profile update failed", updateError);
    return json({ error: "We could not save your company profile. Please try again." }, 500);
  }
  return json({ account: updated });
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
