import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );

    const movies = data.results;

    res.json({
      success: true,
      movies,
    });
  } catch (error) {
    console.error("TMDB Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API to add a new show to the database
export const addShow = async (req, res) => {
  try {
    const { movieId, showInput, showPrice } = req.body;

    // Check if movie already exists
    let movie = await Movie.findById(movieId);

    // If movie does not exist, fetch it from TMDB
    if (!movie) {
      const [movieDetailsResponse, movieCreditsResponse] =
        await Promise.all([
          axios.get(
            `https://api.themoviedb.org/3/movie/${movieId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
              },
            }
          ),

          axios.get(
            `https://api.themoviedb.org/3/movie/${movieId}/credits`,
            {
              headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
              },
            }
          ),
        ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditData = movieCreditsResponse.data;

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      // Add movie to database
      movie = await Movie.create(movieDetails);
    }

    // Build all show documents
    const showsToCreate = [];

    showInput.forEach((show) => {
      const showDate = show.date;

      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;

        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });

    // Add shows to database
    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({
      success: true,
      message: "Show Added successfully",
    });
  } catch (error) {
    console.error("Add Show Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// other routes using that we can get all the movies list on the web page and we will also create the api using that we can display the individual visual movie data 

// 5:57:51
// API TO GET ALL SHOWS FROM THE DB
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() }
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // FILTER UNIQUE SHOWS
    const uniqueShows = new Set(
      shows.map((show) => show.movie)
    );

    res.json({
      success: true,
      shows: Array.from(uniqueShows)
    });

  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
};

// API TO GET A SINGLE SHOW FROM THE DB
export const getShow = async (req, res) => {
  try {
    // Get movie ID from URL
    const { movieId } = req.params;

    // Get all upcoming shows for this movie
    const shows = await Show.find({
      movie: movieId,
      showDateTime: {
        $gte: new Date(),
      },
    }).sort({
      showDateTime: 1,
    });

    // Get movie information
    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    // Group shows by date
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime
        .toISOString()
        .split("T")[0];

      // Create date if it doesn't exist
      if (!dateTime[date]) {
        dateTime[date] = [];
      }

      // Add show time under that date
      dateTime[date].push({
        time: show.showDateTime,
        showId: show._id,
      });
    });

    res.json({
      success: true,
      movie,
      dateTime,
    });

  } catch (error) {
    console.error("Get Show Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};