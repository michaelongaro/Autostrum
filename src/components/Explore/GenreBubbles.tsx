import { api } from "~/utils/api";
import { Skeleton } from "../ui/skeleton";
import GenreBubble from "./GenreBubble";

const indicies = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function GenreBubbles() {
  const { data: genres, isLoading: genresAreLoading } =
    api.genre.getAllWithTotalTabNumbers.useQuery();

  return (
    <div className="baseVertFlex w-full !items-start">
      <p className="pl-4 text-lg font-semibold">Genres</p>

      {/* maybe do some animatepresence / motion stuff here */}

      {genresAreLoading || !genres ? (
        <div className="grid w-full grid-cols-1 place-items-center gap-4 p-2 md:grid-cols-2 md:p-4 lg:grid-cols-3 xl:grid-cols-4">
          {indicies.map((index) => (
            <Skeleton key={index} className="h-24 w-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 place-items-center gap-4 p-2 md:grid-cols-2 md:p-4 lg:grid-cols-3 xl:grid-cols-4">
          {genres.map((genre) => (
            <GenreBubble key={genre.id} {...genre} />
          ))}
        </div>
      )}
    </div>
  );
}

export default GenreBubbles;
