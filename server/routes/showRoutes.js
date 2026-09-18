import express from "express";

import {
  addShow,
  getNowPlayingMovies,
  getShows,
  getShow,
} from "../Controller/showController.js";

import {
  protectAdmin,
} from "../middleware/auth.js";


const showRouter =
  express.Router();


// ======================================================
// GET NOW PLAYING MOVIES FROM TMDB
// ======================================================
//
// GET /api/show/now-playing
//
// Admin only
//

showRouter.get(
  "/now-playing",
  protectAdmin,
  getNowPlayingMovies
);


// ======================================================
// ADD NEW SHOW
// ======================================================
//
// POST /api/show/add
//
// Admin only
//

showRouter.post(
  "/add",
  protectAdmin,
  addShow
);


// ======================================================
// GET ALL UPCOMING MOVIES
// ======================================================
//
// GET /api/show/all
//

showRouter.get(
  "/all",
  getShows
);


// ======================================================
// GET SINGLE MOVIE + SHOW DATES/TIMES
// ======================================================
//
// Example:
//
// GET /api/show/550
//
// Response:
//
// {
//   success: true,
//   movie: {...},
//   dateTime: {
//     "2026-09-17": [
//       {
//         time: "...",
//         showId: "..."
//       }
//     ]
//   }
// }
//

showRouter.get(
  "/:movieId",
  getShow
);


export default showRouter;