import Stripe from "stripe";

import Booking from "../models/Booking.js";

import connectDB from "../configs/db.js";

import { inngest } from "../inngest/index.js";

// ======================================================
// STRIPE WEBHOOK
// ======================================================

export const stripeWebhooks = async (
  request,
  response
) => {
  const stripeInstance =
    new Stripe(
      process.env.STRIPE_SECRET_KEY
    );

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
      error.message
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
      event.type
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object;

        const bookingId =
          session.metadata
            ?.bookingId;

        if (!bookingId) {
          console.error(
            "BOOKING ID MISSING"
          );

          break;
        }

        // Only confirm successful payments.

        if (
          session.payment_status !==
          "paid"
        ) {
          console.log(
            "PAYMENT NOT YET PAID:",
            bookingId
          );

          break;
        }

        // ==============================================
        // MARK BOOKING AS PAID
        // ==============================================

        const booking =
          await Booking.findOneAndUpdate(
            {
              _id: bookingId,
              isPaid: false,
            },

            {
              $set: {
                isPaid: true,
                paymentLink: "",
              },
            },

            {
              new: true,
            }
          );

        if (!booking) {
          console.log(
            "BOOKING NOT FOUND OR ALREADY PAID:",
            bookingId
          );

          break;
        }

        console.log(
          "BOOKING MARKED AS PAID:",
          bookingId
        );

        // ==============================================
        // TRIGGER CONFIRMATION EMAIL
        // ==============================================

        await inngest.send({
          name: "app/show.booked",

          data: {
            bookingId:
              booking._id.toString(),
          },
        });

        console.log(
          "CONFIRMATION EMAIL EVENT SENT:",
          bookingId
        );

        break;
      }

      default: {
        console.log(
          "UNHANDLED STRIPE EVENT:",
          event.type
        );
      }
    }

    return response.json({
      received: true,
    });

  } catch (error) {
    console.error(
      "STRIPE WEBHOOK ERROR:",
      error
    );

    return response
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
};