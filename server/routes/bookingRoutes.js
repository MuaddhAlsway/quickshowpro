import express from "express";

import {
  createBooking,
  getOcuppiedSeats,
} from "../Controller/bookingController.js";

const bookingRouter = express.Router();

bookingRouter.post("/create", createBooking);

bookingRouter.get("/seats/:showId", getOcuppiedSeats);

export default bookingRouter;