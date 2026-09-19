import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import EmailEvent from "../models/EmailEvent.js";

import connectDB from "../configs/db.js";
import sendEmail from "../configs/nodemailer.js";
import { inngest } from "../configs/inngest.js";

import {
  claimConfirmationEmail,
  completeConfirmationEmail,
  getSessionIdForBooking,
  getStripe,
  reconcileBookingFromSession,
} from "../utils/paymentSync.js";

export { inngest };

// ======================================================
// HELPER: ESCAPE HTML
// ======================================================

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    }
  );

// ======================================================
// 1. CREATE USER
// ======================================================

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",

    triggers: [
      {
        event: "clerk/user.created",
      },
    ],
  },

  async ({ event }) => {
    await connectDB();

    const {
      id,
      first_name,
      last_name,
      email_addresses = [],
      image_url,
    } = event.data;

    if (!id) {
      throw new Error(
        "Clerk user ID is missing"
      );
    }

    const email =
      email_addresses[0]?.email_address;

    if (!email) {
      throw new Error(
        "Clerk user email is missing"
      );
    }

    const userData = {
      email,

      name: `${first_name ?? ""} ${
        last_name ?? ""
      }`.trim(),

      image: image_url ?? "",
    };

    const user = await User.findByIdAndUpdate(
      id,
      userData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return {
      success: true,
      userId: user._id,
    };
  }
);

// ======================================================
// 2. DELETE USER
// ======================================================

const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",

    triggers: [
      {
        event: "clerk/user.deleted",
      },
    ],
  },

  async ({ event }) => {
    await connectDB();

    const { id } = event.data;

    if (!id) {
      throw new Error(
        "Clerk user ID is missing"
      );
    }

    const deletedUser =
      await User.findByIdAndDelete(id);

    return {
      success: true,
      userId: id,
      deleted: Boolean(deletedUser),
    };
  }
);

// ======================================================
// 3. UPDATE USER
// ======================================================

const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",

    triggers: [
      {
        event: "clerk/user.updated",
      },
    ],
  },

  async ({ event }) => {
    await connectDB();

    const {
      id,
      first_name,
      last_name,
      email_addresses = [],
      image_url,
    } = event.data;

    if (!id) {
      throw new Error(
        "Clerk user ID is missing"
      );
    }

    const email =
      email_addresses[0]?.email_address;

    if (!email) {
      throw new Error(
        "Clerk user email is missing"
      );
    }

    const userData = {
      email,

      name: `${first_name ?? ""} ${
        last_name ?? ""
      }`.trim(),

      image: image_url ?? "",
    };

    const updatedUser =
      await User.findByIdAndUpdate(
        id,
        userData,
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    return {
      success: true,
      userId: updatedUser._id,
    };
  }
);

// ======================================================
// 4. RELEASE SEATS AND DELETE UNPAID BOOKING
//
// Previously this job deleted an unpaid booking after a
// fixed 31 minutes. That is unsafe because:
//
//   - Stripe confirms payment asynchronously for some
//     payment methods
//   - the webhook can race with the cleanup job
//   - Checkout Sessions may expire later than Stripe's
//     minimum 30 minutes
//
// New behaviour:
//
//   1. Load the booking and its Checkout Session.
//   2. If Stripe confirms payment → mark the booking
//      paid and STOP (never release seats / delete).
//   3. If the Session is still open → wait until its real
//      expires_at (+ buffer), not a hard-coded 31 min.
//   4. Re-verify with Stripe one final time.
//   5. Only for a definitely-unpaid / expired / cancelled
//      Session: atomically delete the booking and release
//      seats still owned by this user.
//
// If Stripe is unreachable, this job throws so Inngest
// retries instead of deleting an unverified booking.
// ======================================================

const releaseSeatsAndDeleteBooking =
  inngest.createFunction(
    {
      id: "release-seats-delete-booking",

      triggers: [
        {
          event: "app/checkpayment",
        },
      ],
    },

    async ({ event, step }) => {
      const bookingId =
        event.data?.bookingId;

      if (!bookingId) {
        throw new Error(
          "Booking ID is missing"
        );
      }

      // ================================================
      // 1. LOAD BOOKING + SESSION
      // ================================================

      const info =
        await step.run(
          "load-booking-and-session",

          async () => {
            await connectDB();

            const booking =
              await Booking.findById(
                bookingId
              );

            if (!booking) {
              return {
                state: "gone",
              };
            }

            if (booking.isPaid) {
              return {
                state: "paid",
                bookingId:
                  booking._id.toString(),
              };
            }

            const sessionId =
              getSessionIdForBooking(
                booking
              );

            let sessionStatus = null;
            let expiresAt =
              booking
                .stripeSessionExpiresAt ??
              null;

            if (sessionId) {
              try {
                const session =
                  await getStripe()
                    .checkout
                    .sessions
                    .retrieve(sessionId);

                sessionStatus =
                  session.status;

                // Stripe already confirms the payment —
                // reconcile immediately and skip cleanup.
                if (
                  session.status ===
                    "complete" &&
                  session
                    .payment_status ===
                    "paid"
                ) {
                  await reconcileBookingFromSession(
                    booking._id.toString(),
                    session,
                    { emitEmail: false }
                  );

                  return {
                    state: "paid",
                    bookingId:
                      booking._id.toString(),
                  };
                }

                expiresAt =
                  session.expires_at ??
                  expiresAt;

              } catch (error) {
                console.error(
                  "CLEANUP SESSION RETRIEVE ERROR:",
                  bookingId,
                  error.message
                );
              }
            }

            return {
              state: "unpaid",
              bookingId:
                booking._id.toString(),
              sessionId,
              sessionStatus,
              expiresAt,
            };
          }
        );

      if (info.state === "gone") {
        return {
          success: true,
          message:
            "Booking already removed",
        };
      }

      if (info.state === "paid") {
        console.log(
          "BOOKING IS PAID:",
          bookingId
        );

        return {
          success: true,
          paid: true,
          bookingDeleted: false,
        };
      }

      // ================================================
      // 2. WAIT UNTIL THE CHECKOUT SESSION EXPIRES
      //
      // Respect the real expires_at from Stripe instead
      // of assuming a fixed 30-minute window.
      // ================================================

      const nowMs = Date.now();
      const expiresAtMs = info.expiresAt
        ? info.expiresAt * 1000
        : null;

      if (
        expiresAtMs &&
        expiresAtMs > nowMs
      ) {
        await step.sleepUntil(
          "wait-for-session-expiry",
          new Date(
            expiresAtMs + 30 * 1000
          )
        );
      } else if (
        !expiresAtMs ||
        info.sessionStatus === "open"
      ) {
        // No expiry known: keep legacy 31-minute safety
        // window, then re-verify against Stripe.
        await step.sleepUntil(
          "wait-for-checkout-expiration",
          new Date(
            Date.now() +
              31 * 60 * 1000
          )
        );
      } else {
        // Session already expired/cancelled — proceed.
      }

      // ================================================
      // 3. FINALIZE UNPAID BOOKING
      // ================================================

      return await step.run(
        "finalize-unpaid-booking",

        async () => {
          await connectDB();

          const booking =
            await Booking.findById(
              bookingId
            );

          if (!booking) {
            return {
              success: true,
              message:
                "Booking already removed",
            };
          }

          if (booking.isPaid) {
            return {
              success: true,
              paid: true,
              bookingDeleted: false,
            };
          }

          // ============================================
          // 3a. FINAL STRIPE VERIFICATION
          //
          // Never release seats or delete a booking
          // without a definitive answer from Stripe.
          // ============================================

          const sessionId =
            getSessionIdForBooking(
              booking
            );

          if (sessionId) {
            try {
              const session =
                await getStripe()
                  .checkout
                  .sessions
                  .retrieve(sessionId);

              const result =
                await reconcileBookingFromSession(
                  booking._id.toString(),
                  session,
                  { emitEmail: false }
                );

              if (
                result.status === "paid"
              ) {
                console.log(
                  "BOOKING PAID DURING CLEANUP:",
                  bookingId
                );

                return {
                  success: true,
                  paid: true,
                  bookingDeleted: false,
                };
              }

            } catch (error) {
              console.error(
                "CLEANUP FINAL RECONCILE ERROR:",
                bookingId,
                error.message
              );

              // Do not delete unverified bookings.
              // Let Inngest retry this step.
              throw new Error(
                "CLEANUP DEFERRED: unable to verify Stripe payment state"
              );
            }
          }

          // ============================================
          // 3b. SAFE TO RELEASE + DELETE
          //
          // Atomic delete guards against a webhook
          // marking the booking paid mid-flight.
          // ============================================

          const deleted =
            await Booking.findOneAndDelete(
              {
                _id: bookingId,
                isPaid: false,
              }
            );

          if (!deleted) {
            return {
              success: true,
              bookingDeleted: false,
              message:
                "Booking no longer available",
            };
          }

          const show =
            await Show.findById(
              deleted.show
            );

          if (show) {
            if (!show.occupiedSeats) {
              show.occupiedSeats = {};
            }

            deleted.bookedSeats.forEach(
              (seat) => {
                if (
                  show.occupiedSeats[
                    seat
                  ] ===
                  deleted.user.toString()
                ) {
                  delete show.occupiedSeats[
                    seat
                  ];
                }
              }
            );

            show.markModified(
              "occupiedSeats"
            );

            await show.save();
          }

          console.log(
            "UNPAID BOOKING DELETED:",
            bookingId
          );

          return {
            success: true,
            paid: false,
            bookingDeleted: true,
            releasedSeats:
              deleted.bookedSeats,
          };
        }
      );
    }
  );

// ======================================================
// 5. SEND BOOKING CONFIRMATION EMAIL
//
// Stripe payment
//       ↓
// Stripe webhook
//       ↓
// app/show.booked
//       ↓
// Inngest
//       ↓
// MongoDB
//       ↓
// Nodemailer
//       ↓
// Brevo SMTP
//       ↓
// Customer email
// ======================================================

const sendBookingConfirmationEmail =
  inngest.createFunction(
    {
      id: "send-booking-confirmation-email",

      triggers: [
        {
          event: "app/show.booked",
        },
      ],
    },

    async ({ event, step }) => {
      const bookingId =
        event.data?.bookingId;

      if (!bookingId) {
        throw new Error(
          "Booking ID is missing"
        );
      }

      // ================================================
      // 1. CLAIM DELIVERY (IDEMPOTENT)
      //
      // Replayed webhook deliveries and cron retries must
      // never send the confirmation email twice. Only the
      // first claimant that flips the EmailEvent to
      // "sending" proceeds.
      // ================================================

      const claim =
        await step.run(
          "claim-confirmation-email",

          async () => {
            await connectDB();

            const claim =
              await claimConfirmationEmail(
                bookingId
              );

            return {
              status: claim?.status,
            };
          }
        );

      if (
        !claim ||
        claim.status !== "sending"
      ) {
        console.log(
          "CONFIRMATION EMAIL ALREADY SENT:",
          bookingId
        );

        return {
          success: true,
          alreadySent: true,
          bookingId,
        };
      }

      // ================================================
      // 2. GET BOOKING INFORMATION
      // ================================================

      const bookingData =
        await step.run(
          "get-booking-information",

          async () => {
            await connectDB();

            const booking =
              await Booking.findById(
                bookingId
              )
                .populate({
                  path: "show",

                  populate: {
                    path: "movie",
                    model: "Movie",
                  },
                })
                .populate("user");

            if (!booking) {
              throw new Error(
                "Booking not found"
              );
            }

            if (!booking.isPaid) {
              throw new Error(
                "Booking is not paid"
              );
            }

            if (
              !booking.show ||
              !booking.show.movie
            ) {
              throw new Error(
                "Show or movie not found"
              );
            }

            if (
              !booking.user ||
              !booking.user.email
            ) {
              throw new Error(
                "User email not found"
              );
            }

            return {
              bookingId:
                booking._id.toString(),

              userName:
                booking.user.name,

              userEmail:
                booking.user.email,

              movieTitle:
                booking.show.movie.title,

              showDateTime:
                booking.show.showDateTime,

              bookedSeats:
                booking.bookedSeats,

              amount:
                booking.amount,
            };
          }
        );

      // ================================================
      // 3. PREPARE EMAIL CONTENT
      // ================================================

      const formattedDate =
        new Date(
          bookingData.showDateTime
        ).toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Asia/Riyadh",
        });

      const seats =
        bookingData.bookedSeats
          .map(escapeHtml)
          .join(", ");

      const emailBody = `
        <!DOCTYPE html>

        <html lang="en">

          <head>
            <meta charset="UTF-8" />

            <title>
              QuickShow Booking Confirmation
            </title>
          </head>

          <body
            style="
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              padding: 30px;
              color: #222;
            "
          >

            <div
              style="
                max-width: 600px;
                margin: auto;
                background: white;
                padding: 30px;
                border-radius: 12px;
              "
            >

              <h1>
                QuickShow
              </h1>

              <h2>
                Booking Confirmed!
              </h2>

              <p>
                Hello
                ${escapeHtml(
                  bookingData.userName
                )},
              </p>

              <p>
                Your payment was successful.
                Your movie tickets are confirmed.
              </p>

              <hr />

              <h3>
                ${escapeHtml(
                  bookingData.movieTitle
                )}
              </h3>

              <p>
                <strong>
                  Date & Time:
                </strong>

                ${escapeHtml(
                  formattedDate
                )}
              </p>

              <p>
                <strong>
                  Seats:
                </strong>

                ${seats}
              </p>

              <p>
                <strong>
                  Total Paid:
                </strong>

                $${escapeHtml(
                  bookingData.amount
                )}
              </p>

              <p>
                <strong>
                  Booking ID:
                </strong>

                ${escapeHtml(
                  bookingData.bookingId
                )}
              </p>

              <hr />

              <p>
                Thank you for booking
                with QuickShow!
              </p>

            </div>

          </body>

        </html>
      `;

      // ================================================
      // 4. SEND EMAIL THROUGH BREVO
      // ================================================

      const emailResult =
        await step.run(
          "send-confirmation-email",

          async () => {
            return await sendEmail({
              to:
                bookingData.userEmail,

              subject:
                `Booking Confirmed - ${bookingData.movieTitle}`,

              body:
                emailBody,
            });
          }
        );

      console.log(
        "BOOKING CONFIRMATION SENT:",
        bookingId
      );

      // ================================================
      // 5. MARK DELIVERY AS SENT
      //
      // Best-effort so cron retries and replayed events
      // are de-duplicated.
      // ================================================

      await step.run(
        "mark-confirmation-email-sent",

        async () => {
          await connectDB();

          await completeConfirmationEmail(
            bookingId
          );
        }
      );

      return {
        success: true,

        bookingId,

        email:
          bookingData.userEmail,

        messageId:
          emailResult.messageId,
      };
    }
  );

// ======================================================
// 6. RETRY PENDING CONFIRMATION EMAILS
//
// Reliable notification fallback for the webhook:
//
// If inngest.send() failed inside the webhook (after the
// booking was already committed as paid), the email stays
// "pending" in the EmailEvent collection. This job runs
// every 5 minutes, re-emits app/show.booked for pending
// events, and fails out events that have exhausted their
// attempts.
//
// The confirmation function's claim step guarantees the
// customer still receives exactly one email.
// ======================================================

const retryPendingConfirmationEmails =
  inngest.createFunction(
    {
      id: "retry-pending-confirmation-emails",

      triggers: [
        {
          cron: "*/5 * * * *",
        },
      ],
    },

    async ({ step }) => {
      const staleThreshold = new Date(
        Date.now() - 10 * 60 * 1000
      );

      // Reset "sending" events that never completed (e.g.
      // the Inngest function exhausted its own retries),
      // so a fresh delivery can be attempted.
      await step.run(
        "reset-stale-sending-events",

        async () => {
          await connectDB();

          const reset =
            await EmailEvent.updateMany(
              {
                kind: "confirmation",
                status: "sending",
                attempts: { $lt: 10 },
                updatedAt: {
                  $lt: staleThreshold,
                },
              },
              {
                $set: { status: "pending" },
              }
            );

          const abandoned =
            await EmailEvent.updateMany(
              {
                kind: "confirmation",
                status: "sending",
                attempts: { $gte: 10 },
              },
              {
                $set: { status: "failed" },
              }
            );

          console.log(
            "EMAIL EVENT MAINTENANCE:",
            `reset=${reset.modifiedCount} abandoned=${abandoned.modifiedCount}`
          );
        }
      );

      return await step.run(
        "retry-pending-events",

        async () => {
          await connectDB();

          const events =
            await EmailEvent.find({
              kind: "confirmation",
              status: "pending",
              attempts: { $lt: 10 },
            }).limit(100);

          const queued = [];

          for (const ev of events) {
            await inngest.send({
              name: "app/show.booked",
              data: {
                bookingId:
                  ev.bookingId,
              },
            });

            queued.push(
              ev.bookingId
            );
          }

          console.log(
            "EMAIL RETRY QUEUED:",
            queued
          );

          return {
            success: true,
            queued,
          };
        }
      );
    }
  );

// ======================================================
// EXPORT ALL FUNCTIONS
// ======================================================

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  retryPendingConfirmationEmails,
];