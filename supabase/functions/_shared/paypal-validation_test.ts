import { verifyCompletedPayPalOrder } from "./paypal-validation.ts";

const validOrder = () => ({
  id: "ORDER-123",
  status: "COMPLETED",
  purchase_units: [{
    custom_id: "submission-123",
    payments: {
      captures: [{
        id: "CAPTURE-456",
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "49.00" },
      }],
    },
  }],
});

Deno.test("accepts an exact completed listing capture", () => {
  const result = verifyCompletedPayPalOrder(validOrder(), "submission-123", "49.00");
  if (result?.id !== "CAPTURE-456") throw new Error("expected verified capture ID");
});

Deno.test("rejects an incomplete order", () => {
  const order = validOrder();
  order.status = "APPROVED";
  if (verifyCompletedPayPalOrder(order, "submission-123", "49.00") !== null) {
    throw new Error("approved orders must not be treated as captured");
  }
});

Deno.test("rejects a capture for a different submission", () => {
  if (verifyCompletedPayPalOrder(validOrder(), "another-submission", "49.00") !== null) {
    throw new Error("wrong listing reference must be rejected");
  }
});

Deno.test("rejects a currency mismatch", () => {
  const order = validOrder();
  order.purchase_units[0].payments.captures[0].amount.currency_code = "PHP";
  if (verifyCompletedPayPalOrder(order, "submission-123", "49.00") !== null) {
    throw new Error("non-USD capture must be rejected");
  }
});

Deno.test("rejects an amount mismatch", () => {
  const order = validOrder();
  order.purchase_units[0].payments.captures[0].amount.value = "48.99";
  if (verifyCompletedPayPalOrder(order, "submission-123", "49.00") !== null) {
    throw new Error("incorrect amount must be rejected");
  }
});

Deno.test("rejects an additional pending capture alongside a completed capture", () => {
  const order = validOrder();
  order.purchase_units[0].payments.captures.push({
    id: "CAPTURE-PENDING",
    status: "PENDING",
    amount: { currency_code: "USD", value: "49.00" },
  });
  if (verifyCompletedPayPalOrder(order, "submission-123", "49.00") !== null) {
    throw new Error("multiple capture records must be rejected as ambiguous");
  }
});

Deno.test("rejects missing capture IDs and ambiguous multiple captures", () => {
  const missingId = validOrder();
  missingId.purchase_units[0].payments.captures[0].id = "";
  if (verifyCompletedPayPalOrder(missingId, "submission-123", "49.00") !== null) {
    throw new Error("missing capture ID must be rejected");
  }

  const multiple = validOrder();
  multiple.purchase_units[0].payments.captures.push({
    id: "CAPTURE-789",
    status: "COMPLETED",
    amount: { currency_code: "USD", value: "49.00" },
  });
  if (verifyCompletedPayPalOrder(multiple, "submission-123", "49.00") !== null) {
    throw new Error("multiple completed captures must be rejected as ambiguous");
  }
});
