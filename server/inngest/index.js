import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

import connectDB from "../configs/db.js";
import sendEmail from "../configs/nodemailer.js";

import { Inngest } from "inngest";

// ======================================================
// INNGEST CLIENT
// ======================================================

export const inngest = new Inngest({
  id: "movie-ticket-booking",
});

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
// This is the basic course implementation.
// Stripe Checkout expires after 30 minutes.
// Inngest checks the booking after 31 minutes.
//
// The extra minute gives the Stripe webhook
// some time to update the booking.
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
      // WAIT FOR STRIPE CHECKOUT TO EXPIRE
      // ================================================

      const cleanupTime = new Date(
        Date.now() + 31 * 60 * 1000
      );

      await step.sleepUntil(
        "wait-for-checkout-expiration",
        cleanupTime
      );

      // ================================================
      // CHECK PAYMENT
      // ================================================

      return await step.run(
        "check-payment-status",

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

          // ============================================
          // PAID BOOKING
          // ============================================

          if (booking.isPaid) {
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

          // ============================================
          // UNPAID BOOKING
          // ============================================

          const show =
            await Show.findById(
              booking.show
            );

          if (show) {
            if (!show.occupiedSeats) {
              show.occupiedSeats = {};
            }

            booking.bookedSeats.forEach(
              (seat) => {
                if (
                  show.occupiedSeats[seat] ===
                  booking.user.toString()
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

          await Booking.findByIdAndDelete(
            booking._id
          );

          console.log(
            "UNPAID BOOKING DELETED:",
            bookingId
          );

          return {
            success: true,
            paid: false,
            bookingDeleted: true,
            releasedSeats:
              booking.bookedSeats,
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
      // 1. GET BOOKING INFORMATION
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
      // 2. PREPARE EMAIL CONTENT
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
      // 3. SEND EMAIL THROUGH BREVO
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
// EXPORT ALL FUNCTIONS
// ======================================================

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
];