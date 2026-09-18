import BlurCode from "../components/BlurCode"
import MovieCard from "../components/MovieCard"
import { useAppContext } from "../context/AppContext"
function Movie() {

  const {shows} = useAppContext()

  return shows.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCode top="150px" left="0px"/>
       <BlurCode bottom="50px" right="50px"/>
      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {shows.map((movie) => (
          <MovieCard movie={movie} key={movie._id}/>
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-3xl font-bold text-center">No Movies Available</h2>
    </div>
  )
}
export default Movie