import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";


// ======================================================
// STRIPE
// ======================================================

const stripeInstance = new Stripe(
  process.env.STRIPE_SECRET_KEY
);


// ======================================================
// CHECK SEAT AVAILABILITY
// ======================================================

const checkSeatsAvailability = async (
  showId,
  selectedSeats
) => {

  const showData =
    await Show.findById(showId);


  if (!showData) {
    return {
      available: false,
      reason: "Show not found",
    };
  }


  const occupiedSeats =
    showData.occupiedSeats || {};


  const takenSeats =
    selectedSeats.filter(
      (seat) =>
        Boolean(
          occupiedSeats[seat]
        )
    );


  if (takenSeats.length > 0) {

    return {
      available: false,

      reason:
        `Seats already booked: ${takenSeats.join(", ")}`,
    };
  }


  return {
    available: true,
    showData,
  };
};


// ======================================================
// CREATE BOOKING
// ======================================================

export const createBooking = async (
  req,
  res
) => {

  let booking = null;
  let showData = null;

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
          success: false,
          message:
            "Unauthorized user",
        });
    }


    // ==================================================
    // 2. REQUEST BODY
    // ==================================================

    const {
      showId,
      selectedSeats,
    } = req.body;


    console.log(
      "SHOW ID:",
      showId
    );

    console.log(
      "SELECTED SEATS:",
      selectedSeats
    );


    if (!showId) {

      return res
        .status(400)
        .json({
          success: false,
          message:
            "Show ID is required",
        });
    }


    if (
      !Array.isArray(
        selectedSeats
      ) ||
      selectedSeats.length === 0
    ) {

      return res
        .status(400)
        .json({
          success: false,
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
          success: false,
          message:
            "Stripe secret key is missing",
        });
    }


    // ==================================================
    // 4. CHECK SEATS
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


    if (!seatCheck.available) {

      return res
        .status(409)
        .json({
          success: false,
          message:
            seatCheck.reason,
        });
    }


    // ==================================================
    // 5. GET SHOW + MOVIE
    // ==================================================

    showData =
      await Show.findById(
        showId
      ).populate("movie");


    if (!showData) {

      return res
        .status(404)
        .json({
          success: false,
          message:
            "Show not found",
        });
    }


    if (!showData.movie) {

      return res
        .status(404)
        .json({
          success: false,
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
    // 6. CALCULATE AMOUNT
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
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return res
        .status(400)
        .json({
          success: false,
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

      });


    console.log(
      "BOOKING CREATED:",
      booking._id.toString()
    );


    // ==================================================
    // 8. RESERVE SEATS
    // ==================================================

    if (!showData.occupiedSeats) {
      showData.occupiedSeats = {};
    }


    selectedSeats.forEach(
      (seat) => {

        showData
          .occupiedSeats[seat] =
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
    // 9. FRONTEND ORIGIN
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
              showData.movie.title,

          },

          unit_amount:
            Math.round(
              amount * 100
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
    // 11. CREATE STRIPE SESSION
    // ==================================================

    const session =
      await stripeInstance
        .checkout
        .sessions
        .create({

          success_url:
            `${origin}/mybookings`,

          cancel_url:
            `${origin}/mybookings`,

          line_items:
            lineItems,

          mode:
            "payment",

          metadata: {

            bookingId:
              booking._id.toString(),

          },

          expires_at:
            Math.floor(
              Date.now() / 1000
            ) +
            30 * 60,

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
    // 12. SAVE PAYMENT LINK
    // ==================================================

    booking.paymentLink =
      session.url;


    await booking.save();


    // ==================================================
    // 13. RESPONSE
    // ==================================================

    console.log(
      "BOOKING RESPONSE SUCCESS"
    );

    console.log(
      "==============================\n"
    );


    return res.json({
      success: true,

      url:
        session.url,

      bookingId:
        booking._id,
    });


  } catch (error) {

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
    // RELEASE SEATS IF STRIPE CREATION FAILED
    // ==================================================

    if (
      booking &&
      showData
    ) {

      try {

        selectedSeats?.forEach(
          (seat) => {

            delete showData
              .occupiedSeats[seat];

          }
        );


        showData.markModified(
          "occupiedSeats"
        );


        await showData.save();


        await Booking.findByIdAndDelete(
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


    return res
      .status(500)
      .json({
        success: false,
        message:
          error.message ||
          "Booking failed",
      });
  }
};


// ======================================================
// GET OCCUPIED SEATS
// ======================================================

export const getOcuppiedSeats = async (
  req,
  res
) => {

  try {

    const {
      showId,
    } = req.params;


    const showData =
      await Show.findById(
        showId
      );


    if (!showData) {

      return res
        .status(404)
        .json({
          success: false,
          message:
            "Show not found",
        });
    }


    const occupiedSeats =
      Object.keys(
        showData.occupiedSeats ||
        {}
      );


    return res.json({
      success: true,
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
        success: false,
        message:
          error.message,
      });
  }
};