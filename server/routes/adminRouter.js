import express from "express";

import { protectAdmin } from "../middleware/auth.js";

import {
  getAllBookings,
  getAllShows,
  getDashboardData,
  isAdmin,
} from "../Controller/adminController.js";

const adminRouter = express.Router();

// Check if current user is admin
adminRouter.get(
  "/is-admin",
  protectAdmin,
  isAdmin
);

// Get admin dashboard statistics
adminRouter.get(
  "/dashboard",
  protectAdmin,
  getDashboardData
);

// Get all upcoming shows
adminRouter.get(
  "/all-shows",
  protectAdmin,
  getAllShows
);

// Get all bookings
adminRouter.get(
  "/all-bookings",
  protectAdmin,
  getAllBookings
);

export default adminRouter;