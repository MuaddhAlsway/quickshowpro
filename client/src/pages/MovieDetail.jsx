import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dummyShowsData, dummyDateTimeData } from "../assets/assets";
import BlurCode from "../components/BlurCode";
import { Heart, PlayCircleIcon, StarIcon } from "lucide-react";
import DateSelect from "../components/DateSelect";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";

const timeFormat = (minutes) => {
  if (!minutes) return "";

  const hours = Math.floor(minutes / 60);
  const minutesReminder = minutes % 60;

  return `${hours}h ${minutesReminder}m`;
};

function MovieDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [show, setShow] = useState(null);

  useEffect(() => {
    const movie = dummyShowsData.find(
      (item) => String(item._id) === String(id)
    );

    if (movie) {
      setShow({
        movie,
        dateTime: dummyDateTimeData,
      });
    }
  }, [id]);

  if (!show) {
    return (
      <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50 text-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50 pb-20">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Poster */}
        <img
          src={show.movie.poster_path}
          alt={show.movie.title}
          className="max-md:mx-auto rounded-xl h-[420px] w-[280px] object-cover"
        />

        {/* Movie Details */}
        <div className="relative flex flex-col gap-4">
          <BlurCode top="-100px" left="-100px" />

          <p className="text-primary font-medium">
            {show.movie.original_language?.toUpperCase() || "ENGLISH"}
          </p>

          <h1 className="text-4xl md:text-5xl font-bold">
            {show.movie.title}
          </h1>

          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            <span>
              {show.movie.vote_average?.toFixed(1)} User Rating
            </span>
          </div>

          <p className="text-gray-400 leading-relaxed max-w-2xl">
            {show.movie.overview}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
            <span>{timeFormat(show.movie.runtime)}</span>
            <span>•</span>
            <span>
              {show.movie.genres?.map((genre) => genre.name).join(", ")}
            </span>
            <span>•</span>
            <span>{show.movie.release_date?.split("-")[0]}</span>
          </div>

          <div className="flex items-center flex-wrap gap-4 mt-4">
            <button className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95">
              <PlayCircleIcon className="w-5 h-5" />
              Watch Trailer
            </button>
            <a
              href="#dateSelect"
              className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
            >
              Buy Tickets
            </a>
            <button className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95">
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      <p className="text-lg font-medium mt-20">Your Favorite Cast</p>
      <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
        <div className="flex items-center gap-4 w-max px-4">
          {show.movie.casts?.slice(0, 12).map((cast, index) => (
            <div className="flex flex-col items-center" key={index}>
              <img
                src={cast.profile_path}
                alt={cast.name}
                className="rounded-full h-20 aspect-square object-cover"
              />
              <p className="font-medium text-xs mt-3 text-center">{cast.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <DateSelect dateTime={show.dateTime} id={id} />

      {/* Related Movies */}
      <p className="text-lg font-medium mt-20 mb-8">You May Also Like</p>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {dummyShowsData.slice(0, 4).map((movie, index) => (
          <MovieCard key={index} movie={movie} />
        ))}
      </div>

      <div className="flex justify-center mt-20">
        <button
          onClick={() => {
            navigate("/movies");
            window.scrollTo(0, 0);
          }}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
        >
          Show More
        </button>
      </div>
    </div>
  );
}

export default MovieDetail;