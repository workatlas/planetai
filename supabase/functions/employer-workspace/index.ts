import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const userId = ctx.userClaims?.sub;
  const userEmail = typeof ctx.userClaims?.email === "string" ? ctx.userClaims.email : null;
  if (!userId) return json({ error: "Authentication required" }, 401);

  let body: { company_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "A valid JSON request body is required." }, 400);
  }

  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
  if (companyName.length < 2 || companyName.length > 100) {
    return json({ error: "Company name must be between 2 and 100 characters." }, 400);
  }

  const admin = ctx.supabaseAdmin;
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
      console.error("Employer workspace creation failed", createError);
      return json({ error: "We could not create your employer workspace." }, 500);
    }
    account = created;
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
