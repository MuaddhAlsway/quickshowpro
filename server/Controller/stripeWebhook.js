import Booking from "../models/Booking.js";

import connectDB from "../configs/db.js";

import {
  getStripe,
  markBookingExpired,
  reconcileBookingFromSession,
} from "../utils/paymentSync.js";

// ======================================================
// STRIPE WEBHOOK
//
// Handles:
//
//   1. checkout.session.completed
//   2. checkout.session.async_payment_succeeded
//   3. checkout.session.expired
//
// A booking is never marked paid until Stripe confirms
// payment (payment_status === "paid" AND the session is
// "complete"). Metadata, amount and currency are verified
// by reconcileBookingFromSession before the write.
//
// An unpaid booking whose Checkout Session has expired is
// marked EXPIRED (clears the Pay Now link). A paid session
// can never be marked EXPIRED — the guard requires
// isPaid !== true. Seats for expired unpaid bookings are
// released later by the Inngest cleanup job, which
// re-verifies the real Stripe state before deleting.
//
// The endpoint is registered BEFORE express.json() so the
// raw request body is available for signature verification.
// ======================================================

export const stripeWebhooks = async (
  request,
  response
) => {
  const stripeInstance = getStripe();

  const signature =
    request.headers[
      "stripe-signature"
    ];

  let event;

  // ====================================================
  // 1. VERIFY STRIPE SIGNATURE
  // ====================================================

  try {
    event =
      stripeInstance.webhooks.constructEvent(
        request.body,

        signature,

        process.env.STRIPE_WEBHOOK_SECRET
      );

  } catch (error) {
    console.error(
      "STRIPE WEBHOOK SIGNATURE ERROR:",
      error.message,
      { eventId: event?.id || null }
    );

    return response
      .status(400)
      .send(
        `Webhook Error: ${error.message}`
      );
  }

  // ====================================================
  // 2. PROCESS EVENT
  // ====================================================

  try {
    await connectDB();

    console.log(
      "STRIPE EVENT:",
      event.type,
      event.id
    );

    const isPaymentConfirmedEvent =
      event.type ===
        "checkout.session.completed" ||
      event.type ===
        "checkout.session.async_payment_succeeded";

    // ==================================================
    // 2a. EXPIRED SESSION
    //
    // The customer abandoned the Checkout Session. Mark the
    // still-unpaid booking EXPIRED so the UI stops showing
    // Pay Now. Seat release is handled by the cleanup job
    // (which re-verifies Stripe before deleting).
    // ==================================================

    if (
      event.type ===
      "checkout.session.expired"
    ) {
      const expiredSession =
        event.data.object;

      const expiredBookingId =
        expiredSession.metadata
          ?.bookingId;

      if (!expiredBookingId) {
        console.log(
          "STRIPE WEBHOOK: EXPIRED SESSION WITHOUT BOOKING ID"
        );

        return response.json({
          received: true,
        });
      }

      const expiredBooking =
        await Booking.findById(
          expiredBookingId
        );

      if (!expiredBooking) {
        console.log(
          "STRIPE WEBHOOK: EXPIRED SESSION BOOKING NOT FOUND:",
          expiredBookingId
        );

        return response.json({
          received: true,
        });
      }

      // Never mark a paid booking expired.
      if (expiredBooking.isPaid) {
        console.log(
          "STRIPE WEBHOOK: EXPIRED SESSION BUT BOOKING ALREADY PAID:",
          expiredBookingId
        );

        return response.json({
          received: true,
        });
      }

      await markBookingExpired(
        expiredBookingId
      );

      console.log(
        "STRIPE WEBHOOK: BOOKING MARKED EXPIRED:",
        expiredBookingId
      );

      return response.json({
        received: true,
      });
    }

    if (!isPaymentConfirmedEvent) {
      console.log(
        "UNHANDLED STRIPE EVENT:",
        event.type
      );

      return response.json({
        received: true,
      });
    }

    const session = event.data.object;

    // ==================================================
    // 2a. BOOKING ID
    // ==================================================

    const bookingId =
      session.metadata?.bookingId;

    if (!bookingId) {
      console.error(
        "STRIPE WEBHOOK: BOOKING ID MISSING",
        { eventId: event.id, sessionId: session.id }
      );

      return response.json({
        received: true,
      });
    }

    // ==================================================
    // 2b. ONLY CONFIRMED PAYMENTS
    //
    // checkout.session.completed can fire before async
    // payment methods settle. Wait for the paid signal.
    // ==================================================

    if (
      session.status !== "complete" ||
      session.payment_status !== "paid"
    ) {
      console.log(
        "STRIPE WEBHOOK: PAYMENT NOT CONFIRMED YET",
        {
          sessionId: session.id,
          status: session.status,
          payment_status:
            session.payment_status,
        }
      );

      return response.json({
        received: true,
      });
    }

    // ==================================================
    // 2c. RECONCILE BOOKING
    // ==================================================

    const result =
      await reconcileBookingFromSession(
        bookingId,
        session,
        { emitEmail: true }
      );

    switch (result.status) {
      case "paid":
        console.log(
          "STRIPE WEBHOOK: BOOKING MARKED PAID:",
          bookingId
        );
        break;

      case "already-paid":
        console.log(
          "STRIPE WEBHOOK: BOOKING ALREADY PAID:",
          bookingId
        );
        break;

      case "rejected":
        console.error(
          "STRIPE WEBHOOK: PAYMENT VERIFICATION REJECTED:",
          bookingId,
          result.verdict?.reason
        );
        break;

      case "missing":
        console.error(
          "STRIPE WEBHOOK: BOOKING NOT FOUND:",
          bookingId
        );
        break;

      default:
        console.log(
          "STRIPE WEBHOOK: BOOKING NOT UPDATED:",
          bookingId,
          result.verdict?.reason
        );
    }

    return response.json({
      received: true,
    });

  } catch (error) {
    console.error(
      "STRIPE WEBHOOK PROCESSING ERROR:",
      error.message,
      error.stack
    );

    return response
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
};