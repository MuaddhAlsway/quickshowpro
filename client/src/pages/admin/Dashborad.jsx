import { useEffect, useState } from "react";
import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { dateFormat } from "../../lib/dateTimeFormat";

import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import BlurCode from "../../components/BlurCode";

import { useAppContext } from "../../context/AppContext";


function Dashboard() {

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
    import.meta.env.VITE_CURRENCY || "$";


  // ======================================================
  // STATE
  // ======================================================

  const [
    dashboardData,
    setDashboardData,
  ] = useState({

    totalBookings: 0,

    totalRevenue: 0,

    activeShows: [],

    totalUsers: 0,

  });


  const [
    loading,
    setLoading,
  ] = useState(true);


  // ======================================================
  // DASHBOARD CARDS
  // ======================================================

  const dashboardCards = [

    {
      title: "Total Bookings",

      value:
        dashboardData.totalBookings,

      icon:
        ChartLineIcon,
    },

    {
      title: "Total Revenue",

      value:
        `${currency} ${dashboardData.totalRevenue}`,

      icon:
        CircleDollarSignIcon,
    },

    {
      title: "Active Shows",

      value:
        dashboardData.activeShows.length,

      icon:
        PlayCircleIcon,
    },

    {
      title: "Total Users",

      value:
        dashboardData.totalUsers,

      icon:
        UserIcon,
    },

  ];


  // ======================================================
  // FETCH DASHBOARD DATA
  // ======================================================

  const fetchDashboardData =
    async () => {

      try {

        // ================================================
        // START LOADING
        // ================================================

        setLoading(true);


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
        // REQUEST
        // ================================================

        const { data } =
          await axios.get(
            "/api/admin/dashboard",
            {
              headers: {

                Authorization:
                  `Bearer ${token}`,

              },
            }
          );


        console.log(
          "DASHBOARD RESPONSE:",
          data
        );


        // ================================================
        // SUCCESS
        // ================================================

        if (data.success) {

          const receivedData =
            data.dashboardData || {};


          // ==============================================
          // NORMALIZE BACKEND DATA
          // ==============================================
          //
          // Your backend previously used:
          //
          // totalUser
          //
          // while the frontend uses:
          //
          // totalUsers
          //
          // This supports both for now.
          // ==============================================

          setDashboardData({

            totalBookings:
              receivedData.totalBookings || 0,

            totalRevenue:
              receivedData.totalRevenue || 0,

            activeShows:
              Array.isArray(
                receivedData.activeShows
              )
                ? receivedData.activeShows
                : [],

            totalUsers:
              receivedData.totalUsers ??
              receivedData.totalUser ??
              0,

          });

        } else {

          toast.error(
            data.message ||
            "Failed to fetch dashboard data"
          );

        }

      } catch (error) {

        console.error(
          "DASHBOARD ERROR:",
          error.response?.status,
          error.response?.data ||
          error.message
        );


        toast.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch dashboard data"
        );

      } finally {

        setLoading(false);

      }

    };


  // ======================================================
  // FETCH DASHBOARD WHEN USER IS READY
  // ======================================================

  useEffect(() => {

    if (!user?.id) {
      return;
    }


    fetchDashboardData();

  }, [user?.id]);


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return <Loading />;

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
        text1="Admin"
        text2="Dashboard"
      />


      {/* ==================================================
          DASHBOARD STATISTICS
      ================================================== */}

      <div
        className="
          relative
          flex
          flex-wrap
          gap-4
          mt-6
        "
      >

        <BlurCode />


        {dashboardCards.map(
          (card) => {

            const Icon =
              card.icon;


            return (

              <div
                key={
                  card.title
                }

                className="
                  flex
                  items-center
                  justify-between
                  px-4
                  py-3
                  bg-primary/10
                  border
                  border-primary/20
                  rounded-md
                  max-w-50
                  w-full
                "
              >

                <div>

                  <h1 className="text-sm">

                    {card.title}

                  </h1>


                  <p
                    className="
                      text-xl
                      font-medium
                      mt-1
                    "
                  >

                    {card.value}

                  </p>

                </div>


                <Icon
                  className="
                    w-6
                    h-6
                  "
                />

              </div>

            );

          }
        )}

      </div>


      {/* ==================================================
          ACTIVE SHOWS TITLE
      ================================================== */}

      <p
        className="
          mt-10
          text-lg
          font-medium
        "
      >

        Active Shows

      </p>


      {/* ==================================================
          ACTIVE SHOWS
      ================================================== */}

      <div
        className="
          relative
          flex
          flex-wrap
          gap-6
          mt-4
          max-w-5xl
        "
      >

        <BlurCode
          top="100px"
          left="-10%"
        />


        {/* =================================================
            NO ACTIVE SHOWS
        ================================================= */}

        {dashboardData.activeShows.length ===
          0 && (

          <p className="text-gray-400">

            No active shows found.

          </p>

        )}


        {/* =================================================
            SHOW CARDS
        ================================================= */}

        {dashboardData.activeShows.map(
          (show) => {

            const movie =
              show.movie;


            // =============================================
            // BUILD POSTER URL
            // =============================================

            const posterUrl =
              movie?.poster_path
                ? movie.poster_path.startsWith(
                    "http"
                  )
                  ? movie.poster_path
                  : `${image_base_url}${movie.poster_path}`
                : "";


            return (

              <div
                key={show._id}

                className="
                  w-55
                  rounded-lg
                  overflow-hidden
                  hover:-translate-y-1
                  transition
                  duration-300
                "
              >

                {/* =========================================
                    POSTER
                ========================================= */}

                {posterUrl ? (

                  <img
                    src={
                      posterUrl
                    }

                    className="
                      h-60
                      w-full
                      object-cover
                    "

                    alt={
                      movie?.title ||
                      "Movie"
                    }
                  />

                ) : (

                  <div
                    className="
                      h-60
                      w-full
                      bg-gray-800
                      flex
                      items-center
                      justify-center
                      text-gray-500
                    "
                  >

                    No Poster

                  </div>

                )}


                {/* =========================================
                    TITLE
                ========================================= */}

                <p
                  className="
                    font-medium
                    p-2
                    truncate
                  "
                >

                  {movie?.title ||
                    "Unknown Movie"}

                </p>


                {/* =========================================
                    PRICE + RATING
                ========================================= */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    px-2
                  "
                >

                  <p
                    className="
                      text-lg
                      font-medium
                    "
                  >

                    {currency}{" "}
                    {show.showPrice}

                  </p>


                  <p
                    className="
                      flex
                      items-center
                      gap-1
                      text-sm
                      text-gray-400
                      mt-1
                      pr-1
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


                    {typeof movie?.vote_average ===
                    "number"
                      ? movie.vote_average.toFixed(1)
                      : "0.0"}

                  </p>

                </div>


                {/* =========================================
                    SHOW DATE
                ========================================= */}

                <p
                  className="
                    px-2
                    pt-2
                    pb-3
                    text-sm
                    text-gray-500
                  "
                >

                  {show.showDateTime
                    ? dateFormat(
                        show.showDateTime
                      )
                    : "No date"}

                </p>

              </div>

            );

          }
        )}

      </div>

    </>

  );

}


export default Dashboard;