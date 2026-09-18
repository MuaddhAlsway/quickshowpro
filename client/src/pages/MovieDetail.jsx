import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Heart,
  PlayCircleIcon,
  StarIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import BlurCode from "../components/BlurCode";
import DateSelect from "../components/DateSelect";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";

import { useAppContext } from "../context/AppContext";


// ======================================================
// TIME FORMAT
// ======================================================

const timeFormat = (minutes) => {
  if (!minutes) return "";

  const hours = Math.floor(minutes / 60);
  const minutesRemainder = minutes % 60;

  return `${hours}h ${minutesRemainder}m`;
};


// ======================================================
// MOVIE DETAIL
// ======================================================

function MovieDetail() {
  // ====================================================
  // ROUTER
  // ====================================================

  const navigate = useNavigate();
  const { id } = useParams();


  // ====================================================
  // CONTEXT
  // ====================================================

  const {
    shows,
    axios,
    getToken,
    user,
    fectchFavoriteMovies,
    favoriteMovies,
    image_base_url,
  } = useAppContext();


  // ====================================================
  // STATE
  // ====================================================

  const [show, setShow] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    favoriteLoading,
    setFavoriteLoading,
  ] = useState(false);


  // ====================================================
  // GET SHOW
  // ====================================================

  const getShow = async () => {
    try {
      setLoading(true);
      setError("");


      console.log(
        "MOVIE ID:",
        id
      );


      // =================================================
      // REQUEST MOVIE
      // =================================================

      const { data } =
        await axios.get(
          `/api/show/${id}`
        );


      console.log(
        "GET SHOW RESPONSE:",
        data
      );


      // =================================================
      // REQUEST FAILED
      // =================================================

      if (!data.success) {
        setShow(null);

        setError(
          data.message ||
            "Failed to load movie"
        );

        return;
      }


      // =================================================
      // RESPONSE:
      //
      // {
      //   success: true,
      //   shows: [...]
      // }
      // =================================================

      if (
        Array.isArray(
          data.shows
        )
      ) {
        const movie =
          data.shows.find(
            (item) =>
              String(
                item._id
              ) ===
                String(id) ||
              String(
                item.id
              ) ===
                String(id)
          );


        if (!movie) {
          console.error(
            "MOVIE NOT FOUND:",
            id
          );

          setShow(null);

          setError(
            "Movie not found"
          );

          return;
        }


        setShow({
          movie,

          dateTime:
            movie.dateTime ||
            data.dateTime ||
            {},
        });


        return;
      }


      // =================================================
      // RESPONSE:
      //
      // {
      //   success: true,
      //   movie: {...},
      //   dateTime: {...}
      // }
      // =================================================

      if (data.movie) {
        setShow({
          movie:
            data.movie,

          dateTime:
            data.dateTime ||
            {},
        });

        return;
      }


      // =================================================
      // RESPONSE:
      //
      // {
      //   success: true,
      //   show: {
      //      movie: {...},
      //      dateTime: {...}
      //   }
      // }
      // =================================================

      if (
        data.show?.movie
      ) {
        setShow({
          movie:
            data.show.movie,

          dateTime:
            data.show
              .dateTime ||
            data.dateTime ||
            {},
        });

        return;
      }


      // =================================================
      // UNKNOWN RESPONSE
      // =================================================

      console.error(
        "UNKNOWN SHOW RESPONSE:",
        data
      );


      setShow(null);

      setError(
        "Movie data was not returned by the server"
      );

    } catch (error) {
      console.error(
        "GET SHOW ERROR:",
        error.response?.status,
        error.response?.data ||
          error.message
      );


      setShow(null);


      setError(
        error.response?.data
          ?.message ||
          error.message ||
          "Failed to load movie"
      );

    } finally {
      setLoading(false);
    }
  };


  // ====================================================
  // FETCH MOVIE
  // ====================================================

  useEffect(() => {
    if (!id) {
      setLoading(false);

      setError(
        "Movie ID not found"
      );

      return;
    }


    getShow();

  }, [id]);


  // ====================================================
  // CURRENT MOVIE
  // ====================================================

  const movie =
    show?.movie;


  // ====================================================
  // MOVIE ID
  // ====================================================

  const movieId =
    movie?._id ||
    movie?.id ||
    id;


  // ====================================================
  // CHECK FAVORITE
  // ====================================================

  const isFavorite =
    Array.isArray(
      favoriteMovies
    ) &&
    favoriteMovies.some(
      (favorite) => {
        const favoriteId =
          favorite?._id ||
          favorite?.id;


        return (
          String(
            favoriteId
          ) ===
          String(
            movieId
          )
        );
      }
    );


  // ====================================================
  // HANDLE FAVORITE
  // ====================================================

  const handleFavorite =
    async () => {

      // =================================================
      // LOGIN REQUIRED
      // =================================================

      if (!user) {
        toast.error(
          "Please login to add favorites"
        );

        return;
      }


      // =================================================
      // MOVIE ID REQUIRED
      // =================================================

      if (!movieId) {
        toast.error(
          "Movie ID not found"
        );

        return;
      }


      // =================================================
      // PREVENT DOUBLE REQUEST
      // =================================================

      if (
        favoriteLoading
      ) {
        return;
      }


      try {
        setFavoriteLoading(
          true
        );


        // ===============================================
        // CLERK TOKEN
        // ===============================================

        const token =
          await getToken();


        if (!token) {
          toast.error(
            "Authentication token not found"
          );

          return;
        }


        // ===============================================
        // UPDATE FAVORITES
        // ===============================================

        const { data } =
          await axios.post(
            "/api/user/update-favorites",

            {
              movieId,
            },

            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        console.log(
          "FAVORITE RESPONSE:",
          data
        );


        // ===============================================
        // SUCCESS
        // ===============================================

        if (
          data.success
        ) {
          if (
            typeof fectchFavoriteMovies ===
            "function"
          ) {
            await fectchFavoriteMovies();
          }


          toast.success(
            data.message ||
              (
                isFavorite
                  ? "Removed from favorites"
                  : "Added to favorites"
              )
          );

          return;
        }


        toast.error(
          data.message ||
            "Failed to update favorite"
        );

      } catch (error) {
        console.error(
          "FAVORITE ERROR:",
          error.response?.status,
          error.response?.data ||
            error.message
        );


        toast.error(
          error.response?.data
            ?.message ||
            error.message ||
            "Failed to update favorite"
        );

      } finally {
        setFavoriteLoading(
          false
        );
      }
    };


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div
        className="
          px-6
          md:px-16
          lg:px-40
          pt-30
          md:pt-50
          text-center
        "
      >
        <Loading />
      </div>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (error) {
    return (
      <div
        className="
          min-h-screen
          flex
          flex-col
          items-center
          justify-center
          px-6
          text-center
        "
      >

        <h1
          className="
            text-3xl
            font-bold
          "
        >
          Movie could not be loaded
        </h1>


        <p
          className="
            text-gray-400
            mt-4
            max-w-xl
          "
        >
          {error}
        </p>


        <button
          type="button"

          onClick={() =>
            navigate(
              "/movies"
            )
          }

          className="
            mt-8
            px-8
            py-3
            bg-primary
            hover:bg-primary-dull
            rounded-md
            transition
          "
        >
          Back to Movies
        </button>

      </div>
    );
  }


  // ====================================================
  // MOVIE NOT FOUND
  // ====================================================

  if (!movie) {
    return (
      <div
        className="
          min-h-screen
          flex
          flex-col
          items-center
          justify-center
          text-center
        "
      >

        <h1
          className="
            text-3xl
            font-bold
          "
        >
          Movie Not Found
        </h1>


        <button
          type="button"

          onClick={() =>
            navigate(
              "/movies"
            )
          }

          className="
            mt-6
            px-8
            py-3
            bg-primary
            rounded-md
          "
        >
          Back to Movies
        </button>

      </div>
    );
  }


  // ====================================================
  // IMAGE HELPER
  // ====================================================

  const getImageUrl = (
    path
  ) => {

    if (!path) {
      return "";
    }


    if (
      path.startsWith(
        "http"
      )
    ) {
      return path;
    }


    return `${image_base_url}${path}`;
  };


  // ====================================================
  // POSTER
  // ====================================================

  const posterUrl =
    getImageUrl(
      movie.poster_path
    );


  // ====================================================
  // UI
  // ====================================================

  return (
    <div
      className="
        px-6
        md:px-16
        lg:px-40
        pt-30
        md:pt-50
        pb-20
      "
    >


      {/* =================================================
          MOVIE DETAILS
      ================================================= */}

      <div
        className="
          flex
          flex-col
          md:flex-row
          gap-8
          lg:gap-12
        "
      >


        {/* POSTER */}

        <img
          src={
            posterUrl
          }

          alt={
            movie.title
          }

          className="
            max-md:mx-auto
            rounded-xl
            h-[420px]
            w-[280px]
            object-cover
          "
        />


        {/* =================================================
            MOVIE INFORMATION
        ================================================= */}

        <div
          className="
            relative
            flex
            flex-col
            gap-4
          "
        >

          <BlurCode
            top="-100px"
            left="-100px"
          />


          {/* LANGUAGE */}

          <p
            className="
              text-primary
              font-medium
            "
          >
            {
              movie
                .original_language
                ?.toUpperCase() ||
              "ENGLISH"
            }
          </p>


          {/* TITLE */}

          <h1
            className="
              text-4xl
              md:text-5xl
              font-bold
            "
          >
            {movie.title}
          </h1>


          {/* RATING */}

          <div
            className="
              flex
              items-center
              gap-2
              text-gray-300
            "
          >

            <StarIcon
              className="
                w-5
                h-5
                text-primary
                fill-primary
              "
            />


            <span>
              {
                Number(
                  movie
                    .vote_average ||
                  0
                ).toFixed(1)
              }{" "}
              User Rating
            </span>

          </div>


          {/* OVERVIEW */}

          <p
            className="
              text-gray-400
              leading-relaxed
              max-w-2xl
            "
          >
            {
              movie.overview ||
              "No description available."
            }
          </p>


          {/* =================================================
              META
          ================================================= */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
              text-sm
              text-gray-300
            "
          >

            {/* RUNTIME */}

            {movie.runtime && (
              <>
                <span>
                  {
                    timeFormat(
                      movie.runtime
                    )
                  }
                </span>

                <span>
                  •
                </span>
              </>
            )}


            {/* GENRES */}

            {movie.genres?.length >
              0 && (
              <>
                <span>
                  {
                    movie.genres
                      .map(
                        (
                          genre
                        ) =>
                          genre.name
                      )
                      .join(
                        ", "
                      )
                  }
                </span>

                <span>
                  •
                </span>
              </>
            )}


            {/* RELEASE YEAR */}

            <span>
              {
                movie
                  .release_date
                  ?.split(
                    "-"
                  )[0] ||
                "N/A"
              }
            </span>

          </div>


          {/* =================================================
              ACTION BUTTONS
          ================================================= */}

          <div
            className="
              flex
              items-center
              flex-wrap
              gap-4
              mt-4
            "
          >

            {/* TRAILER */}

            <button
              type="button"

              className="
                flex
                items-center
                gap-2
                px-7
                py-3
                text-sm
                bg-gray-800
                hover:bg-gray-900
                transition
                rounded-md
                font-medium
                cursor-pointer
                active:scale-95
              "
            >

              <PlayCircleIcon
                className="
                  w-5
                  h-5
                "
              />

              Watch Trailer

            </button>


            {/* =================================================
                BUY TICKETS

                Scrolls to DateSelect below.
            ================================================= */}

            <a
              href="#dateSelect"

              className="
                px-10
                py-3
                text-sm
                bg-primary
                hover:bg-primary-dull
                transition
                rounded-md
                font-medium
                cursor-pointer
                active:scale-95
              "
            >
              Buy Tickets
            </a>


            {/* =================================================
                FAVORITE
            ================================================= */}

            <button
              type="button"

              onClick={
                handleFavorite
              }

              disabled={
                favoriteLoading
              }

              title={
                isFavorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }

              aria-label={
                isFavorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }

              className={`
                p-2.5
                rounded-full
                transition
                active:scale-95

                ${
                  isFavorite
                    ? "bg-primary"
                    : "bg-gray-700 hover:bg-gray-600"
                }

                ${
                  favoriteLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }
              `}
            >

              <Heart
                className={`
                  w-5
                  h-5
                  transition

                  ${
                    isFavorite
                      ? "fill-white text-white"
                      : "text-white"
                  }
                `}
              />

            </button>

          </div>

        </div>

      </div>


      {/* =================================================
          CAST
      ================================================= */}

      {movie.casts?.length >
        0 && (
        <>

          <p
            className="
              text-lg
              font-medium
              mt-20
            "
          >
            Your Favorite Cast
          </p>


          <div
            className="
              overflow-x-auto
              no-scrollbar
              mt-8
              pb-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-4
                w-max
                px-4
              "
            >

              {movie.casts
                .slice(
                  0,
                  12
                )
                .map(
                  (
                    cast,
                    index
                  ) => {

                    const profileUrl =
                      getImageUrl(
                        cast
                          .profile_path
                      );


                    return (
                      <div
                        key={
                          cast.id ||
                          index
                        }

                        className="
                          flex
                          flex-col
                          items-center
                        "
                      >

                        {
                          profileUrl &&
                          (
                            <img
                              src={
                                profileUrl
                              }

                              alt={
                                cast.name
                              }

                              className="
                                rounded-full
                                h-20
                                w-20
                                object-cover
                              "
                            />
                          )
                        }


                        <p
                          className="
                            font-medium
                            text-xs
                            mt-3
                            text-center
                          "
                        >
                          {
                            cast.name
                          }
                        </p>

                      </div>
                    );
                  }
                )}

            </div>

          </div>

        </>
      )}


      {/* =================================================
          DATE SELECT

          IMPORTANT:
          Always render DateSelect.

          This is where:
          - available dates
          - show times
          - Book Now
          
          should appear.
      ================================================= */}

      <div
        id="dateSelect"
        className="scroll-mt-28"
      >

        <DateSelect
          dateTime={
            show?.dateTime ||
            {}
          }

          id={
            movieId
          }
        />

      </div>


      {/* =================================================
          RELATED MOVIES
      ================================================= */}

      {Array.isArray(
        shows
      ) &&
        shows.length > 0 && (
          <>

            <p
              className="
                text-lg
                font-medium
                mt-20
                mb-8
              "
            >
              You May Also Like
            </p>


            <div
              className="
                flex
                flex-wrap
                max-sm:justify-center
                gap-8
              "
            >

              {shows
                .filter(
                  (
                    item
                  ) => {

                    const relatedMovie =
                      item.movie ||
                      item;


                    const relatedId =
                      relatedMovie
                        ?._id ||
                      relatedMovie
                        ?.id;


                    return (
                      String(
                        relatedId
                      ) !==
                      String(
                        movieId
                      )
                    );
                  }
                )

                .slice(
                  0,
                  4
                )

                .map(
                  (
                    item,
                    index
                  ) => {

                    const relatedMovie =
                      item.movie ||
                      item;


                    return (
                      <MovieCard
                        key={
                          relatedMovie
                            ?._id ||
                          relatedMovie
                            ?.id ||
                          index
                        }

                        movie={
                          relatedMovie
                        }
                      />
                    );
                  }
                )}

            </div>

          </>
        )}


      {/* =================================================
          SHOW MORE
      ================================================= */}

      <div
        className="
          flex
          justify-center
          mt-20
        "
      >

        <button
          type="button"

          onClick={() => {
            navigate(
              "/movies"
            );

            window.scrollTo(
              0,
              0
            );
          }}

          className="
            px-10
            py-3
            text-sm
            bg-primary
            hover:bg-primary-dull
            transition
            rounded-md
            font-medium
            cursor-pointer
          "
        >
          Show More
        </button>

      </div>

    </div>
  );
}


export default MovieDetail;