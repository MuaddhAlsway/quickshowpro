import Stripe from "stripe";

import Booking from "../models/Booking.js";
import EmailEvent from "../models/EmailEvent.js";
import { inngest } from "../configs/inngest.js";

// ======================================================
// PAYMENT STATE
// ======================================================

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
};

// ======================================================
// STRIPE CLIENT
//
// Lazy single instance so controllers and scripts
// share one Stripe() without importing @stripe/stripe-js.
// ======================================================

let stripeClient = null;

export const getStripe = () => {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is missing"
      );
    }

    stripeClient = new Stripe(
      process.env.STRIPE_SECRET_KEY
    );
  }

  return stripeClient;
};

// ======================================================
// SESSION ID HELPERS
//
// New bookings store stripeSessionId directly.
//
// Legacy bookings only have the Checkout URL, e.g.
//
//   https://checkout.stripe.com/c/pay/cs_test_...?#...
//
// The session ID is the "cs_test_..." path segment.
// ======================================================

export const extractStripeSessionId = (
  paymentLink
) => {
  if (!paymentLink) {
    return null;
  }

  try {
    const url = new URL(paymentLink);

    const segments = url.pathname
      .split("/")
      .filter(Boolean);

    const match = segments.find(
      (segment) =>
        segment.startsWith("cs_")
    );

    return match || null;
  } catch {
    return null;
  }
};

export const getSessionIdForBooking = (
  booking
) => {
  if (!booking) {
    return null;
  }

  if (booking.stripeSessionId) {
    return booking.stripeSessionId;
  }

  return extractStripeSessionId(
    booking.paymentLink
  );
};

// ======================================================
// EVALUATE STRIPE SESSION AGAINST A BOOKING
//
// Pure decision function (no I/O) so it is unit-testable.
//
// Returns:
//
//   { state, matched, reason }
//
//   state : PENDING | PAID | EXPIRED | CANCELLED
//
// A booking is only ever reconciled to PAID when ALL of:
//
//   - session.status === "complete"
//   - session.payment_status === "paid"
//   - session.metadata.bookingId matches the booking
//   - session.amount_total matches expectation
//   - session.currency is "usd"
// ======================================================

export const evaluateSession = (
  booking,
  session
) => {
  if (!session) {
    return {
      state: PAYMENT_STATUS.PENDING,
      matched: false,
      reason: "No session data",
    };
  }

  const bookingId =
    booking?._id?.toString?.() ??
    booking?._id;

  const metadataId =
    session.metadata?.bookingId;

  if (
    metadataId &&
    bookingId &&
    metadataId !== bookingId
  ) {
    return {
      state: PAYMENT_STATUS.PENDING,
      matched: false,
      reason:
        "Session metadata bookingId does not match booking",
    };
  }

  const expectedCents =
    Math.round(
      Number(booking?.amount ?? 0) * 100
    );

  const sessionCents =
    session.amount_total;

  if (
    Number.isFinite(expectedCents) &&
    Number.isFinite(sessionCents) &&
    expectedCents !== sessionCents
  ) {
    return {
      state: PAYMENT_STATUS.PENDING,
      matched: false,
      reason: `Amount mismatch: expected ${expectedCents} cents, session has ${sessionCents}`,
    };
  }

  const bookingCurrency =
    booking?.currency || "usd";

  if (
    session.currency &&
    session.currency.toLowerCase?.() !==
      bookingCurrency.toLowerCase?.()
  ) {
    return {
      state: PAYMENT_STATUS.PENDING,
      matched: false,
      reason: `Currency mismatch: expected ${bookingCurrency}, session has ${session.currency}`,
    };
  }

  if (
    session.status === "complete" &&
    session.payment_status === "paid"
  ) {
    return {
      state: PAYMENT_STATUS.PAID,
      matched: true,
      reason:
        "Stripe confirms the payment",
    };
  }

  if (session.status === "expired") {
    return {
      state: PAYMENT_STATUS.EXPIRED,
      matched: false,
      reason:
        "Stripe session has expired",
    };
  }

  if (session.status === "canceled") {
    return {
      state: PAYMENT_STATUS.CANCELLED,
      matched: false,
      reason:
        "Stripe session was cancelled",
    };
  }

  return {
    state: PAYMENT_STATUS.PENDING,
    matched: false,
    reason: `Session is still ${session.status}`,
  };
};

// ======================================================
// ATOMIC BOOKING UPDATES
// ======================================================

export const markBookingPaid = async (
  bookingId,
  {
    stripeSessionId,
    emitEmail = true,
  } = {}
) => {
  const updated =
    await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        isPaid: { $ne: true },
      },
      {
        $set: {
          isPaid: true,
          paymentStatus:
            PAYMENT_STATUS.PAID,
          paymentLink: "",
          paidAt: new Date(),
          ...(stripeSessionId
            ? { stripeSessionId }
            : {}),
        },
      },
      { new: true }
    );

  if (!updated) {
    // Either the booking does not exist or it is
    // already marked as paid (Stripe webhook retries).
    return null;
  }

  if (emitEmail) {
    await enqueueConfirmationEmail(
      updated._id.toString()
    );

    await emitBookingPaidEvent(
      updated._id.toString()
    );
  }

  return updated;
};

export const markBookingExpired = async (
  bookingId
) => {
  return Booking.findOneAndUpdate(
    {
      _id: bookingId,
      isPaid: { $ne: true },
      paymentStatus: {
        $ne: PAYMENT_STATUS.EXPIRED,
      },
    },
    {
      $set: {
        paymentStatus:
          PAYMENT_STATUS.EXPIRED,
        paymentLink: "",
      },
    },
    { new: true }
  );
};

export const markBookingCancelled = async (
  bookingId
) => {
  return Booking.findOneAndUpdate(
    {
      _id: bookingId,
      isPaid: { $ne: true },
      paymentStatus: {
        $ne: PAYMENT_STATUS.CANCELLED,
      },
    },
    {
      $set: {
        paymentStatus:
          PAYMENT_STATUS.CANCELLED,
        paymentLink: "",
      },
    },
    { new: true }
  );
};

// ======================================================
// RECONCILE BOOKING FROM A RETRIEVED STRIPE SESSION
//
// Used by the webhook, the bookings API, and the
// Inngest cleanup function.
//
//   - PAID        → mark booking paid (may emit email)
//   - EXPIRED     → mark booking expired (clears link)
//   - CANCELLED   → mark booking cancelled (clears link)
//   - PENDING     → leave usable Pay Now link untouched
//
// Returns { status, booking, verdict }.
// ======================================================

export const reconcileBookingFromSession =
  async (
    bookingId,
    session,
    options = {}
  ) => {
    const { emitEmail = true } =
      options;

    const booking =
      await Booking.findById(bookingId);

    if (!booking) {
      return {
        status: "missing",
        booking: null,
        verdict: null,
      };
    }

    if (booking.isPaid) {
      return {
        status: "already-paid",
        booking,
        verdict: null,
      };
    }

    const verdict = evaluateSession(
      booking,
      session
    );

    if (
      verdict.state ===
      PAYMENT_STATUS.PAID
    ) {
      const updated =
        await markBookingPaid(
          booking._id.toString(),
          {
            stripeSessionId:
              session.id,
            emitEmail,
          }
        );

      return {
        status: updated
          ? "paid"
          : "rejected",
        booking:
          updated ?? booking,
        verdict,
      };
    }

    if (
      verdict.state ===
      PAYMENT_STATUS.EXPIRED
    ) {
      await markBookingExpired(
        booking._id.toString()
      );

      return {
        status: "expired",
        booking:
          await Booking.findById(
            bookingId
          ),
        verdict,
      };
    }

    if (
      verdict.state ===
      PAYMENT_STATUS.CANCELLED
    ) {
      await markBookingCancelled(
        booking._id.toString()
      );

      return {
        status: "cancelled",
        booking:
          await Booking.findById(
            bookingId
          ),
        verdict,
      };
    }

    return {
      status: "pending",
      booking,
      verdict,
    };
  };

export const getCheckoutSessionForBooking =
  async (booking) => {
    const sessionId =
      getSessionIdForBooking(booking);

    if (!sessionId) {
      return null;
    }

    return getStripe()
      .checkout.sessions.retrieve(
        sessionId
      );
  };

// ======================================================
// EMAIL LEDGER KINDS
// ======================================================

export const EMAIL_KIND_CONFIRMATION =
  "confirmation";

export const EMAIL_KIND_REMINDER_24H =
  "reminder-24h";

export const EMAIL_KIND_REMINDER_2H =
  "reminder-2h";

// ======================================================
// CONFIRMATION EMAIL LEDGER
//
// Reliable, retryable dispatch:
//
// Webhook / reconcile:
//   1. enqueueEmail()              → upsert "pending"
//   2. emitBookingPaidEvent()      → inngest.send()
//      (on failure the event stays "pending" and the
//       cron function retries it — the webhook does NOT
//       return HTTP 500 after the DB commit succeeded)
//
// Inngest function:
//   3. claimEmail()                → "pending"/"sending"/"failed" → "sending"
//   4. send via Nodemailer
//   5. completeEmail()             → "sent"
//
// "sent" is never overwritten, so replayed webhook
// deliveries and cron retries never double-send.
//
// The same ledger is reused for reminder emails by
// passing the kind ("reminder-24h" / "reminder-2h").
// ======================================================

export const enqueueConfirmationEmail =
  async (bookingId) =>
    enqueueEmail(
      bookingId,
      EMAIL_KIND_CONFIRMATION
    );

export const enqueueEmail = async (
  bookingId,
  kind
) => {
  const id = String(bookingId);

  await EmailEvent.updateOne(
    {
      bookingId: id,
      kind,
    },
    {
      $setOnInsert: {
        bookingId: id,
        kind,
        status: "pending",
        attempts: 0,
      },
    },
    { upsert: true }
  );
};

export const emitBookingPaidEvent = async (
  bookingId
) => {
  const id = String(bookingId);

  try {
    await inngest.send({
      name: "app/show.booked",
      data: {
        bookingId: id,
      },
    });
  } catch (error) {
    console.error(
      "INNGEST SEND FAILED (cron will retry):",
      error.message
    );
  }
};

export const claimConfirmationEmail =
  async (bookingId) =>
    claimEmail(
      bookingId,
      EMAIL_KIND_CONFIRMATION
    );

export const claimEmail = async (
  bookingId,
  kind
) => {
  const id = String(bookingId);

  // 1) Claim an existing, not-yet-sent delivery.
  const claimed =
    await EmailEvent.findOneAndUpdate(
      {
        bookingId: id,
        kind,
        status: {
          $in: [
            "pending",
            "sending",
            "failed",
          ],
        },
      },
      {
        $set: {
          status: "sending",
        },
        $inc: { attempts: 1 },
      },
      { new: true }
    );

  if (claimed) {
    return claimed;
  }

  // 2) No record yet (or it is already "sent").
  //    Create one in "sending" state so this delivery
  //    proceeds exactly once.
  return EmailEvent.findOneAndUpdate(
    {
      bookingId: id,
      kind,
    },
    {
      $setOnInsert: {
        bookingId: id,
        kind,
        status: "sending",
        attempts: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );
};

export const completeConfirmationEmail =
  async (bookingId) =>
    completeEmail(
      bookingId,
      EMAIL_KIND_CONFIRMATION
    );

export const completeEmail = async (
  bookingId,
  kind
) => {
  const id = String(bookingId);

  await EmailEvent.updateOne(
    {
      bookingId: id,
      kind,
      status: "sending",
    },
    {
      $set: {
        status: "sent",
        lastError: null,
      },
    }
  );
};

export const markEmailFailed = async (
  bookingId,
  kind,
  error
) => {
  const id = String(bookingId);

  await EmailEvent.updateOne(
    {
      bookingId: id,
      kind,
      status: "sending",
    },
    {
      $set: {
        status: "failed",
        lastError:
          String(error?.message || error).slice(
            0, 500
          ),
      },
    }
  );
};