import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { assets } from "../assets/assets";
import { MenuIcon, SearchIcon, XIcon } from "lucide-react";
import { useUser, useClerk } from "@clerk/clerk-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Clerk
  const { user, isLoaded } = useUser();
  const { openSignIn, openUserProfile } = useClerk();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMenu = () => {
    setIsOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleLogin = () => {
    setIsOpen(false);
    openSignIn();
  };

  const handleProfile = () => {
    setIsOpen(false);
    openUserProfile();
  };

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Movies", path: "/movies" },
    { name: "Theaters", path: "/theaters" },
    { name: "Releases", path: "/releases" },
    { name: "Favorites", path: "/favorites" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300 ${
          isOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Header */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-black/80 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="max-md:flex-1">
              <img
                src={assets.logo}
                alt="QuickShow Logo"
                className="w-32 sm:w-36 h-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 px-8 py-3 rounded-full backdrop-blur-md bg-white/10 border border-white/10">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `transition-colors duration-300 hover:text-primary ${
                      isActive ? "text-primary" : "text-white"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4 md:gap-6">
              {/* Search */}
              <button
                type="button"
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition"
                aria-label="Search"
              >
                <SearchIcon className="w-5 h-5" />
              </button>

              {/* Authentication */}
              {isLoaded &&
                (user ? (
                  <button
                    type="button"
                    onClick={handleProfile}
                    className="hidden sm:block px-5 py-2 bg-primary hover:bg-primary-dull transition-all duration-300 rounded-full font-medium text-white"
                  >
                    Profile
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="hidden sm:block px-5 py-2 bg-primary hover:bg-primary-dull transition-all duration-300 rounded-full font-medium text-white"
                  >
                    Login
                  </button>
                ))}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="md:hidden"
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon className="w-8 h-8 cursor-pointer" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 left-0 h-screen bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center gap-8 text-lg font-medium transition-all duration-300 md:hidden overflow-hidden ${
          isOpen ? "w-full" : "w-0"
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          className="absolute top-6 right-6"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          <XIcon className="w-7 h-7 cursor-pointer" />
        </button>

        {/* Mobile Navigation */}
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            onClick={closeMenu}
            className={({ isActive }) =>
              `transition-colors duration-300 whitespace-nowrap ${
                isActive ? "text-primary" : "text-white"
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}

        {/* Mobile Authentication */}
        {isLoaded &&
          (user ? (
            <button
              type="button"
              onClick={handleProfile}
              className="mt-4 px-8 py-3 bg-primary hover:bg-primary-dull transition rounded-full font-medium text-white"
            >
              Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="mt-4 px-8 py-3 bg-primary hover:bg-primary-dull transition rounded-full font-medium text-white"
            >
              Login
            </button>
          ))}
      </div>
    </>
  );
};

export default Navbar;