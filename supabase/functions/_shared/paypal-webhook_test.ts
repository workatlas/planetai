import { assertEquals } from "jsr:@std/assert@1";
import { getPayPalCaptureOrderId, readPayPalWebhookHeaders } from "./paypal-webhook.ts";

Deno.test("reads required PayPal signature headers and accepts PayPal certificate host", () => {
  const headers = new Headers({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api-m.paypal.com/v1/notifications/certs/CERT-123",
    "paypal-transmission-id": "transmission-123",
    "paypal-transmission-sig": "signature",
    "paypal-transmission-time": "2026-11-19T08:00:00Z",
  });
  assertEquals(readPayPalWebhookHeaders(headers)?.transmission_id, "transmission-123");
});

Deno.test("rejects missing signature headers and non-PayPal certificate hosts", () => {
  assertEquals(readPayPalWebhookHeaders(new Headers()), null);
  const headers = new Headers({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://attacker.example/cert",
    "paypal-transmission-id": "transmission-123",
    "paypal-transmission-sig": "signature",
    "paypal-transmission-time": "2026-11-19T08:00:00Z",
  });
  assertEquals(readPayPalWebhookHeaders(headers), null);
});

Deno.test("extracts the related order and capture IDs for completed and reversed capture events", () => {
  assertEquals(getPayPalCaptureOrderId({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { id: "CAPTURE-1", supplementary_data: { related_ids: { order_id: "ORDER-1" } } },
  }), { orderId: "ORDER-1", captureId: "CAPTURE-1", resourceId: "CAPTURE-1" });
  assertEquals(getPayPalCaptureOrderId({
    event_type: "PAYMENT.CAPTURE.REFUNDED",
    resource: { id: "CAPTURE-1", supplementary_data: { related_ids: { order_id: "ORDER-1" } } },
  }), { orderId: "ORDER-1", captureId: "CAPTURE-1", resourceId: "CAPTURE-1" });
  assertEquals(getPayPalCaptureOrderId({
    event_type: "PAYMENT.CAPTURE.REFUNDED",
    resource: { id: "REFUND-1", supplementary_data: { related_ids: { order_id: "ORDER-1", capture_id: "CAPTURE-1" } } },
  }), { orderId: "ORDER-1", captureId: "CAPTURE-1", resourceId: "REFUND-1" });
  assertEquals(getPayPalCaptureOrderId({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { id: "CAPTURE-1" },
  }), null);
});
