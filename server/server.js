
import express from "express";
import cors from "cors";
import "dotenv/config";

// ======================================================
// DATABASE
// ======================================================

import connectDB from "./configs/db.js";

// ======================================================
// CLERK
// ======================================================

import { clerkMiddleware } from "@clerk/express";

// ======================================================
// INNGEST
// ======================================================

import {
  functions,
  inngest,
} from "./inngest/index.js";

import { serve } from "inngest/express";

// ======================================================
// ROUTES
// ======================================================

import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRouter.js";
import userRouter from "./routes/userRoutes.js";

// ======================================================
// STRIPE WEBHOOK
// ======================================================

import {
  stripeWebhooks,
} from "./Controller/stripeWebhook.js";

// ======================================================
// EXPRESS APPLICATION
// ======================================================

const app = express();

const port = process.env.PORT || 3000;

const isVercel = Boolean(process.env.VERCEL);

// ======================================================
// 1. STRIPE WEBHOOK
//
// IMPORTANT:
//
// Stripe must receive the original raw request body
// for signature verification.
//
// Register this route BEFORE express.json().
//
// Stripe
//    ↓
// POST /api/stripe
//    ↓
// Verify signature
//    ↓
// Update booking.isPaid
//    ↓
// Trigger Inngest booking confirmation email
// ======================================================

app.post(
  "/api/stripe",

  express.raw({
    type: "application/json",
  }),

  stripeWebhooks
);

// ======================================================
// 2. DATABASE CONNECTION
//
// Connect MongoDB before starting the application.
// ======================================================

try {
  await connectDB();

  console.log(
    "MongoDB connected successfully"
  );
} catch (error) {
  console.error(
    "MongoDB connection failed:",
    error.message
  );

  throw error;
}

// ======================================================
// 3. GLOBAL MIDDLEWARE
// ======================================================

// Parse JSON requests for normal API routes.

app.use(
  express.json()
);

// Enable CORS for the frontend.

app.use(
  cors()
);

// ======================================================
// 4. PUBLIC TEST ROUTE
//
// GET /api/test-public
//
// Used to verify that the Express backend
// is reachable without Clerk authentication.
// ======================================================

app.get(
  "/api/test-public",

  (req, res) => {
    return res.json({
      success: true,

      message:
        "test-public OK",

      clerkProtected:
        false,
    });
  }
);

// ======================================================
// 5. INNGEST
//
// Endpoint:
//
// /api/inngest
//
// Registered functions:
//
// 1. syncUserCreation
// 2. syncUserDeletion
// 3. syncUserUpdation
// 4. releaseSeatsAndDeleteBooking
// 5. sendBookingConfirmationEmail
//
// All five functions must be exported from:
//
// ./inngest/index.js
// ======================================================

app.use(
  "/api/inngest",

  serve({
    client: inngest,

    functions,
  })
);

// ======================================================
// 6. CLERK AUTHENTICATION
//
// Clerk middleware runs after the public
// Stripe and Inngest endpoints.
//
// Individual protected routes should still use
// their appropriate authentication middleware.
// ======================================================

app.use(
  clerkMiddleware()
);

// ======================================================
// 7. ROOT ROUTE
//
// GET /
// ======================================================

app.get(
  "/",

  (req, res) => {
    return res.send(
      "Server is Live!"
    );
  }
);

// ======================================================
// 8. SHOW ROUTES
//
// /api/show
// ======================================================

app.use(
  "/api/show",

  showRouter
);

// ======================================================
// 9. BOOKING ROUTES
//
// /api/booking
// ======================================================

app.use(
  "/api/booking",

  bookingRouter
);

// ======================================================
// 10. ADMIN ROUTES
//
// /api/admin
// ======================================================

app.use(
  "/api/admin",

  adminRouter
);

// ======================================================
// 11. USER ROUTES
//
// /api/user
// ======================================================

app.use(
  "/api/user",

  userRouter
);

// ======================================================
// 12. LOCAL DEVELOPMENT SERVER
//
// On Vercel:
//
// Export the Express application.
// Do not call app.listen().
//
// Locally:
//
// Start Express on port 3000,
// unless PORT is configured.
// ======================================================

if (!isVercel) {
  app.listen(
    port,

    () => {
      console.log(
        `Server listening at http://localhost:${port}`
      );
    }
  );
}

// ======================================================
// 13. VERCEL EXPORT
// ======================================================

export default app;