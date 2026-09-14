import { ArrowRight, Calendar, Clock } from "lucide-react";
import { assets } from "../assets/assets";
import backgroundImage from "../assets/backgroundImage.png";
import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate()
  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
      className="bg-cover bg-center bg-no-repeat min-h-screen w-full flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 text-white"
    >
      <img
        src={assets.marvelLogo}
        alt="Marvel Logo"
        className="max-h-11 lg:h-11 mt-20"
      />

      <h1 className="text-5xl md:text-[70px] md:leading-[1.1] font-semibold max-w-[440px]">
        Guardians <br /> of the Galaxy
      </h1>

      <div className="flex items-center gap-4 text-gray-300">
        <span>Action | Adventure | Sci-Fi</span>

        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          2014
        </div>

        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          2h 8m
        </div>

        <span className="text-xs px-1.5 py-0.5 border border-gray-400 rounded">
          HD
        </span>
      </div>
      <p className="max-w-md text-gray-300">In post-apocalyptic world where cities ride on wheels and consume each other to survive, two people meet in London and try stop a conspiracy</p>
      <button onClick={() => navigate("/movies")} className="flex items-center gap-1 px-6 py-3 text-sm bg-primary hover-bg-primary-dull transition rounded-full font-medium cursor-pointer">
        Explore Movies
        <ArrowRight className="w-5 h-5"/>
      </button>
    </div>
  );
}

export default Hero;