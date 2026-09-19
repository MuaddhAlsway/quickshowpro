
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
// Stripe signature verification requires the
// original raw request body.
//
// This route MUST be registered before express.json().
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
// Local development:
// Throw the error if MongoDB fails to connect.
//
// Vercel:
// Log the error without crashing Express during
// initialization.
//
// Database-dependent requests may still fail if
// MongoDB remains unavailable.
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

  if (!isVercel) {
    throw error;
  }
}

// ======================================================
// 3. GLOBAL MIDDLEWARE
// ======================================================

app.use(
  express.json()
);

app.use(
  cors()
);

// ======================================================
// 4. PUBLIC TEST ROUTE
//
// GET /api/test-public
// ======================================================

app.get(
  "/api/test-public",

  (req, res) => {
    return res.json({
      success: true,

      message: "test-public OK",

      clerkProtected: false,
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
// Functions are imported from:
//
// ./inngest/index.js
//
// Expected functions:
//
// 1. sync-user-from-clerk
// 2. delete-user-with-clerk
// 3. update-user-from-clerk
// 4. release-seats-delete-booking
// 5. send-booking-confirmation-email
// 6. retry-pending-confirmation-emails
// 7. send-movie-reminder-24h
// 8. send-movie-reminder-2h
// ======================================================

app.use(
  "/api/inngest",

  serve({
    client: inngest,

    functions,
  })
);

// ======================================================
// 6. CLERK MIDDLEWARE
//
// Stripe and Inngest endpoints are registered before
// Clerk middleware.
//
// Protected API routes should use their appropriate
// authentication and authorization middleware.
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
// Vercel:
// Export the Express application.
//
// Local development:
// Start the HTTP server.
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