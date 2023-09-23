import { api } from "~/utils/api";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import GenreBubble from "./GenreBubble";

const indicies = [1, 2, 3, 4, 5, 6, 7, 8];

function GenreBubbles() {
  const { data: genres, isLoading: genresAreLoading } =
    api.genre.getAllWithTotalTabNumbers.useQuery();

  return (
    <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
      <div className="baseVertFlex gap-0 md:gap-1">
        <p className="text-xl font-bold">Genres</p>
        <Separator className="w-full bg-pink-500" />
      </div>

      <div className="grid w-full grid-cols-2 place-items-center gap-4 lg:grid-cols-3 2xl:grid-cols-4">
        {genresAreLoading || !genres ? (
          <>
            {indicies.map((index) => (
              <Skeleton key={index} className="h-36 w-full rounded-lg" />
            ))}
          </>
        ) : (
          <>
            {genres.map((genre) => (
              <GenreBubble key={genre.id} {...genre} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default GenreBubbles;
