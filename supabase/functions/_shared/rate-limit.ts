type RateLimitClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Returns true when allowed, false when the caller exceeded its window,
 * and null when the limiter could not be reached (callers should fail closed).
 */
export async function checkRateLimit(
  admin: unknown,
  scope: string,
  subject: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean | null> {
  const client = admin as RateLimitClient;
  const { data, error } = await client.rpc("consume_edge_rate_limit", {
    p_scope: scope,
    p_subject: subject,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });
  if (error) {
    console.error("Rate-limit check failed", error);
    return null;
  }
  return data === true;
}
