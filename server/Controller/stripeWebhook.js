import Stripe from "stripe";
import Booking from "../models/Booking.js";


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


  // ====================================================
  // 1. GET STRIPE SIGNATURE
  // ====================================================

  const signature =
    request.headers[
      "stripe-signature"
    ];


  let event;


  // ====================================================
  // 2. VERIFY WEBHOOK
  // ====================================================

  try {

    event =
      stripeInstance
        .webhooks
        .constructEvent(

          request.body,

          signature,

          process.env
            .STRIPE_WEBHOOK_SECRET

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
  // 3. PROCESS STRIPE EVENT
  // ====================================================

  try {

    console.log(
      "STRIPE EVENT:",
      event.type
    );


    switch (event.type) {


      // =================================================
      // CHECKOUT COMPLETED
      // =================================================

      case "checkout.session.completed": {

        const session =
          event.data.object;


        console.log(
          "CHECKOUT SESSION:",
          session.id
        );


        console.log(
          "PAYMENT STATUS:",
          session.payment_status
        );


        // -----------------------------------------------
        // GET BOOKING ID
        // -----------------------------------------------

        const bookingId =
          session.metadata
            ?.bookingId;


        console.log(
          "BOOKING ID:",
          bookingId
        );


        if (!bookingId) {

          console.error(
            "BOOKING ID NOT FOUND IN STRIPE METADATA"
          );

          break;
        }


        // -----------------------------------------------
        // ONLY MARK PAID IF STRIPE SAYS PAID
        // -----------------------------------------------

        if (
          session.payment_status ===
          "paid"
        ) {

          const booking =
            await Booking
              .findByIdAndUpdate(

                bookingId,

                {
                  isPaid: true,
                  paymentLink: "",
                },

                {
                  new: true,
                }

              );


          if (!booking) {

            console.error(
              "BOOKING NOT FOUND:",
              bookingId
            );

            break;
          }


          console.log(
            "BOOKING MARKED AS PAID:",
            booking._id.toString()
          );
        }


        break;
      }


      // =================================================
      // OTHER STRIPE EVENTS
      // =================================================

      default: {

        console.log(
          "UNHANDLED EVENT TYPE:",
          event.type
        );

      }
    }


    // ====================================================
    // 4. ACKNOWLEDGE WEBHOOK
    // ====================================================

    return response.json({
      received: true,
    });


  } catch (error) {

    console.error(
      "WEBHOOK PROCESSING ERROR:",
      error
    );


    return response
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
};