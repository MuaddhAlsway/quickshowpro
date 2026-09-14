import { useState } from "react"
import { dummyTrailers } from "../assets/assets"
import ReactPlayer from "react-player"
import BlurCode from "./BlurCode"
import { PlayCircleIcon } from "lucide-react" // Ensure PlayCircleIcon is correctly imported

function TrailerSection() {
    const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0])

  return (
    <div className="px-6 md:px-10 lg:px-24 xl:px-44 py-20 overflow-hidden">
            <p>Trailers</p>

            <div className="relative mt-6">
              <BlurCode top="-100px" right="-100px"/> 
                <ReactPlayer src={currentTrailer.videoUrl}  controls={false}
                className="mx-auto max-w-full" width="960px" height="540px" />
            </div>
           {/* Trailer Thumbnails */}
      <div className="grid grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto">
        {dummyTrailers.map((trailer) => (
          <div
            key={trailer.id || trailer.videoUrl} // Added missing React key prop
            onClick={() => setCurrentTrailer(trailer)} // Set active trailer on click
            className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 ${
              currentTrailer.videoUrl === trailer.videoUrl
                ? "ring-2 ring-red-500"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <img
              src={trailer.image}
              alt={trailer.title || "Trailer thumbnail"}
              className="rounded-lg w-full h-24 md:h-32 object-cover brightness-75"
            />
            <PlayCircleIcon
              strokeWidth={1.6}
              className="absolute top-1/2 left-1/2 w-8 h-8 md:w-12 md:h-12 text-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
            ))}
           </div>
    </div>
  )
}
export default TrailerSection