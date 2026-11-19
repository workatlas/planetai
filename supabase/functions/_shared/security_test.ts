import { corsHeadersFor, isAllowedOrigin } from "./cors.ts";
import { checkRateLimit } from "./rate-limit.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("CORS allows the production origin exactly", () => {
  const request = new Request("https://project.example/functions/v1/test", {
    headers: { Origin: "https://planetai-global.netlify.app" },
  });
  assert(isAllowedOrigin(request), "production origin should be allowed");
  assert(
    corsHeadersFor(request)["Access-Control-Allow-Origin"] === "https://planetai-global.netlify.app",
    "allowed origin should be echoed",
  );
});

Deno.test("CORS rejects unlisted origins without reflecting them", () => {
  const request = new Request("https://project.example/functions/v1/test", {
    headers: { Origin: "https://attacker.example" },
  });
  assert(!isAllowedOrigin(request), "unlisted origin should be rejected");
  assert(
    !("Access-Control-Allow-Origin" in corsHeadersFor(request)),
    "unlisted origin must not receive an allow-origin header",
  );
});

Deno.test("CORS permits server-to-server requests without an Origin header", () => {
  const request = new Request("https://project.example/functions/v1/test");
  assert(isAllowedOrigin(request), "requests without Origin are permitted by the shared helper");
  assert(
    !("Access-Control-Allow-Origin" in corsHeadersFor(request)),
    "no origin should not produce an allow-origin header",
  );
});

Deno.test("CORS supports an explicitly configured exact origin", () => {
  const previous = Deno.env.get("APP_ALLOWED_ORIGINS");
  try {
    Deno.env.set("APP_ALLOWED_ORIGINS", "https://custom.planetai.example, https://other.example");
    const request = new Request("https://project.example/functions/v1/test", {
      headers: { Origin: "https://custom.planetai.example" },
    });
    assert(isAllowedOrigin(request), "configured origin should be allowed");
    assert(
      corsHeadersFor(request)["Access-Control-Allow-Origin"] === "https://custom.planetai.example",
      "configured origin should be echoed exactly",
    );
  } finally {
    if (previous === undefined) Deno.env.delete("APP_ALLOWED_ORIGINS");
    else Deno.env.set("APP_ALLOWED_ORIGINS", previous);
  }
});

Deno.test("rate limiter returns the RPC allow decision and sends the expected arguments", async () => {
  let receivedName = "";
  let receivedArgs: Record<string, unknown> = {};
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      receivedName = name;
      receivedArgs = args;
      return { data: true, error: null };
    },
  };
  const result = await checkRateLimit(client, "checkout", "user-123", 12, 600);
  assert(result === true, "successful true RPC result should allow the request");
  assert(receivedName === "consume_edge_rate_limit", "expected atomic limiter RPC");
  assert(receivedArgs.p_scope === "checkout", "scope should be forwarded");
  assert(receivedArgs.p_subject === "user-123", "subject should be forwarded");
  assert(receivedArgs.p_max_requests === 12, "request limit should be forwarded");
  assert(receivedArgs.p_window_seconds === 600, "window should be forwarded");
});

Deno.test("rate limiter rejects a false RPC decision", async () => {
  const client = { rpc: async () => ({ data: false, error: null }) };
  const result = await checkRateLimit(client, "checkout", "user-123", 12, 600);
  assert(result === false, "false RPC result should deny the request");
});

Deno.test("rate limiter fails closed when the RPC returns an error", async () => {
  const client = { rpc: async () => ({ data: null, error: new Error("database unavailable") }) };
  const result = await checkRateLimit(client, "checkout", "user-123", 12, 600);
  assert(result === null, "RPC errors must return null so callers can fail closed");
});
