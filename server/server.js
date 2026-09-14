import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { clerkMiddleware } from "@clerk/express";
import { functions, inngest } from "./inngest/index.js";
import { serve } from "inngest/express";

const app = express();
const port = process.env.PORT || 3000;
const isVercel = !!process.env.VERCEL;

try {
  await connectDB();
} catch (error) {
  if (!isVercel) throw error;
  console.error("DB connection failed (Vercel mode):", error.message);
}

// JSON + CORS
app.use(express.json());
app.use(cors());

// Public probe route – before Inngest and Clerk
app.get("/api/test-public", (req, res) => {
  res.json({ message: "test-public OK", clerkProtected: false });
});

// Inngest endpoint – must be before Clerk
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

// Clerk (after Inngest)
app.use(clerkMiddleware());

// API Routes
app.get("/", (req, res) => {
  res.send("Server is Live!");
});

if (!isVercel) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
