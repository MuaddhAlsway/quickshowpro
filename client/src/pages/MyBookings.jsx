
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import BlurCode from "../components/BlurCode";
import Loading from "../components/Loading";
import { dateFormat } from "../lib/dateTimeFormat";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

function MyBookings() {
  // ======================================================
  // ENV
  // ======================================================

  const currency = import.meta.env.VITE_CURRENCY;

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
  // STATE
  // ======================================================

  const [bookings, setBookings] = useState([]);
  const [isLoading, setLoading] = useState(true);

  // ======================================================
  // GET USER BOOKINGS
  // ======================================================

  const getMyBookings = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const token = await getToken();

        if (!token) {
          setBookings([]);
          return;
        }

        const { data } = await axios.get(
          "/api/user/bookings",
          {
            params: {
              _t: Date.now(),
            },
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          }
        );

        console.log("MY BOOKINGS RESPONSE:", data);

        if (data.success) {
          setBookings(data.bookings || []);
        } else {
          setBookings([]);

          toast.error(
            data.message || "Failed to load bookings"
          );
        }
      } catch (error) {
        console.error(
          "GET MY BOOKINGS ERROR:",
          error.response?.status,
          error.response?.data || error.message
        );

        if (showLoading) {
          setBookings([]);

          toast.error(
            error.response?.data?.message ||
              error.message ||
              "Failed to load bookings"
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [axios, getToken]
  );

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    if (user) {
      getMyBookings(true);
    } else {
      setBookings([]);
      setLoading(false);
    }
  }, [user, getMyBookings]);

  // ======================================================
  // REFRESH WHEN USER RETURNS FROM STRIPE
  // ======================================================

  useEffect(() => {
    if (!user) return;

    const refreshBookings = () => {
      if (document.visibilityState === "visible") {
        getMyBookings();
      }
    };

    window.addEventListener("focus", refreshBookings);

    document.addEventListener(
      "visibilitychange",
      refreshBookings
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshBookings
      );

      document.removeEventListener(
        "visibilitychange",
        refreshBookings
      );
    };
  }, [user, getMyBookings]);

  // ======================================================
  // DETECT PENDING PAYMENTS
  // ======================================================

  const hasPendingPayment = bookings.some(
    (booking) =>
      booking.isPaid !== true &&
      booking.paymentStatus !== "EXPIRED" &&
      booking.paymentStatus !== "CANCELLED" &&
      Boolean(booking.paymentLink)
  );

  // ======================================================
  // POLL PENDING BOOKINGS EVERY 5 SECONDS
  // ======================================================

  useEffect(() => {
    if (!user || !hasPendingPayment) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        getMyBookings();
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    user,
    hasPendingPayment,
    getMyBookings,
  ]);

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return <Loading />;
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div
      className="
        relative
        px-6
        md:px-16
        lg:px-40
        pt-30
        md:pt-40
        min-h-[80vh]
      "
    >
      {/* ================================================
          BACKGROUND BLUR
      ================================================ */}

      <BlurCode
        top="100px"
        left="100px"
      />

      <div>
        <BlurCode
          bottom="0px"
          left="600px"
        />
      </div>

      {/* ================================================
          TITLE
      ================================================ */}

      <h1
        className="
          text-lg
          font-semibold
          mb-4
        "
      >
        My Bookings
      </h1>

      {/* ================================================
          NO BOOKINGS
      ================================================ */}

      {bookings.length === 0 && (
        <p
          className="
            text-gray-400
            mt-6
          "
        >
          You don't have any bookings yet.
        </p>
      )}

      {/* ================================================
          BOOKINGS
      ================================================ */}

      {bookings.map((item) => {
        // ==============================================
        // MOVIE
        // ==============================================

        const movie = item?.show?.movie;

        // ==============================================
        // BOOKED SEATS
        // ==============================================

        const bookedSeats =
          item?.bookedSeats || [];

        // ==============================================
        // PAYMENT STATUS
        // ==============================================

        const isPaid =
          item?.isPaid === true;

        const paymentLink =
          item?.paymentLink || "";

        const paymentStatus =
          item?.paymentStatus || "";

        const isExpired =
          !isPaid &&
          paymentStatus === "EXPIRED";

        const isCancelled =
          !isPaid &&
          paymentStatus === "CANCELLED";

        return (
          <div
            key={item._id}
            className="
              flex
              flex-col
              md:flex-row
              justify-between
              bg-primary/8
              border
              border-primary/20
              rounded-lg
              mt-4
              p-2
              max-w-3xl
            "
          >
            {/* ==========================================
                MOVIE INFORMATION
            ========================================== */}

            <div
              className="
                flex
                flex-col
                md:flex-row
              "
            >
              {/* ========================================
                  POSTER
              ======================================== */}

              <img
                src={
                  movie?.poster_path
                    ? image_base_url +
                      movie.poster_path
                    : ""
                }
                className="
                  md:max-w-45
                  aspect-video
                  h-auto
                  object-cover
                  object-bottom
                  rounded
                "
                alt={
                  movie?.title ||
                  "Movie"
                }
              />

              {/* ========================================
                  MOVIE DETAILS
              ======================================== */}

              <div
                className="
                  flex
                  flex-col
                  p-4
                "
              >
                <p
                  className="
                    text-lg
                    font-semibold
                  "
                >
                  {movie?.title ||
                    "Unknown Movie"}
                </p>

                <p
                  className="
                    text-gray-400
                    text-sm
                  "
                >
                  {movie?.runtime
                    ? `${movie.runtime} min`
                    : ""}
                </p>

                <p
                  className="
                    text-gray-400
                    text-sm
                    mt-auto
                  "
                >
                  {item?.show?.showDateTime
                    ? dateFormat(
                        item.show.showDateTime
                      )
                    : ""}
                </p>
              </div>
            </div>

            {/* ==========================================
                BOOKING INFORMATION
            ========================================== */}

            <div
              className="
                flex
                flex-col
                md:items-end
                md:text-right
                justify-between
                p-4
              "
            >
              {/* ========================================
                  PRICE + PAYMENT
              ======================================== */}

              <div
                className="
                  flex
                  items-center
                  gap-4
                "
              >
                {/* ======================================
                    PRICE
                ====================================== */}

                <p
                  className="
                    text-2xl
                    font-semibold
                    mb-3
                  "
                >
                  {currency}{" "}
                  {item?.amount ?? 0}
                </p>

                {/* ======================================
                    PAYMENT STATUS
                ====================================== */}

                {isPaid ? (
                  <span
                    className="
                      px-4
                      py-1.5
                      mb-3
                      text-sm
                      rounded-full
                      font-medium
                      border
                      border-green-500/30
                      text-green-500
                    "
                  >
                    Paid / Confirmed
                  </span>
                ) : isExpired || isCancelled ? (
                  <span
                    className="
                      px-4
                      py-1.5
                      mb-3
                      text-sm
                      rounded-full
                      font-medium
                      border
                      border-yellow-500/30
                      text-yellow-500
                    "
                  >
                    {isExpired
                      ? "Payment Expired"
                      : "Booking Cancelled"}
                  </span>
                ) : paymentLink ? (
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      bg-primary
                      px-4
                      py-1.5
                      mb-3
                      text-sm
                      rounded-full
                      font-medium
                      cursor-pointer
                    "
                  >
                    Pay Now
                  </a>
                ) : (
                  <span
                    className="
                      px-4
                      py-1.5
                      mb-3
                      text-sm
                      rounded-full
                      font-medium
                      border
                      border-yellow-500/30
                      text-yellow-500
                    "
                  >
                    Payment Pending
                  </span>
                )}
              </div>

              {/* ========================================
                  TICKET INFORMATION
              ======================================== */}

              <div
                className="
                  text-sm
                "
              >
                {/* ======================================
                    TOTAL TICKETS
                ====================================== */}

                <p>
                  <span>
                    Total Tickets:{" "}
                  </span>

                  {bookedSeats.length}
                </p>

                {/* ======================================
                    SEAT NUMBERS
                ====================================== */}

                <p>
                  <span>
                    Seat Numbers:{" "}
                  </span>

                  {bookedSeats.length > 0
                    ? bookedSeats.join(", ")
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MyBookings;