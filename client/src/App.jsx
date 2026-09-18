import {
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import { SignIn } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Loading from "./components/Loading";

// Public Pages
import Home from "./pages/Home";
import Movies from "./pages/Movie";
import MovieDetail from "./pages/MovieDetail";
import SeatLayout from "./pages/SeatLayout";
import MyBookings from "./pages/MyBookings";
import Favorites from "./pages/Favorites";

// Admin Pages
import Layout from "./pages/admin/Layout";
import Dashboard from "./pages/admin/Dashborad";
import AddShow from "./pages/admin/AddShow";
import ListShows from "./pages/admin/ListShows";
import ListBookings from "./pages/admin/ListBookings";

// Context
import { useAppContext } from "./context/AppContext";


function App() {
  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith("/admin");


  const {
    user,
    isLoaded,
    isAdmin,
    isAdminLoading,
  } = useAppContext();


  // ======================================================
  // ADMIN ELEMENT
  // ======================================================

  const getAdminElement = () => {

    // Clerk hasn't finished loading
    if (!isLoaded) {
      return <Loading />;
    }


    // Not logged in
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <SignIn
            fallbackRedirectUrl="/admin"
          />
        </div>
      );
    }


    // Logged in but we're still checking role
    if (isAdminLoading) {
      return <Loading />;
    }


    // Admin
    if (isAdmin) {
      return <Layout />;
    }


    // Logged in but not admin
    return (
      <Navigate
        to="/"
        replace
      />
    );
  };


  return (
    <>
      <Toaster
        position="top-center"
      />


      {!isAdminRoute && (
        <Navbar />
      )}


      <main className="min-h-screen">

        <Routes>

          {/* PUBLIC */}

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/movies"
            element={<Movies />}
          />

          <Route
            path="/movies/:id"
            element={<MovieDetail />}
          />

          <Route
            path="/buy-tickets/:id/:date"
            element={<SeatLayout />}
          />

          <Route
            path="/mybookings"
            element={<MyBookings />}
          />

          <Route
            path="/loading/:nextUrl"
            element={<Loading />}
          />

          <Route
            path="/favorites"
            element={<Favorites />}
          />


          {/* ADMIN */}

          <Route
            path="/admin"
            element={getAdminElement()}
          >

            <Route
              index
              element={<Dashboard />}
            />

            <Route
              path="add-shows"
              element={<AddShow />}
            />

            <Route
              path="list-shows"
              element={<ListShows />}
            />

            <Route
              path="list-bookings"
              element={<ListBookings />}
            />

          </Route>


          {/* 404 */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </main>


      {!isAdminRoute && (
        <Footer />
      )}

    </>
  );
}


export default App;