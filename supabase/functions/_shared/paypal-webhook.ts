export type PayPalWebhookHeaders = {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  };

export function readPayPalWebhookHeaders(headers: Headers): PayPalWebhookHeaders | null {
  const fields = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
  };
  if (Object.values(fields).some((value) => !value || value.length > 2048)) return null;
  try {
    const certUrl = new URL(fields.cert_url!);
    if (certUrl.protocol !== "https:" || !/(^|\\.)paypal\\.com$/i.test(certUrl.hostname)) return null;
  } catch {
    return null;
  }
  return {
    auth_algo: fields.auth_algo!,
    cert_url: fields.cert_url!,
    transmission_id: fields.transmission_id!,
    transmission_sig: fields.transmission_sig!,
    transmission_time: fields.transmission_time!,
  };
}

export function getPayPalCaptureOrderId(event: unknown): { orderId: string; captureId: string } | null {
  if (!event || typeof event !== "object") return null;
  const value = event as {
    event_type?: unknown;
    resource?: {
      id?: unknown;
      supplementary_data?: { related_ids?: { order_id?: unknown } };
    };
  };
  if (value.event_type !== "PAYMENT.CAPTURE.COMPLETED") return null;
  const orderId = value.resource?.supplementary_data?.related_ids?.order_id;
  const captureId = value.resource?.id;
  if (typeof orderId !== "string" || !orderId.trim() ||
      typeof captureId !== "string" || !captureId.trim()) return null;
  return { orderId: orderId.trim(), captureId: captureId.trim() };
}
