import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PAYMENT_STATUS,
  evaluateSession,
  extractStripeSessionId,
} from "../utils/paymentSync.js";

// ======================================================
// extractStripeSessionId
// ======================================================

test("extracts cs_test_ id from a Stripe Checkout URL", () => {
  const url =
    "https://checkout.stripe.com/c/pay/cs_test_a1KeKQvX9zUDN3fPFVqPV0q2z8mQPA1OR6R38yE3rQJ2Z7uKZ2kRbA3WvLxQ5dhXi#fidkdWxOYHwnPyd1blpxYHZxSibG9lYHJhdG1ieGB3Z0s1b3RgNTYn";

  assert.equal(
    extractStripeSessionId(url),
    "cs_test_a1KeKQvX9zUDN3fPFVqPV0q2z8mQPA1OR6R38yE3rQJ2Z7uKZ2kRbA3WvLxQ5dhXi"
  );
});

test("returns null for empty or invalid links", () => {
  assert.equal(extractStripeSessionId(""), null);
  assert.equal(extractStripeSessionId(null), null);
  assert.equal(
    extractStripeSessionId("https://checkout.stripe.com/c/pay/"),
    null
  );
});

// ======================================================
// evaluateSession
// ======================================================

const booking = {
  _id: "6aae1ff75aaebbe656bbeb65",
  amount: 1495,
};

const baseSession = {
  id: "cs_test_abc",
  status: "complete",
  payment_status: "paid",
  amount_total: 149500,
  currency: "usd",
  metadata: {
    bookingId: "6aae1ff75aaebbe656bbeb65",
  },
};

test("PAID: complete + paid + matching metadata + matching amount", () => {
  const verdict = evaluateSession(
    booking,
    baseSession
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PAID
  );

  assert.equal(verdict.matched, true);
});

test("EXPIRED: completed-less expired session", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      status: "expired",
      payment_status: "unpaid",
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.EXPIRED
  );

  assert.equal(verdict.matched, false);
});

test("CANCELLED: canceled session", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      status: "canceled",
      payment_status: "unpaid",
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.CANCELLED
  );
});

test("PENDING: open session is still usable", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      status: "open",
      payment_status: "unpaid",
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PENDING
  );
});

test("PENDING: completed but async payment not yet paid", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      status: "complete",
      payment_status: "unpaid",
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PENDING
  );
});

test("rejects paid session whose metadata.bookingId does not match", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      metadata: {
        bookingId:
          "6aae21065aaebbe656bbeb66",
      },
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PENDING
  );

  assert.match(
    verdict.reason,
    /bookingId does not match/i
  );
});

test("rejects paid session whose amount does not match booking in cents", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      amount_total: 149500 + 100,
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PENDING
  );

  assert.match(verdict.reason, /Amount mismatch/i);
});

test("rejects paid session with non-usd currency", () => {
  const verdict = evaluateSession(
    booking,
    {
      ...baseSession,
      currency: "sar",
    }
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PENDING
  );

  assert.match(verdict.reason, /Currency mismatch/i);
});

test("handles missing session data safely", () => {
  const verdict = evaluateSession(
    booking,
    null
  );

  assert.equal(
    verdict.state,
    PAYMENT_STATUS.PENDING
  );

  assert.equal(verdict.matched, false);
});