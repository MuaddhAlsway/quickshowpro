import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";


// ======================================================
// API TO CHECK IF USER IS ADMIN
// ======================================================

export const isAdmin = async (req, res) => {
  res.json({
    success: true,
    isAdmin: true,
  });
};


// ======================================================
// API TO GET DASHBOARD DATA
// ======================================================

export const getDashboardData = async (req, res) => {
  try {

    // Get all paid bookings
    const bookings = await Booking.find({
      isPaid: true,
    });


    // Get all upcoming shows
    const activeShows = await Show.find({
      showDateTime: {
        $gte: new Date(),
      },
    }).populate("movie");


    // Count all users
    const totalUser = await User.countDocuments();


    // Build dashboard data
    const dashboardData = {

      totalBookings: bookings.length,

      totalRevenue: bookings.reduce(
        (acc, booking) => acc + booking.amount,
        0
      ),

      activeShows,

      totalUser,
    };


    res.json({
      success: true,
      dashboardData,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ======================================================
// API TO GET ALL SHOWS
// ======================================================

export const getAllShows = async (req, res) => {
  try {

    const shows = await Show.find({
      showDateTime: {
        $gte: new Date(),
      },
    })
      .populate("movie")
      .sort({
        showDateTime: 1,
      });


    res.json({
      success: true,
      shows,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ======================================================
// API TO GET ALL BOOKINGS
// ======================================================

export const getAllBookings = async (req, res) => {
  try {

    const bookings = await Booking.find({})

      // Populate user information
      .populate("user")

      // Populate show, then movie inside show
      .populate({
        path: "show",
        populate: {
          path: "movie",
        },
      })

      // Newest booking first
      .sort({
        createdAt: -1,
      });


    res.json({
      success: true,
      bookings,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};