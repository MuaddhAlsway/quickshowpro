import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";
import {
  useAuth,
  useUser,
} from "@clerk/clerk-react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";


// ======================================================
// AXIOS CONFIG
// ======================================================

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;


// ======================================================
// CREATE CONTEXT
// ======================================================

export const AppContext =
  createContext();


// ======================================================
// PROVIDER
// ======================================================

export const AppProvider = ({
  children,
}) => {

  // ====================================================
  // STATE
  // ====================================================

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);


  const [
    isAdminLoading,
    setIsAdminLoading,
  ] = useState(true);


  const [
    shows,
    setShows,
  ] = useState([]);


  const [
    favoriteMovies,
    setFavoriteMovies,
  ] = useState([]);


  // ====================================================
  // ENV
  // ====================================================

  const image_base_url =
    import.meta.env
      .VITE_TMDB_IMAGE_BASE_URL;


  // ====================================================
  // CLERK
  // ====================================================

  const {
    user,
    isLoaded,
    isSignedIn,
  } = useUser();


  const {
    getToken,
  } = useAuth();


  // ====================================================
  // ROUTER
  // ====================================================

  const navigate =
    useNavigate();


  // ====================================================
  // ADMIN CHECK GUARD
  // ====================================================

  const adminCheckedUserRef =
    useRef(null);


  // ====================================================
  // CHECK ADMIN
  // ====================================================

  const fetchIsAdmin =
    async () => {

      try {

        setIsAdminLoading(true);


        // ================================================
        // GET TOKEN
        // ================================================

        const token =
          await getToken();


        if (!token) {

          setIsAdmin(false);

          return false;

        }


        // ================================================
        // REQUEST
        // ================================================

        const { data } =
          await axios.get(
            "/api/admin/is-admin",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        console.log(
          "ADMIN API RESPONSE:",
          data
        );


        // ================================================
        // SET ADMIN
        // ================================================

        const adminStatus =
          data.success === true &&
          data.isAdmin === true;


        setIsAdmin(
          adminStatus
        );


        return adminStatus;

      } catch (error) {

        console.error(
          "ADMIN CHECK ERROR:",
          error.response?.data ||
          error.message
        );


        setIsAdmin(false);


        return false;

      } finally {

        setIsAdminLoading(false);

      }

    };


  // ====================================================
  // FETCH SHOWS
  // ====================================================

  const fetchShows =
    async () => {

      try {

        const { data } =
          await axios.get(
            "/api/show/all"
          );


        if (data.success) {

          setShows(
            data.shows || []
          );

        } else {

          toast.error(
            data.message ||
            "Failed to fetch shows"
          );

        }

      } catch (error) {

        console.error(
          "FAILED TO FETCH SHOWS:",
          error.response?.data ||
          error.message
        );

      }

    };


  // ====================================================
  // FETCH FAVORITES
  // ====================================================

  const fetchFavoriteMovies =
    async () => {

      try {

        const token =
          await getToken();


        if (!token) {
          return;
        }


        const { data } =
          await axios.get(
            "/api/user/favorites",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        if (data.success) {

          setFavoriteMovies(
            data.movies || []
          );

        }

      } catch (error) {

        console.error(
          "FAILED TO FETCH FAVORITES:",
          error.response?.data ||
          error.message
        );

      }

    };


  // ====================================================
  // PUBLIC SHOWS
  // ====================================================

  useEffect(() => {

    fetchShows();

  }, []);


  // ====================================================
  // AUTHENTICATED USER DATA
  // ====================================================

  useEffect(() => {

    // Clerk still loading
    if (!isLoaded) {
      return;
    }


    // ================================================
    // SIGNED OUT
    // ================================================

    if (
      !isSignedIn ||
      !user?.id
    ) {

      adminCheckedUserRef.current =
        null;


      setIsAdmin(false);

      setIsAdminLoading(false);

      setFavoriteMovies([]);


      return;

    }


    // ================================================
    // ALREADY CHECKED THIS USER
    // ================================================

    if (
      adminCheckedUserRef.current ===
      user.id
    ) {

      return;

    }


    // ================================================
    // MARK USER AS CHECKED
    // ================================================

    adminCheckedUserRef.current =
      user.id;


    // ================================================
    // LOAD PRIVATE USER DATA
    // ================================================

    const loadUserData =
      async () => {

        await Promise.all([
          fetchIsAdmin(),
          fetchFavoriteMovies(),
        ]);

      };


    loadUserData();

  }, [
    isLoaded,
    isSignedIn,
    user?.id,
  ]);


  // ====================================================
  // CONTEXT VALUE
  // ====================================================

  const value = {

    // Axios
    axios,


    // Clerk
    user,
    isLoaded,
    isSignedIn,
    getToken,


    // Router
    navigate,


    // Admin
    isAdmin,
    isAdminLoading,
    fetchIsAdmin,


    // Shows
    shows,
    fetchShows,


    // Favorites
    favoriteMovies,
    fetchFavoriteMovies,


    // TMDB
    image_base_url,

  };


  // ====================================================
  // PROVIDER
  // ====================================================

  return (

    <AppContext.Provider
      value={value}
    >

      {children}

    </AppContext.Provider>

  );

};


// ======================================================
// CUSTOM HOOK
// ======================================================

export const useAppContext = () =>
  useContext(AppContext);