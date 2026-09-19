import "dotenv/config";

import connectDB from "../configs/db.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

import {
  PAYMENT_STATUS,
  evaluateSession,
  getSessionIdForBooking,
  getStripe,
} from "../utils/paymentSync.js";

// ======================================================
// ONE-TIME RECONCILIATION SCRIPT
//
// Repair bookings whose Stripe Checkout Sessions are
// complete and paid but whose MongoDB booking was never
// updated by the webhook.
//
//   Default target bookings:
//
//   6aae1ff75aaebbe656bbeb65
//   6aae21065aaebbe656bbeb66
//
// USAGE
//
//   # Dry run (read-only, prints verification results)
//   node scripts/reconcilePaidBookings.js
//
//   # Apply verified updates
//   node scripts/reconcilePaidBookings.js --apply
//
//   # Different bookings
//   node scripts/reconcilePaidBookings.js --id=... --id=...
//
// SAFETY
//
//   - Idempotent: already-paid bookings are skipped.
//   - A booking is ONLY updated when the Stripe session
//     verifies 100%: complete + paid + matching
//     metadata.bookingId + matching amount + "usd".
//   - Never creates a Checkout Session.
//   - Never charges the customer again.
//   - Never changes seat assignments (reports only).
//   - Never sends emails.
//   - Dry run by default: pass --apply to write.
// ======================================================

const DEFAULT_BOOKING_IDS = [
  "6aae1ff75aaebbe656bbeb65",
  "6aae21065aaebbe656bbeb66",
];

const args = process.argv.slice(2);

const apply =
  args.includes("--apply");

const idArgs = args
  .filter((arg) =>
    arg.startsWith("--id=")
  )
  .map((arg) =>
    arg.slice("--id=".length)
  );

const bookingIds =
  idArgs.length > 0
    ? idArgs
    : DEFAULT_BOOKING_IDS;

// ======================================================
// MAIN
// ======================================================

const run = async () => {
  await connectDB();

  console.log(
    "\n=== BOOKING RECONCILIATION ===\n"
  );

  console.log(
    `Mode: ${apply ? "APPLY (writes)" : "DRY RUN (read-only)"}`
  );

  console.log(
    `Bookings: ${bookingIds.join(", ")}`
  );

  const summary = {
    found: 0,
    alreadyPaid: 0,
    missing: 0,
    verifiedPaid: 0,
    rejected: 0,
    updated: 0,
  };

  for (const bookingId of bookingIds) {
    console.log(
      `\n--- Booking ${bookingId} ---`
    );

    // ------------------------------------------------
    // 1. Retrieve the existing booking.
    // ------------------------------------------------

    const booking =
      await Booking.findById(bookingId);

    if (!booking) {
      console.log(
        "  NOT FOUND in MongoDB"
      );

      summary.missing++;

      continue;
    }

    summary.found++;

    console.log(
      `  amount: ${booking.amount} usd`
    );

    console.log(
      `  isPaid: ${booking.isPaid}`
    );

    console.log(
      `  paymentStatus: ${booking.paymentStatus || PAYMENT_STATUS.PENDING}`
    );

    if (booking.isPaid) {
      console.log(
        "  ALREADY PAID — skipping (idempotent)"
      );

      summary.alreadyPaid++;

      continue;
    }

    // ------------------------------------------------
    // 2. Obtain Checkout Session ID (field or URL).
    // ------------------------------------------------

    const sessionId =
      getSessionIdForBooking(booking);

    console.log(
      `  stripeSessionId (stored): ${booking.stripeSessionId || "(none)"}`
    );

    console.log(
      `  stripeSessionId (from URL): ${sessionId || "(none)"}`
    );

    if (!sessionId) {
      console.log(
        "  REJECTED — no Checkout Session ID available"
      );

      summary.rejected++;

      continue;
    }

    // ------------------------------------------------
    // 3. Retrieve the Checkout Session from Stripe.
    // ------------------------------------------------

    let session;

    try {
      session =
        await getStripe()
          .checkout.sessions.retrieve(
            sessionId
          );
    } catch (error) {
      console.log(
        `  REJECTED — Stripe retrieve failed: ${error.message}`
      );

      summary.rejected++;

      continue;
    }

    console.log(
      `  session: ${session.id}`
    );

    console.log(
      `  session.status: ${session.status}`
    );

    console.log(
      `  session.payment_status: ${session.payment_status}`
    );

    console.log(
      `  session.amount_total: ${session.amount_total} (cents)`
    );

    console.log(
      `  session.currency: ${session.currency}`
    );

    console.log(
      `  session.metadata.bookingId: ${session.metadata?.bookingId}`
    );

    // ------------------------------------------------
    // 4-8. Verify status, payment, metadata, amount.
    // ------------------------------------------------

    const verdict = evaluateSession(
      booking,
      session
    );

    if (
      verdict.state !==
        PAYMENT_STATUS.PAID ||
      !verdict.matched
    ) {
      console.log(
        `  REJECTED — ${verdict.reason}`
      );

      summary.rejected++;

      continue;
    }

    console.log(
      "  VERIFIED: complete + paid + metadata match + amount match"
    );

    // ------------------------------------------------
    // 9. Inspect seats (report only, never modify).
    // ------------------------------------------------

    const show = await Show.findById(
      booking.show
    );

    const seatReport =
      (booking.bookedSeats || []).map(
        (seat) => {
          const current =
            show?.occupiedSeats?.[
              seat
            ];

          return {
            seat,
            status:
              current === undefined
                ? "free"
                : current ===
                  booking.user.toString()
                ? "reserved-by-this-booking"
                : "reserved-by-another",
          };
        }
      );

    console.log(
      "  seat check (no changes made):"
    );

    seatReport.forEach((entry) => {
      console.log(
        `    ${entry.seat}: ${entry.status}`
      );
    });

    summary.verifiedPaid++;

    // ------------------------------------------------
    // 10. Update only verified paid bookings.
    // ------------------------------------------------

    if (!apply) {
      console.log(
        "  DRY RUN — would set { isPaid: true, paymentStatus: 'PAID', paymentLink: '' }"
      );

      continue;
    }

    const updated =
      await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          isPaid: { $ne: true },
        },
        {
          $set: {
            isPaid: true,
            paymentStatus:
              PAYMENT_STATUS.PAID,
            paymentLink: "",
            stripeSessionId:
              session.id,
            paidAt: new Date(),
          },
        },
        { new: true }
      );

    if (updated) {
      console.log(
        "  UPDATED -> { isPaid: true, paymentStatus: 'PAID', paymentLink: '' }"
      );

      summary.updated++;
    } else {
      console.log(
        "  UPDATE SKIPPED — booking already paid"
      );

      summary.alreadyPaid++;
    }
  }

  // ------------------------------------------------
  // Summary
  // ------------------------------------------------

  console.log(
    "\n=== SUMMARY ==="
  );

  console.log(
    `  found:            ${summary.found}`
  );

  console.log(
    `  already paid:     ${summary.alreadyPaid}`
  );

  console.log(
    `  missing:          ${summary.missing}`
  );

  console.log(
    `  verified paid:    ${summary.verifiedPaid}`
  );

  console.log(
    `  rejected:         ${summary.rejected}`
  );

  console.log(
    `  updated (apply):  ${summary.updated}`
  );

  console.log(
    `\n${apply ? "APPLY MODE" : "DRY RUN"} — done.`
  );

  process.exit(0);
};

run().catch((error) => {
  console.error(
    "\nRECONCILIATION FAILED:",
    error
  );

  process.exit(1);
});