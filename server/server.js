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

// Middleware
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// API Routes
app.get("/", (req, res) => {
  res.send("Server is Live!");
});

// Inngest endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

if (!isVercel) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
