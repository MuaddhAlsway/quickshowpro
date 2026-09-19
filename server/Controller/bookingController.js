import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

import {
  inngest,
} from "../inngest/index.js";


// ======================================================
// STRIPE
// ======================================================

const stripeInstance =
  new Stripe(
    process.env.STRIPE_SECRET_KEY
  );


// ======================================================
// CHECK SEAT AVAILABILITY
// ======================================================

const checkSeatsAvailability =
  async (
    showId,
    selectedSeats
  ) => {

    // ==================================================
    // FIND SHOW
    // ==================================================

    const showData =
      await Show.findById(
        showId
      );


    // ==================================================
    // SHOW NOT FOUND
    // ==================================================

    if (!showData) {

      return {

        available:
          false,

        reason:
          "Show not found",

      };
    }


    // ==================================================
    // GET OCCUPIED SEATS
    // ==================================================

    const occupiedSeats =
      showData.occupiedSeats ||
      {};


    // ==================================================
    // FIND ALREADY TAKEN SEATS
    // ==================================================

    const takenSeats =
      selectedSeats.filter(
        (seat) =>
          Boolean(
            occupiedSeats[
              seat
            ]
          )
      );


    // ==================================================
    // SOME SEATS ARE ALREADY TAKEN
    // ==================================================

    if (
      takenSeats.length > 0
    ) {

      return {

        available:
          false,

        reason:
          `Seats already booked: ${takenSeats.join(
            ", "
          )}`,

      };
    }


    // ==================================================
    // AVAILABLE
    // ==================================================

    return {

      available:
        true,

      showData,

    };
  };


// ======================================================
// CREATE BOOKING
// ======================================================

export const createBooking =
  async (
    req,
    res
  ) => {

    // ==================================================
    // VARIABLES USED FOR ROLLBACK
    // ==================================================

    let booking =
      null;

    let showData =
      null;

    let selectedSeats =
      [];


    try {

      console.log(
        "\n=============================="
      );

      console.log(
        "CREATE BOOKING STARTED"
      );


      // ==================================================
      // 1. AUTH
      // ==================================================

      const auth =
        req.auth();


      const userId =
        auth?.userId;


      console.log(
        "USER ID:",
        userId
      );


      if (!userId) {

        return res
          .status(401)
          .json({

            success:
              false,

            message:
              "Unauthorized user",

          });
      }


      // ==================================================
      // 2. REQUEST BODY
      // ==================================================

      const {
        showId,
      } = req.body;


      selectedSeats =
        req.body
          .selectedSeats ||
        [];


      console.log(
        "SHOW ID:",
        showId
      );


      console.log(
        "SELECTED SEATS:",
        selectedSeats
      );


      // ==================================================
      // VALIDATE SHOW ID
      // ==================================================

      if (!showId) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "Show ID is required",

          });
      }


      // ==================================================
      // VALIDATE SEATS
      // ==================================================

      if (
        !Array.isArray(
          selectedSeats
        ) ||
        selectedSeats.length ===
          0
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "Select at least one seat",

          });
      }


      // ==================================================
      // 3. CHECK STRIPE ENV
      // ==================================================

      if (
        !process.env
          .STRIPE_SECRET_KEY
      ) {

        console.error(
          "STRIPE_SECRET_KEY IS MISSING"
        );


        return res
          .status(500)
          .json({

            success:
              false,

            message:
              "Stripe secret key is missing",

          });
      }


      // ==================================================
      // 4. CHECK SEAT AVAILABILITY
      // ==================================================

      const seatCheck =
        await checkSeatsAvailability(
          showId,
          selectedSeats
        );


      console.log(
        "SEAT CHECK:",
        seatCheck
      );


      if (
        !seatCheck.available
      ) {

        return res
          .status(409)
          .json({

            success:
              false,

            message:
              seatCheck.reason,

          });
      }


      // ==================================================
      // 5. GET SHOW + MOVIE
      // ==================================================

      showData =
        await Show
          .findById(
            showId
          )
          .populate(
            "movie"
          );


      // ==================================================
      // SHOW NOT FOUND
      // ==================================================

      if (!showData) {

        return res
          .status(404)
          .json({

            success:
              false,

            message:
              "Show not found",

          });
      }


      // ==================================================
      // MOVIE NOT FOUND
      // ==================================================

      if (
        !showData.movie
      ) {

        return res
          .status(404)
          .json({

            success:
              false,

            message:
              "Movie data not found",

          });
      }


      console.log(
        "MOVIE:",
        showData.movie.title
      );


      console.log(
        "SHOW PRICE:",
        showData.showPrice
      );


      // ==================================================
      // 6. CALCULATE BOOKING AMOUNT
      // ==================================================

      const amount =
        Number(
          showData.showPrice
        ) *
        selectedSeats.length;


      console.log(
        "BOOKING AMOUNT:",
        amount
      );


      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              "Invalid booking amount",

          });
      }


      // ==================================================
      // 7. CREATE BOOKING
      // ==================================================

      booking =
        await Booking.create({

          user:
            userId,

          show:
            showId,

          amount,

          bookedSeats:
            selectedSeats,

          isPaid:
            false,

        });


      console.log(
        "BOOKING CREATED:",
        booking._id.toString()
      );


      // ==================================================
      // 8. RESERVE SEATS
      // ==================================================

      if (
        !showData
          .occupiedSeats
      ) {

        showData
          .occupiedSeats =
          {};
      }


      selectedSeats.forEach(
        (seat) => {

          showData
            .occupiedSeats[
              seat
            ] =
            userId;

        }
      );


      showData.markModified(
        "occupiedSeats"
      );


      await showData.save();


      console.log(
        "SEATS RESERVED:",
        selectedSeats
      );


      // ==================================================
      // 9. GET FRONTEND ORIGIN
      // ==================================================

      const origin =
        req.headers.origin;


      console.log(
        "FRONTEND ORIGIN:",
        origin
      );


      if (!origin) {

        throw new Error(
          "Frontend origin is missing"
        );
      }


      // ==================================================
      // 10. STRIPE LINE ITEMS
      // ==================================================

      const lineItems = [

        {

          price_data: {

            currency:
              "usd",

            product_data: {

              name:
                showData
                  .movie
                  .title,

            },

            unit_amount:
              Math.round(
                amount *
                100
              ),

          },

          quantity:
            1,

        },

      ];


      console.log(
        "CREATING STRIPE SESSION..."
      );


      // ==================================================
      // 11. CREATE STRIPE CHECKOUT SESSION
      // ==================================================

      const session =
        await stripeInstance
          .checkout
          .sessions
          .create({

            // ============================================
            // SUCCESS
            // ============================================

            success_url:
              `${origin}/mybookings`,


            // ============================================
            // CANCEL
            // ============================================

            cancel_url:
              `${origin}/mybookings`,


            // ============================================
            // PRODUCTS
            // ============================================

            line_items:
              lineItems,


            // ============================================
            // PAYMENT MODE
            // ============================================

            mode:
              "payment",


            // ============================================
            // CONNECT STRIPE SESSION TO BOOKING
            // ============================================

            metadata: {

              bookingId:
                booking
                  ._id
                  .toString(),

            },


            // ============================================
            // 10 MINUTE CHECKOUT EXPIRATION
            //
            // Keep this aligned with the Inngest
            // unpaid-booking cleanup.
            // ============================================

            expires_at:
              Math.floor(
                Date.now() /
                1000
              ) +
              10 *
              60,

          });


      console.log(
        "STRIPE SESSION CREATED:",
        session.id
      );


      console.log(
        "STRIPE URL:",
        session.url
      );


      // ==================================================
      // 12. SAVE STRIPE PAYMENT LINK
      // ==================================================

      booking.paymentLink =
        session.url;


      await booking.save();


      console.log(
        "PAYMENT LINK SAVED"
      );


      // ==================================================
      // 13. SEND INNGEST PAYMENT CHECK EVENT
      //
      // This triggers:
      //
      // app/checkpayment
      //
      // Inngest waits 10 minutes and then checks:
      //
      // booking.isPaid
      //
      // Paid:
      //    keep booking
      //
      // Unpaid:
      //    release seats
      //    delete booking
      // ==================================================

      await inngest.send({

        name:
          "app/checkpayment",

        data: {

          bookingId:
            booking
              ._id
              .toString(),

        },

      });


      console.log(
        "INNGEST PAYMENT CHECK SCHEDULED:",
        booking._id.toString()
      );


      // ==================================================
      // 14. SUCCESS RESPONSE
      // ==================================================

      console.log(
        "BOOKING RESPONSE SUCCESS"
      );


      console.log(
        "==============================\n"
      );


      return res.json({

        success:
          true,

        url:
          session.url,

        bookingId:
          booking._id,

      });


    } catch (error) {

      // ==================================================
      // ERROR
      // ==================================================

      console.error(
        "\nCREATE BOOKING FAILED"
      );


      console.error(
        "ERROR NAME:",
        error.name
      );


      console.error(
        "ERROR MESSAGE:",
        error.message
      );


      console.error(
        "ERROR STACK:",
        error.stack
      );


      // ==================================================
      // ROLLBACK
      //
      // If booking creation succeeded but something
      // afterward failed:
      //
      // 1. Release reserved seats
      // 2. Delete booking
      // ==================================================

      if (
        booking &&
        showData
      ) {

        try {

          // ==============================================
          // RELEASE RESERVED SEATS
          // ==============================================

          selectedSeats.forEach(
            (seat) => {

              delete showData
                .occupiedSeats[
                  seat
                ];

            }
          );


          showData.markModified(
            "occupiedSeats"
          );


          await showData.save();


          // ==============================================
          // DELETE BOOKING
          // ==============================================

          await Booking
            .findByIdAndDelete(
              booking._id
            );


          console.log(
            "ROLLBACK COMPLETE"
          );


        } catch (
          rollbackError
        ) {

          console.error(
            "ROLLBACK ERROR:",
            rollbackError.message
          );
        }
      }


      // ==================================================
      // ERROR RESPONSE
      // ==================================================

      return res
        .status(500)
        .json({

          success:
            false,

          message:
            error.message ||
            "Booking failed",

        });
    }
  };


// ======================================================
// GET OCCUPIED SEATS
// ======================================================

export const getOcuppiedSeats =
  async (
    req,
    res
  ) => {

    try {

      // ==================================================
      // GET SHOW ID
      // ==================================================

      const {
        showId,
      } = req.params;


      // ==================================================
      // FIND SHOW
      // ==================================================

      const showData =
        await Show.findById(
          showId
        );


      // ==================================================
      // SHOW NOT FOUND
      // ==================================================

      if (!showData) {

        return res
          .status(404)
          .json({

            success:
              false,

            message:
              "Show not found",

          });
      }


      // ==================================================
      // GET OCCUPIED SEAT NUMBERS
      // ==================================================

      const occupiedSeats =
        Object.keys(

          showData
            .occupiedSeats ||
          {}

        );


      // ==================================================
      // RESPONSE
      // ==================================================

      return res.json({

        success:
          true,

        occupiedSeats,

      });


    } catch (error) {

      console.error(
        "GET OCCUPIED SEATS ERROR:",
        error.message
      );


      return res
        .status(500)
        .json({

          success:
            false,

          message:
            error.message,

        });
    }
  };