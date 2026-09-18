import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import BlurCode from "../components/BlurCode";

import {
  ArrowRightIcon,
  ClockIcon,
} from "lucide-react";

import isoTimeFormat from "../lib/isoTimeFormat";
import toast from "react-hot-toast";

import { useAppContext } from "../context/AppContext";


const SeatLayout = () => {

  // ======================================================
  // SEAT ROWS
  // ======================================================

  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];


  // ======================================================
  // ROUTER
  // ======================================================

  const { id, date } = useParams();

  const navigate = useNavigate();


  // ======================================================
  // CONTEXT
  // ======================================================

  const {
    axios,
    getToken,
    user,
  } = useAppContext();


  // ======================================================
  // STATE
  // ======================================================

  const [selectedSeats, setSelectedSeats] =
    useState([]);

  const [selectedTime, setSelectedTime] =
    useState(null);

  const [show, setShow] =
    useState(null);

  const [occupiedSeats, setOccupiedSeats] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [bookingLoading, setBookingLoading] =
    useState(false);


  // ======================================================
  // GET MOVIE + SHOW TIMES
  // ======================================================

  const getShow = async () => {

    try {

      setLoading(true);


      console.log(
        "SEAT LAYOUT MOVIE ID:",
        id
      );

      console.log(
        "SELECTED DATE:",
        date
      );


      // GET /api/show/:movieId

      const { data } =
        await axios.get(
          `/api/show/${id}`
        );


      console.log(
        "SEAT LAYOUT SHOW RESPONSE:",
        data
      );


      if (data.success) {

        setShow(data);

      } else {

        setShow(null);

        toast.error(
          data.message ||
          "Failed to load show"
        );
      }

    } catch (error) {

      console.error(
        "GET SHOW ERROR:",
        error.response?.status,
        error.response?.data ||
        error.message
      );


      setShow(null);


      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Failed to load show"
      );

    } finally {

      setLoading(false);

    }
  };


  // ======================================================
  // GET OCCUPIED SEATS
  // ======================================================

  const getOccupiedSeats = async () => {

    try {

      if (!selectedTime?.showId) {

        setOccupiedSeats([]);

        return;
      }


      console.log(
        "GETTING OCCUPIED SEATS:",
        selectedTime.showId
      );


      // GET /api/booking/seats/:showId

      const { data } =
        await axios.get(
          `/api/booking/seats/${selectedTime.showId}`
        );


      console.log(
        "OCCUPIED SEATS RESPONSE:",
        data
      );


      if (data.success) {

        setOccupiedSeats(
          data.occupiedSeats || []
        );

      } else {

        setOccupiedSeats([]);

        toast.error(
          data.message ||
          "Failed to get occupied seats"
        );
      }

    } catch (error) {

      console.error(
        "GET OCCUPIED SEATS ERROR:",
        error.response?.status,
        error.response?.data ||
        error.message
      );


      setOccupiedSeats([]);


      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Failed to get occupied seats"
      );
    }
  };


  // ======================================================
  // SELECT / UNSELECT SEAT
  // ======================================================

  const handleSeatClick = (seatId) => {

    // Must select show time first

    if (!selectedTime) {

      return toast.error(
        "Please select time first"
      );
    }


    // Prevent selecting occupied seat

    if (
      occupiedSeats.includes(
        seatId
      )
    ) {

      return toast.error(
        "This seat is already booked"
      );
    }


    // Maximum 5 seats

    if (
      !selectedSeats.includes(
        seatId
      ) &&
      selectedSeats.length >= 5
    ) {

      return toast.error(
        "You can only select up to 5 seats"
      );
    }


    // Toggle seat

    setSelectedSeats(
      (prev) => {

        if (
          prev.includes(
            seatId
          )
        ) {

          return prev.filter(
            (seat) =>
              seat !== seatId
          );
        }


        return [
          ...prev,
          seatId,
        ];
      }
    );
  };


  // ======================================================
  // RENDER SEATS
  // ======================================================

  const renderSeats = (
    row,
    count = 9
  ) => {

    return (

      <div
        key={row}
        className="flex gap-2 mt-2"
      >

        <div
          className="
            flex
            flex-wrap
            items-center
            justify-center
            gap-2
          "
        >

          {Array.from(
            { length: count },
            (_, i) => {

              const seatId =
                `${row}${i + 1}`;


              const isSelected =
                selectedSeats.includes(
                  seatId
                );


              const isOccupied =
                occupiedSeats.includes(
                  seatId
                );


              return (

                <button
                  type="button"

                  key={seatId}

                  disabled={
                    isOccupied
                  }

                  onClick={() =>
                    handleSeatClick(
                      seatId
                    )
                  }

                  className={`
                    h-8
                    w-8
                    rounded
                    border
                    border-primary/60
                    cursor-pointer
                    transition

                    ${
                      isSelected
                        ? "bg-primary text-white"
                        : ""
                    }

                    ${
                      isOccupied
                        ? "bg-gray-300 text-gray-500 border-gray-300 opacity-50 cursor-not-allowed"
                        : "hover:border-primary"
                    }
                  `}
                >

                  {seatId}

                </button>
              );
            }
          )}

        </div>

      </div>
    );
  };


  // ======================================================
  // CREATE BOOKING
  // ======================================================

 const bookTickets = async () => {
  try {

    // =================================================
    // 1. USER MUST BE LOGGED IN
    // =================================================

    if (!user) {
      return toast.error(
        "Please login to book tickets"
      );
    }


    // =================================================
    // 2. SHOW TIME MUST BE SELECTED
    // =================================================

    if (!selectedTime?.showId) {
      return toast.error(
        "Please select a show time"
      );
    }


    // =================================================
    // 3. SEATS MUST BE SELECTED
    // =================================================

    if (selectedSeats.length === 0) {
      return toast.error(
        "Please select at least one seat"
      );
    }


    // =================================================
    // 4. START PROCESSING
    // =================================================

    setBookingLoading(true);


    // =================================================
    // 5. GET CLERK TOKEN
    // =================================================

    const token =
      await getToken();


    if (!token) {
      return toast.error(
        "Authentication failed"
      );
    }


    // =================================================
    // 6. CREATE REQUEST BODY
    // =================================================

    const bookingData = {
      showId:
        selectedTime.showId,

      selectedSeats,
    };


    console.log(
      "CREATE BOOKING REQUEST:",
      bookingData
    );


    // =================================================
    // 7. CREATE BOOKING
    //
    // Backend:
    // createBooking()
    //   ↓
    // check seats
    //   ↓
    // create Booking
    //   ↓
    // reserve seats
    //   ↓
    // create Stripe session
    // =================================================

    const { data } =
      await axios.post(
        "/api/booking/create",

        bookingData,

        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );


    console.log(
      "CREATE BOOKING RESPONSE:",
      data
    );


    // =================================================
    // 8. BACKEND REJECTED BOOKING
    // =================================================

    if (!data.success) {

      toast.error(
        data.message ||
        "Booking failed"
      );


      // Seats may have changed
      // while user was selecting.

      await getOccupiedSeats();

      return;
    }


    // =================================================
    // 9. CHECK STRIPE URL
    // =================================================

    if (!data.url) {

      console.error(
        "STRIPE URL MISSING:",
        data
      );


      toast.error(
        "Payment URL not found"
      );

      return;
    }


    // =================================================
    // 10. BOOKING CREATED
    // =================================================

    toast.success(
      "Booking created. Redirecting to payment..."
    );


    console.log(
      "STRIPE CHECKOUT URL:",
      data.url
    );


    // =================================================
    // 11. REDIRECT TO STRIPE
    // =================================================
    //
    // IMPORTANT:
    //
    // Do NOT:
    //
    // navigate("/checkout")
    //
    // Do NOT:
    //
    // navigate("/mybookings")
    //
    // Stripe Checkout is your checkout page.
    // =================================================

    window.location.href =
      data.url;


  } catch (error) {

    console.error(
      "CREATE BOOKING ERROR:",
      error.response?.status,
      error.response?.data ||
      error.message
    );


    toast.error(
      error.response?.data?.message ||
      error.message ||
      "Booking failed"
    );


    // Refresh seats because
    // availability may have changed.

    await getOccupiedSeats();

  } finally {

    setBookingLoading(false);

  }
};


  // ======================================================
  // LOAD SHOW
  // ======================================================

  useEffect(() => {

    if (!id) {

      setLoading(false);

      toast.error(
        "Movie ID not found"
      );

      return;
    }


    getShow();

  }, [id]);


  // ======================================================
  // TIME CHANGED
  // ======================================================

  useEffect(() => {

    if (selectedTime) {

      // Clear previously selected seats

      setSelectedSeats([]);


      // Load occupied seats
      // for this specific show

      getOccupiedSeats();

    } else {

      setOccupiedSeats([]);

    }

  }, [selectedTime]);


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (
      <Loading />
    );
  }


  // ======================================================
  // SHOW NOT FOUND
  // ======================================================

  if (!show) {

    return (

      <div
        className="
          min-h-screen
          flex
          flex-col
          items-center
          justify-center
          gap-5
        "
      >

        <p
          className="
            text-xl
            font-semibold
          "
        >
          Show could not be loaded
        </p>


        <button
          type="button"

          onClick={() =>
            navigate(
              "/movies"
            )
          }

          className="
            bg-primary
            px-6
            py-3
            rounded-md
            cursor-pointer
          "
        >
          Back to Movies
        </button>

      </div>
    );
  }


  // ======================================================
  // AVAILABLE TIMES FOR URL DATE
  // ======================================================

  const availableTimes =
    show?.dateTime?.[date] ||
    [];


  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        flex
        flex-col
        md:flex-row
        px-6
        md:px-16
        lg:px-40
        py-30
        md:pt-50
      "
    >

      {/* =================================================
          AVAILABLE TIMINGS
      ================================================= */}

      <div
        className="
          w-60
          bg-primary/10
          border
          border-primary/20
          rounded-lg
          py-10
          h-max
          md:sticky
          md:top-30
        "
      >

        <p
          className="
            text-lg
            font-semibold
            px-6
          "
        >
          Available Timings
        </p>


        <div
          className="
            mt-5
            space-y-1
          "
        >

          {availableTimes.length > 0 ? (

            availableTimes.map(
              (item) => (

                <div
                  key={
                    item.showId ||
                    item.time
                  }

                  onClick={() =>
                    setSelectedTime(
                      item
                    )
                  }

                  className={`
                    flex
                    items-center
                    gap-2
                    px-6
                    py-2
                    w-max
                    rounded-r-md
                    cursor-pointer
                    transition

                    ${
                      selectedTime?.showId ===
                      item.showId
                        ? "bg-primary text-white"
                        : "hover:bg-primary/20"
                    }
                  `}
                >

                  <ClockIcon
                    className="
                      w-4
                      h-4
                    "
                  />


                  <p
                    className="
                      text-sm
                    "
                  >
                    {
                      isoTimeFormat(
                        item.time
                      )
                    }
                  </p>

                </div>
              )
            )

          ) : (

            <p
              className="
                px-6
                text-sm
                text-gray-400
              "
            >
              No show times available
            </p>
          )}

        </div>

      </div>


      {/* =================================================
          SEAT LAYOUT
      ================================================= */}

      <div
        className="
          relative
          flex-1
          flex
          flex-col
          items-center
          max-md:mt-16
        "
      >

        <BlurCode
          top="-100px"
          left="-100px"
        />

        <BlurCode
          bottom="0"
          right="0"
        />


        {/* =================================================
            TITLE
        ================================================= */}

        <h1
          className="
            text-2xl
            font-semibold
            mb-4
          "
        >
          Select your seat
        </h1>


        {/* =================================================
            SCREEN
        ================================================= */}

        <img
          src={
            assets.screenImage
          }

          alt="screen"
        />


        <p
          className="
            text-gray-400
            text-sm
            mb-6
          "
        >
          SCREEN SIDE
        </p>


        {/* =================================================
            SEATS
        ================================================= */}

        <div
          className="
            flex
            flex-col
            items-center
            mt-10
            text-xs
            text-gray-300
          "
        >

          {/* A + B */}

          <div
            className="
              grid
              grid-cols-2
              md:grid-cols-1
              gap-8
              md:gap-2
              mb-6
            "
          >

            {groupRows[0].map(
              (row) =>
                renderSeats(
                  row
                )
            )}

          </div>


          {/* C - J */}

          <div
            className="
              grid
              grid-cols-2
              gap-11
            "
          >

            {groupRows
              .slice(1)
              .map(
                (
                  group,
                  idx
                ) => (

                  <div
                    key={idx}
                  >

                    {group.map(
                      (row) =>
                        renderSeats(
                          row
                        )
                    )}

                  </div>
                )
              )}

          </div>

        </div>


        {/* =================================================
            SELECTED INFORMATION
        ================================================= */}

        {selectedTime && (

          <div
            className="
              mt-10
              text-center
              text-sm
              text-gray-400
            "
          >

            <p>

              Selected Time:{" "}

              <span
                className="
                  text-white
                "
              >
                {
                  isoTimeFormat(
                    selectedTime.time
                  )
                }
              </span>

            </p>


            <p
              className="
                mt-1
              "
            >

              Selected Seats:{" "}

              <span
                className="
                  text-white
                "
              >

                {
                  selectedSeats.length > 0

                    ? selectedSeats.join(
                        ", "
                      )

                    : "None"
                }

              </span>

            </p>

          </div>
        )}


        {/* =================================================
            PROCEED TO CHECKOUT
        ================================================= */}

        <button
          type="button"

          disabled={
            bookingLoading
          }

          onClick={
            bookTickets
          }

          className={`
            flex
            items-center
            gap-1
            mt-20
            px-10
            py-3
            text-sm
            bg-primary
            hover:bg-primary-dull
            transition
            rounded-full
            font-medium
            active:scale-95

            ${
              bookingLoading
                ? "opacity-60 cursor-not-allowed"
                : "cursor-pointer"
            }
          `}
        >

          {
            bookingLoading
              ? "Processing..."
              : "Proceed to Checkout"
          }


          {!bookingLoading && (

            <ArrowRightIcon
              strokeWidth={3}

              className="
                w-4
                h-4
              "
            />

          )}

        </button>

      </div>

    </div>
  );
};


export default SeatLayout;