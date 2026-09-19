import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import connectDB from "../configs/db.js";

import {
  Inngest,
} from "inngest";


// ======================================================
// INNGEST CLIENT
// ======================================================

export const inngest =
  new Inngest({
    id: "movie-ticket-booking",
  });


// ======================================================
// CREATE USER
//
// Clerk
//   ↓
// clerk/user.created
//   ↓
// Inngest
//   ↓
// MongoDB
// ======================================================

const syncUserCreation =
  inngest.createFunction(

    {
      id: "sync-user-from-clerk",

      triggers: [
        {
          event:
            "clerk/user.created",
        },
      ],
    },

    async ({ event }) => {

      // ================================================
      // 1. CONNECT DATABASE
      // ================================================

      await connectDB();


      // ================================================
      // 2. GET CLERK USER DATA
      // ================================================

      const {
        id,
        first_name,
        last_name,
        email_addresses = [],
        image_url,
      } = event.data;


      // ================================================
      // 3. GET EMAIL
      // ================================================

      const email =
        email_addresses[0]
          ?.email_address;


      if (!email) {

        throw new Error(
          `Clerk user ${id} has no email address`
        );
      }


      // ================================================
      // 4. PREPARE USER DATA
      // ================================================

      const userData = {

        _id:
          id,

        email,

        name:
          `${first_name ?? ""} ${
            last_name ?? ""
          }`.trim(),

        image:
          image_url ?? "",

      };


      // ================================================
      // 5. CREATE / UPDATE USER
      //
      // upsert = true
      //
      // If user exists:
      //    update
      //
      // If user doesn't exist:
      //    create
      // ================================================

      const user =
        await User.findByIdAndUpdate(

          id,

          userData,

          {
            new: true,
            upsert: true,
            runValidators: true,
          }

        );


      // ================================================
      // 6. RETURN RESULT
      // ================================================

      return {

        success:
          true,

        userId:
          user._id,

      };
    }
  );


// ======================================================
// DELETE USER
//
// Clerk
//   ↓
// clerk/user.deleted
//   ↓
// Inngest
//   ↓
// MongoDB
// ======================================================

const syncUserDeletion =
  inngest.createFunction(

    {
      id:
        "delete-user-with-clerk",

      triggers: [
        {
          event:
            "clerk/user.deleted",
        },
      ],
    },

    async ({ event }) => {

      // ================================================
      // 1. CONNECT DATABASE
      // ================================================

      await connectDB();


      // ================================================
      // 2. GET CLERK USER ID
      // ================================================

      const {
        id,
      } = event.data;


      if (!id) {

        throw new Error(
          "Clerk delete event has no user ID"
        );
      }


      // ================================================
      // 3. DELETE USER
      // ================================================

      const deletedUser =
        await User.findByIdAndDelete(
          id
        );


      // ================================================
      // 4. RETURN RESULT
      // ================================================

      return {

        success:
          true,

        userId:
          id,

        deleted:
          Boolean(
            deletedUser
          ),

      };
    }
  );


// ======================================================
// UPDATE USER
//
// Clerk
//   ↓
// clerk/user.updated
//   ↓
// Inngest
//   ↓
// MongoDB
// ======================================================

const syncUserUpdation =
  inngest.createFunction(

    {
      id:
        "update-user-from-clerk",

      triggers: [
        {
          event:
            "clerk/user.updated",
        },
      ],
    },

    async ({ event }) => {

      // ================================================
      // 1. CONNECT DATABASE
      // ================================================

      await connectDB();


      // ================================================
      // 2. GET CLERK USER DATA
      // ================================================

      const {
        id,
        first_name,
        last_name,
        email_addresses = [],
        image_url,
      } = event.data;


      // ================================================
      // 3. GET EMAIL
      // ================================================

      const email =
        email_addresses[0]
          ?.email_address;


      if (!email) {

        throw new Error(
          `Clerk user ${id} has no email address`
        );
      }


      // ================================================
      // 4. PREPARE UPDATED DATA
      // ================================================

      const userData = {

        email,

        name:
          `${first_name ?? ""} ${
            last_name ?? ""
          }`.trim(),

        image:
          image_url ?? "",

      };


      // ================================================
      // 5. UPDATE USER
      // ================================================

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


      // ================================================
      // 6. RETURN RESULT
      // ================================================

      return {

        success:
          true,

        userId:
          updatedUser._id,

      };
    }
  );


// ======================================================
// RELEASE SEATS + DELETE UNPAID BOOKING
//
// createBooking()
//      ↓
// app/checkpayment
//      ↓
// Inngest receives event
//      ↓
// Wait 10 minutes
//      ↓
// Check booking.isPaid
//
//        ┌──────────────┐
//        │   isPaid?    │
//        └──────┬───────┘
//           YES │ NO
//          ┌────┴────┐
//          ↓         ↓
//        KEEP      RELEASE
//       BOOKING      SEATS
//                    ↓
//                  DELETE
//                  BOOKING
// ======================================================

const releaseSeatsAndDeleteBooking =
  inngest.createFunction(

    // ==================================================
    // FUNCTION CONFIGURATION
    // ==================================================

    {
      id:
        "release-seats-delete-booking",

      triggers: [
        {
          event:
            "app/checkpayment",
        },
      ],
    },


    // ==================================================
    // FUNCTION HANDLER
    // ==================================================

    async ({
      event,
      step,
    }) => {


      // ================================================
      // 1. GET BOOKING ID
      // ================================================

      const bookingId =
        event.data
          ?.bookingId;


      if (!bookingId) {

        throw new Error(
          "Booking ID is missing from app/checkpayment event"
        );
      }


      console.log(
        "\n=============================="
      );

      console.log(
        "PAYMENT CHECK SCHEDULED"
      );

      console.log(
        "BOOKING ID:",
        bookingId
      );


      // ================================================
      // 2. CALCULATE 10 MINUTES
      // ================================================

      const tenMinutesLater =
        new Date(
          Date.now() +
          10 *
          60 *
          1000
        );


      console.log(
        "WAITING UNTIL:",
        tenMinutesLater
      );


      // ================================================
      // 3. WAIT 10 MINUTES
      //
      // IMPORTANT:
      //
      // sleepUntil
      //
      // NOT:
      //
      // sleepUnil
      // ================================================

      await step.sleepUntil(
        "wait-for-10-minutes",
        tenMinutesLater
      );


      // ================================================
      // 4. CHECK PAYMENT STATUS
      // ================================================

      return await step.run(

        "check-payment-status",

        async () => {


          // ============================================
          // CONNECT DATABASE
          // ============================================

          await connectDB();


          console.log(
            "\n=============================="
          );

          console.log(
            "CHECKING PAYMENT STATUS"
          );

          console.log(
            "BOOKING ID:",
            bookingId
          );


          // ============================================
          // FIND BOOKING
          // ============================================

          const booking =
            await Booking.findById(
              bookingId
            );


          // ============================================
          // BOOKING DOES NOT EXIST
          // ============================================

          if (!booking) {

            console.log(
              "BOOKING DOES NOT EXIST:",
              bookingId
            );


            console.log(
              "==============================\n"
            );


            return {

              success:
                true,

              bookingExists:
                false,

              message:
                "Booking already removed",

            };
          }


          // ============================================
          // LOG PAYMENT STATUS
          // ============================================

          console.log(
            "BOOKING FOUND:",
            booking._id.toString()
          );


          console.log(
            "IS PAID:",
            booking.isPaid
          );


          // ============================================
          // 5. BOOKING IS PAID
          //
          // Stripe webhook already changed:
          //
          // isPaid = true
          //
          // Therefore we do NOTHING.
          // ============================================

          if (
            booking.isPaid
          ) {

            console.log(
              "PAYMENT COMPLETED"
            );

            console.log(
              "BOOKING WILL BE KEPT:",
              booking._id.toString()
            );

            console.log(
              "==============================\n"
            );


            return {

              success:
                true,

              paid:
                true,

              bookingDeleted:
                false,

            };
          }


          // ============================================
          // 6. PAYMENT WAS NOT COMPLETED
          // ============================================

          console.log(
            "PAYMENT NOT COMPLETED"
          );


          console.log(
            "RELEASING SEATS..."
          );


          // ============================================
          // 7. FIND SHOW
          // ============================================

          const show =
            await Show.findById(
              booking.show
            );


          // ============================================
          // 8. RELEASE RESERVED SEATS
          // ============================================

          if (show) {


            // ==========================================
            // MAKE SURE occupiedSeats EXISTS
            // ==========================================

            if (
              !show.occupiedSeats
            ) {

              show.occupiedSeats =
                {};
            }


            // ==========================================
            // DELETE EACH RESERVED SEAT
            // ==========================================

            booking.bookedSeats
              .forEach(
                (seat) => {

                  delete show
                    .occupiedSeats[
                      seat
                    ];

                }
              );


            // ==========================================
            // TELL MONGOOSE OBJECT WAS MODIFIED
            // ==========================================

            show.markModified(
              "occupiedSeats"
            );


            // ==========================================
            // SAVE SHOW
            // ==========================================

            await show.save();


            console.log(
              "SEATS RELEASED:",
              booking.bookedSeats
            );


          } else {

            console.log(
              "SHOW NOT FOUND:",
              booking.show
            );
          }


          // ============================================
          // 9. DELETE UNPAID BOOKING
          // ============================================

          await Booking
            .findByIdAndDelete(
              booking._id
            );


          console.log(
            "UNPAID BOOKING DELETED:",
            booking._id.toString()
          );


          console.log(
            "==============================\n"
          );


          // ============================================
          // 10. RETURN RESULT
          // ============================================

          return {

            success:
              true,

            paid:
              false,

            bookingDeleted:
              true,

            releasedSeats:
              booking.bookedSeats,

          };
        }
      );
    }
  );


// ======================================================
// EXPORT ALL INNGEST FUNCTIONS
// ======================================================

export const functions = [

  syncUserCreation,

  syncUserDeletion,

  syncUserUpdation,

  releaseSeatsAndDeleteBooking,

];