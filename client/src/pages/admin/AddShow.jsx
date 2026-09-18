import { useEffect, useState } from "react";
import {
  CheckIcon,
  DeleteIcon,
  StarIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { kConverter } from "../../lib/kconvert";
import { useAppContext } from "../../context/AppContext";


function AddShow() {

  // ======================================================
  // CONTEXT
  // ======================================================

  const {
    axios,
    getToken,
    user,
    image_base_url,
  } = useAppContext();


  // ======================================================
  // ENV
  // ======================================================

  const currency =
    import.meta.env.VITE_CURRENCY;


  // ======================================================
  // STATE
  // ======================================================

  const [
    nowPlayingMovies,
    setNowPlayingMovies,
  ] = useState([]);


  const [
    moviesLoading,
    setMoviesLoading,
  ] = useState(true);


  const [
    moviesError,
    setMoviesError,
  ] = useState("");


  const [
    selectedMovie,
    setSelectedMovie,
  ] = useState(null);


  const [
    dateTimeSelection,
    setDateTimeSelection,
  ] = useState({});


  const [
    dateTimeInput,
    setDateTimeInput,
  ] = useState("");


  const [
    showPrice,
    setShowPrice,
  ] = useState("");


  const [
    addingShow,
    setAddingShow,
  ] = useState(false);


  // ======================================================
  // GET MOVIE ID
  // ======================================================

  const getMovieId = (movie) => {

    return movie._id || movie.id;

  };


  // ======================================================
  // FETCH NOW PLAYING MOVIES
  // ======================================================

  const fetchNowPlayingMovies =
    async () => {

      try {

        // ================================================
        // START LOADING
        // ================================================

        setMoviesLoading(true);

        setMoviesError("");


        // ================================================
        // GET CLERK TOKEN
        // ================================================

        const token =
          await getToken();


        if (!token) {

          setMoviesError(
            "Authentication token not found"
          );

          return;

        }


        // ================================================
        // REQUEST MOVIES
        // ================================================

        const { data } =
          await axios.get(
            "/api/show/now-playing",
            {
              headers: {

                Authorization:
                  `Bearer ${token}`,

              },
            }
          );


        console.log(
          "NOW PLAYING RESPONSE:",
          data
        );


        // ================================================
        // SUCCESS
        // ================================================

        if (data.success) {

          setNowPlayingMovies(
            Array.isArray(data.movies)
              ? data.movies
              : []
          );

        } else {

          setMoviesError(
            data.message ||
            "Failed to fetch movies"
          );

        }

      } catch (error) {

        console.error(
          "NOW PLAYING ERROR:",
          error.response?.status,
          error.response?.data ||
          error.message
        );


        setMoviesError(
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch movies"
        );

      } finally {

        setMoviesLoading(false);

      }

    };


  // ======================================================
  // ADD DATE AND TIME
  // ======================================================

  const handleDateTimeAdd = () => {

    // ================================================
    // VALIDATE INPUT
    // ================================================

    if (!dateTimeInput) {

      toast.error(
        "Please select a date and time"
      );

      return;

    }


    // datetime-local:
    //
    // 2026-09-20T18:00

    const [date, time] =
      dateTimeInput.split("T");


    if (!date || !time) {

      toast.error(
        "Invalid date and time"
      );

      return;

    }


    // ================================================
    // UPDATE DATE/TIME STATE
    // ================================================

    setDateTimeSelection(
      (previousSelection) => {

        const existingTimes =
          previousSelection[date] || [];


        // ============================================
        // PREVENT DUPLICATES
        // ============================================

        if (
          existingTimes.includes(time)
        ) {

          toast.error(
            "This time is already selected"
          );

          return previousSelection;

        }


        // ============================================
        // ADD TIME
        // ============================================

        return {

          ...previousSelection,

          [date]: [
            ...existingTimes,
            time,
          ],

        };

      }
    );


    // ================================================
    // RESET INPUT
    // ================================================

    setDateTimeInput("");

  };


  // ======================================================
  // REMOVE DATE/TIME
  // ======================================================

  const handleRemoveTime = (
    date,
    time
  ) => {

    setDateTimeSelection(
      (previousSelection) => {

        // ============================================
        // SAFETY CHECK
        // ============================================

        const existingTimes =
          previousSelection[date] || [];


        // ============================================
        // REMOVE TIME
        // ============================================

        const filteredTimes =
          existingTimes.filter(
            (selectedTime) =>
              selectedTime !== time
          );


        // ============================================
        // REMOVE DATE IF NO TIMES REMAIN
        // ============================================

        if (
          filteredTimes.length === 0
        ) {

          const newSelection = {
            ...previousSelection,
          };


          delete newSelection[date];


          return newSelection;

        }


        // ============================================
        // UPDATE DATE
        // ============================================

        return {

          ...previousSelection,

          [date]:
            filteredTimes,

        };

      }
    );

  };


  // ======================================================
  // SUBMIT SHOW
  // ======================================================

  const handleSubmit =
    async () => {

      // ================================================
      // VALIDATE MOVIE
      // ================================================

      if (!selectedMovie) {

        toast.error(
          "Please select a movie"
        );

        return;

      }


      // ================================================
      // VALIDATE DATE/TIME
      // ================================================

      if (
        Object.keys(
          dateTimeSelection
        ).length === 0
      ) {

        toast.error(
          "Please select at least one date and time"
        );

        return;

      }


      // ================================================
      // VALIDATE PRICE
      // ================================================

      const numericPrice =
        Number(showPrice);


      if (
        !showPrice ||
        Number.isNaN(numericPrice) ||
        numericPrice <= 0
      ) {

        toast.error(
          "Please enter a valid show price"
        );

        return;

      }


      try {

        // ================================================
        // START SUBMISSION
        // ================================================

        setAddingShow(true);


        // ================================================
        // GET CLERK TOKEN
        // ================================================

        const token =
          await getToken();


        if (!token) {

          toast.error(
            "Authentication token not found"
          );

          return;

        }


        // ================================================
        // BUILD SHOW INPUT
        // ================================================
        //
        // dateTimeSelection:
        //
        // {
        //   "2026-09-20": [
        //     "18:00",
        //     "21:00"
        //   ],
        //
        //   "2026-09-21": [
        //     "17:00"
        //   ]
        // }
        //
        //
        // becomes:
        //
        // [
        //   {
        //     date: "2026-09-20",
        //     time: [
        //       "18:00",
        //       "21:00"
        //     ]
        //   },
        //
        //   {
        //     date: "2026-09-21",
        //     time: [
        //       "17:00"
        //     ]
        //   }
        // ]
        // ================================================

        const showInput =
          Object.entries(
            dateTimeSelection
          ).map(
            ([date, times]) => ({

              date,

              time:
                times,

            })
          );


        // ================================================
        // PAYLOAD
        // ================================================

        const payload = {

          movieId:
            selectedMovie,

          showInput,

          showPrice:
            numericPrice,

        };


        console.log(
          "ADD SHOW PAYLOAD:",
          payload
        );


        // ================================================
        // SEND REQUEST
        // ================================================

        const { data } =
          await axios.post(
            "/api/show/add",
            payload,
            {
              headers: {

                Authorization:
                  `Bearer ${token}`,

              },
            }
          );


        console.log(
          "ADD SHOW RESPONSE:",
          data
        );


        // ================================================
        // SUCCESS
        // ================================================

        if (data.success) {

          toast.success(
            data.message ||
            "Show added successfully"
          );


          // ============================================
          // RESET FORM
          // ============================================

          setSelectedMovie(null);

          setDateTimeSelection({});

          setDateTimeInput("");

          setShowPrice("");

        } else {

          toast.error(
            data.message ||
            "Failed to add show"
          );

        }

      } catch (error) {

        console.error(
          "ADD SHOW ERROR:",
          error.response?.status,
          error.response?.data ||
          error.message
        );


        toast.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to add show"
        );

      } finally {

        // ================================================
        // STOP SUBMISSION
        // ================================================

        setAddingShow(false);

      }

    };


  // ======================================================
  // FETCH MOVIES WHEN USER IS READY
  // ======================================================

  useEffect(() => {

    if (!user?.id) {
      return;
    }


    fetchNowPlayingMovies();

  }, [user?.id]);


  // ======================================================
  // LOADING
  // ======================================================

  if (moviesLoading) {

    return <Loading />;

  }


  // ======================================================
  // ERROR
  // ======================================================

  if (moviesError) {

    return (

      <div>

        <Title
          text1="Add"
          text2="Shows"
        />


        <div
          className="
            mt-10
            border
            border-red-500/30
            bg-red-500/10
            rounded-lg
            p-5
          "
        >

          <p className="text-red-500">

            {moviesError}

          </p>


          <button
            type="button"

            onClick={
              fetchNowPlayingMovies
            }

            className="
              mt-4
              bg-primary
              text-white
              px-5
              py-2
              rounded
              cursor-pointer
            "
          >

            Try Again

          </button>

        </div>

      </div>

    );

  }


  // ======================================================
  // NO MOVIES
  // ======================================================

  if (
    nowPlayingMovies.length === 0
  ) {

    return (

      <div>

        <Title
          text1="Add"
          text2="Shows"
        />


        <div className="mt-10">

          <p className="text-gray-400">

            No now-playing movies found.

          </p>


          <button
            type="button"

            onClick={
              fetchNowPlayingMovies
            }

            className="
              mt-4
              bg-primary
              text-white
              px-5
              py-2
              rounded
              cursor-pointer
            "
          >

            Refresh Movies

          </button>

        </div>

      </div>

    );

  }


  // ======================================================
  // UI
  // ======================================================

  return (

    <>

      {/* ==================================================
          TITLE
      ================================================== */}

      <Title
        text1="Add"
        text2="Shows"
      />


      {/* ==================================================
          NOW PLAYING
      ================================================== */}

      <p
        className="
          mt-10
          text-lg
          font-medium
        "
      >

        Now Playing Movies

      </p>


      {/* ==================================================
          MOVIE LIST
      ================================================== */}

      <div
        className="
          overflow-x-auto
          pb-4
        "
      >

        <div
          className="
            group
            flex
            flex-wrap
            gap-4
            mt-4
            w-max
          "
        >

          {nowPlayingMovies.map(
            (movie) => {

              // ============================================
              // MongoDB -> _id
              // TMDB    -> id
              // ============================================

              const movieId =
                getMovieId(movie);


              return (

                <div
                  key={movieId}

                  onClick={() =>
                    setSelectedMovie(
                      movieId
                    )
                  }

                  className="
                    relative
                    max-w-40
                    cursor-pointer
                    group-hover:not-hover:opacity-40
                    hover:-translate-y-1
                    transition
                    duration-300
                  "
                >

                  {/* ========================================
                      POSTER
                  ======================================== */}

                  <div
                    className="
                      relative
                      rounded-lg
                      overflow-hidden
                    "
                  >

                    <img
                      src={
                        image_base_url +
                        movie.poster_path
                      }

                      alt={
                        movie.title
                      }

                      className="
                        w-full
                        object-cover
                        brightness-90
                      "
                    />


                    {/* ======================================
                        MOVIE INFORMATION
                    ====================================== */}

                    <div
                      className="
                        text-sm
                        flex
                        items-center
                        justify-between
                        p-2
                        bg-black/70
                        w-full
                        absolute
                        bottom-0
                        left-0
                      "
                    >

                      {/* ====================================
                          RATING
                      ==================================== */}

                      <p
                        className="
                          flex
                          items-center
                          gap-1
                          text-gray-400
                        "
                      >

                        <StarIcon
                          className="
                            w-4
                            h-4
                            text-primary
                            fill-primary
                          "
                        />


                        {typeof movie.vote_average ===
                        "number"
                          ? movie.vote_average.toFixed(1)
                          : "N/A"}

                      </p>


                      {/* ====================================
                          VOTES
                      ==================================== */}

                      <p className="text-gray-300">

                        {kConverter(
                          movie.vote_count || 0
                        )}{" "}
                        Votes

                      </p>

                    </div>

                  </div>


                  {/* ========================================
                      SELECTED CHECK
                  ======================================== */}

                  {selectedMovie ===
                    movieId && (

                    <div
                      className="
                        absolute
                        top-2
                        right-2
                        flex
                        items-center
                        justify-center
                        bg-primary
                        h-6
                        w-6
                        rounded
                      "
                    >

                      <CheckIcon
                        className="
                          w-4
                          h-4
                          text-white
                        "

                        strokeWidth={
                          2.5
                        }
                      />

                    </div>

                  )}


                  {/* ========================================
                      MOVIE TITLE
                  ======================================== */}

                  <p
                    className="
                      font-medium
                      truncate
                      mt-2
                    "
                  >

                    {movie.title}

                  </p>


                  {/* ========================================
                      RELEASE DATE
                  ======================================== */}

                  <p
                    className="
                      text-gray-400
                      text-sm
                    "
                  >

                    {movie.release_date}

                  </p>

                </div>

              );

            }
          )}

        </div>

      </div>


      {/* ==================================================
          SHOW PRICE
      ================================================== */}

      <div className="mt-8">

        <label
          className="
            block
            text-sm
            font-medium
            mb-2
          "
        >

          Show Price

        </label>


        <div
          className="
            inline-flex
            items-center
            gap-2
            border
            border-gray-600
            px-3
            py-2
            rounded-md
          "
        >

          <p
            className="
              text-gray-400
              text-sm
            "
          >

            {currency}

          </p>


          <input
            type="number"

            min="1"

            value={
              showPrice
            }

            placeholder="Enter show price"

            className="
              outline-none
              bg-transparent
            "

            onChange={(event) =>
              setShowPrice(
                event.target.value
              )
            }
          />

        </div>


        {/* ==================================================
            DATE AND TIME
        ================================================== */}

        <div className="mt-6">

          <label
            className="
              block
              text-sm
              font-medium
              mb-2
            "
          >

            Select Date and Time

          </label>


          <div
            className="
              inline-flex
              gap-5
              border
              border-gray-600
              p-1
              pl-3
              rounded-lg
            "
          >

            <input
              type="datetime-local"

              value={
                dateTimeInput
              }

              onChange={(event) =>
                setDateTimeInput(
                  event.target.value
                )
              }

              className="
                outline-none
                rounded-md
                bg-transparent
              "
            />


            <button
              type="button"

              onClick={
                handleDateTimeAdd
              }

              className="
                bg-primary/80
                text-white
                px-3
                py-2
                text-sm
                rounded-lg
                hover:bg-primary
                cursor-pointer
              "
            >

              Add Time

            </button>

          </div>

        </div>


        {/* ==================================================
            SELECTED DATE/TIME
        ================================================== */}

        {Object.keys(
          dateTimeSelection
        ).length > 0 && (

          <div className="mt-6">

            <h2
              className="
                mb-2
                font-medium
              "
            >

              Selected Date-time

            </h2>


            <ul className="space-y-3">

              {Object.entries(
                dateTimeSelection
              ).map(
                ([date, times]) => (

                  <li key={date}>

                    {/* DATE */}

                    <div className="font-medium">

                      {date}

                    </div>


                    {/* TIMES */}

                    <div
                      className="
                        flex
                        flex-wrap
                        gap-2
                        mt-1
                        text-sm
                      "
                    >

                      {times.map(
                        (time) => (

                          <div
                            key={time}

                            className="
                              border
                              border-primary
                              px-2
                              py-1
                              flex
                              items-center
                              rounded
                            "
                          >

                            <span>

                              {time}

                            </span>


                            <DeleteIcon
                              width={15}

                              onClick={() =>
                                handleRemoveTime(
                                  date,
                                  time
                                )
                              }

                              className="
                                ml-2
                                text-red-500
                                hover:text-red-700
                                cursor-pointer
                              "
                            />

                          </div>

                        )
                      )}

                    </div>

                  </li>

                )
              )}

            </ul>

          </div>

        )}


        {/* ==================================================
            ADD SHOW BUTTON
        ================================================== */}

        <button
          type="button"

          onClick={
            handleSubmit
          }

          disabled={
            addingShow
          }

          className="
            bg-primary
            text-white
            px-8
            py-2
            mt-6
            rounded
            hover:bg-primary/90
            transition-all
            cursor-pointer
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >

          {addingShow
            ? "Adding..."
            : "Add Show"}

        </button>

      </div>

    </>

  );

}


export default AddShow;