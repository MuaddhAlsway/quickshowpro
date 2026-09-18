import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { assets } from "../assets/assets";

import {
  MenuIcon,
  SearchIcon,
  XIcon,
  TicketIcon,
  HeartIcon,
} from "lucide-react";

import {
  useUser,
  useClerk,
  UserButton,
} from "@clerk/clerk-react";

import { useAppContext } from "../context/AppContext";


const Navbar = () => {

  // ======================================================
  // STATE
  // ======================================================

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);


  // ======================================================
  // CLERK
  // ======================================================

  const {
    user,
    isLoaded,
  } = useUser();

  const {
    openSignIn,
  } = useClerk();


  // ======================================================
  // APP CONTEXT
  // ======================================================

  const {
    favoriteMovies,
  } = useAppContext();


  // ======================================================
  // FAVORITES STATUS
  // ======================================================

  const hasFavorites =
    Array.isArray(favoriteMovies) &&
    favoriteMovies.length > 0;


  // ======================================================
  // SCROLL EFFECT
  // ======================================================

  useEffect(() => {

    const handleScroll = () => {

      setScrolled(
        window.scrollY > 30
      );

    };


    handleScroll();


    window.addEventListener(
      "scroll",
      handleScroll
    );


    return () => {

      window.removeEventListener(
        "scroll",
        handleScroll
      );

    };

  }, []);


  // ======================================================
  // CLOSE MOBILE MENU
  // ======================================================

  const closeMenu = () => {

    setIsOpen(false);


    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  };


  // ======================================================
  // LOGIN
  // ======================================================

  const handleLogin = () => {

    setIsOpen(false);

    openSignIn();

  };


  // ======================================================
  // NAVIGATION LINKS
  // ======================================================

  const navLinks = [

    {
      name: "Home",
      path: "/",
    },

    {
      name: "Movies",
      path: "/movies",
    },

    {
      name: "Theaters",
      path: "/theaters",
    },

    {
      name: "Releases",
      path: "/releases",
    },


    // ====================================================
    // SHOW FAVORITES ONLY WHEN FAVORITES EXIST
    // ====================================================

    ...(user && hasFavorites
      ? [
          {
            name: "Favorites",
            path: "/favorites",
          },
        ]
      : []),

  ];


  // ======================================================
  // CLERK USER MENU
  // ======================================================

  const ClerkUserMenu = () => (

    <UserButton

      appearance={{
        elements: {

          avatarBox:
            "w-10 h-10",

        },
      }}

    >

      <UserButton.MenuItems>


        {/* ================================================
            MY BOOKINGS
        ================================================ */}

        <UserButton.Link

          label="My Bookings"

          href="/mybookings"

          labelIcon={
            <TicketIcon
              size={16}
            />
          }

        />


        {/* ================================================
            FAVORITES
            ONLY SHOW IF FAVORITES EXIST
        ================================================ */}

        {hasFavorites && (

          <UserButton.Link

            label="Favorites"

            href="/favorites"

            labelIcon={
              <HeartIcon
                size={16}
              />
            }

          />

        )}


      </UserButton.MenuItems>

    </UserButton>

  );


  // ======================================================
  // UI
  // ======================================================

  return (

    <>

      {/* ==================================================
          MOBILE OVERLAY
      ================================================== */}

      <div

        className={`
          fixed
          inset-0
          bg-black/60
          backdrop-blur-sm
          z-40
          md:hidden
          transition-all
          duration-300

          ${
            isOpen
              ? "opacity-100 visible"
              : "opacity-0 invisible pointer-events-none"
          }
        `}

        onClick={() =>
          setIsOpen(false)
        }

      />


      {/* ==================================================
          HEADER
      ================================================== */}

      <header

        className={`
          fixed
          top-0
          left-0
          w-full
          z-50
          transition-all
          duration-300

          ${
            scrolled
              ? "bg-black/80 backdrop-blur-xl border-b border-white/10"
              : "bg-transparent"
          }
        `}

      >

        <div
          className="
            max-w-7xl
            mx-auto
            px-6
            md:px-10
            lg:px-12
            py-5
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
            "
          >


            {/* ============================================
                LOGO
            ============================================ */}

            <Link
              to="/"
              className="max-md:flex-1"
            >

              <img

                src={
                  assets.logo
                }

                alt="QuickShow Logo"

                className="
                  w-32
                  sm:w-36
                  h-auto
                "

              />

            </Link>


            {/* ============================================
                DESKTOP NAVIGATION
            ============================================ */}

            <nav
              className="
                hidden
                md:flex
                items-center
                gap-8
                px-8
                py-3
                rounded-full
                backdrop-blur-md
                bg-white/10
                border
                border-white/10
              "
            >

              {navLinks.map(
                (link) => (

                  <NavLink

                    key={
                      link.name
                    }

                    to={
                      link.path
                    }

                    className={({
                      isActive,
                    }) =>

                      `
                        transition-colors
                        duration-300
                        hover:text-primary

                        ${
                          isActive
                            ? "text-primary"
                            : "text-white"
                        }
                      `

                    }

                  >

                    {link.name}

                  </NavLink>

                )
              )}

            </nav>


            {/* ============================================
                RIGHT SIDE
            ============================================ */}

            <div
              className="
                flex
                items-center
                gap-4
                md:gap-6
              "
            >


              {/* ==========================================
                  SEARCH
              ========================================== */}

              <button

                type="button"

                className="
                  hidden
                  md:flex
                  items-center
                  justify-center
                  w-10
                  h-10
                  rounded-full
                  hover:bg-white/10
                  transition
                "

                aria-label="Search"

              >

                <SearchIcon
                  className="
                    w-5
                    h-5
                  "
                />

              </button>


              {/* ==========================================
                  AUTHENTICATION
              ========================================== */}

              {isLoaded && (

                user ? (

                  // ========================================
                  // LOGGED IN
                  // ========================================

                  <div
                    className="
                      hidden
                      sm:flex
                      items-center
                    "
                  >

                    <ClerkUserMenu />

                  </div>

                ) : (

                  // ========================================
                  // NOT LOGGED IN
                  // ========================================

                  <button

                    type="button"

                    onClick={
                      handleLogin
                    }

                    className="
                      hidden
                      sm:block
                      px-5
                      py-2
                      bg-primary
                      hover:bg-primary-dull
                      transition-all
                      duration-300
                      rounded-full
                      font-medium
                      text-white
                    "

                  >

                    Login

                  </button>

                )

              )}


              {/* ==========================================
                  MOBILE MENU BUTTON
              ========================================== */}

              <button

                type="button"

                className="
                  md:hidden
                "

                onClick={() =>
                  setIsOpen(true)
                }

                aria-label="Open menu"

              >

                <MenuIcon
                  className="
                    w-8
                    h-8
                    cursor-pointer
                  "
                />

              </button>

            </div>

          </div>

        </div>

      </header>


      {/* ==================================================
          MOBILE MENU
      ================================================== */}

      <div

        className={`
          fixed
          top-0
          left-0
          h-screen
          bg-black/95
          backdrop-blur-xl
          z-50
          flex
          flex-col
          items-center
          justify-center
          gap-8
          text-lg
          font-medium
          transition-all
          duration-300
          md:hidden
          overflow-hidden

          ${
            isOpen
              ? "w-full"
              : "w-0"
          }
        `}

      >


        {/* ================================================
            CLOSE BUTTON
        ================================================ */}

        <button

          type="button"

          className="
            absolute
            top-6
            right-6
          "

          onClick={() =>
            setIsOpen(false)
          }

          aria-label="Close menu"

        >

          <XIcon
            className="
              w-7
              h-7
              cursor-pointer
            "
          />

        </button>


        {/* ================================================
            MOBILE NAVIGATION
        ================================================ */}

        {navLinks.map(
          (link) => (

            <NavLink

              key={
                link.name
              }

              to={
                link.path
              }

              onClick={
                closeMenu
              }

              className={({
                isActive,
              }) =>

                `
                  transition-colors
                  duration-300
                  whitespace-nowrap

                  ${
                    isActive
                      ? "text-primary"
                      : "text-white"
                  }
                `

              }

            >

              {link.name}

            </NavLink>

          )
        )}


        {/* ================================================
            MOBILE AUTHENTICATION
        ================================================ */}

        {isLoaded && (

          user ? (

            // ============================================
            // LOGGED IN
            // ============================================

            <div
              className="
                mt-4
                flex
                flex-col
                items-center
                gap-3
              "
            >

              <ClerkUserMenu />


              <p
                className="
                  text-sm
                  text-gray-400
                "
              >

                {
                  user.firstName ||
                  user.username ||
                  "Account"
                }

              </p>

            </div>

          ) : (

            // ============================================
            // NOT LOGGED IN
            // ============================================

            <button

              type="button"

              onClick={
                handleLogin
              }

              className="
                mt-4
                px-8
                py-3
                bg-primary
                hover:bg-primary-dull
                transition
                rounded-full
                font-medium
                text-white
              "

            >

              Login

            </button>

          )

        )}

      </div>

    </>

  );

};


export default Navbar;