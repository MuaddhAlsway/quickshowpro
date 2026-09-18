import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";


// ======================================================
// API TO GET USER BOOKINGS
// ======================================================

export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.auth();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const bookings = await Booking.find({
      user: userId,
    })
      .populate({
        path: "show",
        populate: {
          path: "movie",
        },
      })
      .sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      bookings,
    });

  } catch (error) {
    console.error("Get User Bookings Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================================================
// API TO ADD / REMOVE FAVORITE MOVIE
// ======================================================

export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const { userId } = req.auth();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await clerkClient.users.getUser(userId);

    let favorites =
      user.privateMetadata?.favorites || [];

    let message;

    // Add favorite
    if (!favorites.includes(movieId)) {
      favorites.push(movieId);

      message = "Favorite added successfully";
    }

    // Remove favorite
    else {
      favorites = favorites.filter(
        (item) => item !== movieId
      );

      message = "Favorite removed successfully";
    }

    await clerkClient.users.updateUserMetadata(
      userId,
      {
        privateMetadata: {
          ...user.privateMetadata,
          favorites,
        },
      }
    );

    res.json({
      success: true,
      message,
      favorites,
    });

  } catch (error) {
    console.error("Update Favorite Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================================================
// API TO GET FAVORITE MOVIES
// ======================================================

export const getFavorites = async (req, res) => {
  try {
    const { userId } = req.auth();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Get Clerk user
    const user = await clerkClient.users.getUser(userId);

    // Get favorite movie IDs
    const favorites =
      user.privateMetadata?.favorites || [];

    // Get movie documents from MongoDB
    const movies = await Movie.find({
      _id: {
        $in: favorites,
      },
    });

    res.json({
      success: true,
      movies,
    });

  } catch (error) {
    console.error("Get Favorites Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};