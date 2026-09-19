import express from "express";
import cors from "cors";
import "dotenv/config";

import connectDB from "./configs/db.js";

import { clerkMiddleware } from "@clerk/express";

import {
  functions,
  inngest,
} from "./inngest/index.js";

import { serve } from "inngest/express";

import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRouter.js";
import userRouter from "./routes/userRoutes.js";

import {
  stripeWebhooks,
} from "./Controller/stripeWebhook.js";


const app = express();

const port =
  process.env.PORT || 3000;

const isVercel =
  !!process.env.VERCEL;


// ======================================================
// STRIPE WEBHOOK
//
// IMPORTANT:
// Must be BEFORE express.json()
//
// Stripe signature verification requires
// the original RAW request body.
// ======================================================

app.post(
  "/api/stripe",
  express.raw({
    type: "application/json",
  }),
  stripeWebhooks
);


// ======================================================
// DATABASE
// ======================================================

try {

  await connectDB();

} catch (error) {

  if (!isVercel) {
    throw error;
  }

  console.error(
    "DB connection failed (Vercel mode):",
    error.message
  );
}


// ======================================================
// GLOBAL MIDDLEWARE
// ======================================================

app.use(
  express.json()
);

app.use(
  cors()
);


// ======================================================
// PUBLIC TEST ROUTE
// ======================================================

app.get(
  "/api/test-public",
  (req, res) => {

    res.json({
      message:
        "test-public OK",

      clerkProtected:
        false,
    });
  }
);


// ======================================================
// INNGEST
// ======================================================

app.use(
  "/api/inngest",

  serve({
    client:
      inngest,

    functions,
  })
);


// ======================================================
// CLERK
// ======================================================

app.use(
  clerkMiddleware()
);


// ======================================================
// ROOT
// ======================================================

app.get(
  "/",
  (req, res) => {

    res.send(
      "Server is Live!"
    );
  }
);


// ======================================================
// API ROUTES
// ======================================================

app.use(
  "/api/show",
  showRouter
);

app.use(
  "/api/booking",
  bookingRouter
);

app.use(
  "/api/admin",
  adminRouter
);

app.use(
  "/api/user",
  userRouter
);


// ======================================================
// LOCAL SERVER
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
// VERCEL EXPORT
// ======================================================

export default app;