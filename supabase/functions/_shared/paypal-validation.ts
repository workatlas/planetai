export type VerifiedPayPalCapture = {
  id: string;
  status: "COMPLETED";
  amount: {
    currency_code: "USD";
    value: string;
  };
};

/**
 * Accept only a single completed purchase unit and a single completed capture
 * whose listing reference, currency, and exact two-decimal amount match.
 * Browser redirects and unverified provider payloads must never authorize a
 * paid listing.
 */
export function verifyCompletedPayPalOrder(
  order: unknown,
  expectedSubmissionId: string,
  expectedAmount: string,
): VerifiedPayPalCapture | null {
  if (!order || typeof order !== "object") return null;
  const candidate = order as {
    status?: unknown;
    purchase_units?: Array<{
      custom_id?: unknown;
      payments?: {
        captures?: Array<{
          id?: unknown;
          status?: unknown;
          amount?: { currency_code?: unknown; value?: unknown };
        }>;
      };
    }>;
  };
  if (candidate.status !== "COMPLETED" || !Array.isArray(candidate.purchase_units) ||
      candidate.purchase_units.length !== 1) return null;

  const unit = candidate.purchase_units[0];
  if (unit.custom_id !== expectedSubmissionId) return null;
  const captures = unit.payments?.captures;
  if (!Array.isArray(captures) || captures.length !== 1 || captures[0]?.status !== "COMPLETED") return null;

  const capture = captures[0];
  const id = typeof capture.id === "string" ? capture.id.trim() : "";
  const currency = capture.amount?.currency_code;
  const value = capture.amount?.value;
  if (!id || currency !== "USD" || typeof value !== "string" ||
      !/^\d+\.\d{2}$/.test(value) || value !== expectedAmount ||
      !/^\d+\.\d{2}$/.test(expectedAmount)) return null;

  return {
    id,
    status: "COMPLETED",
    amount: { currency_code: "USD", value },
  };
}
