import Link from "next/link";
import { useRouter } from "next/router";
import { FaStar } from "react-icons/fa";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import type {
  InfiniteQueryParams,
  MinimalTabRepresentation,
} from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import formatDate from "~/utils/formatDate";
import { genreList } from "~/utils/genreList";
import BookmarkToggle from "~/components/ui/BookmarkToggle";

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

interface TableTabRow {
  minimalTab: MinimalTabRepresentation;
  currentUser: UserMetadata | null | undefined;
  infiniteQueryParams?: InfiniteQueryParams;
  ref?: React.RefObject<HTMLTableRowElement>;
}

function TableTabRow({
  minimalTab,
  currentUser,
  infiniteQueryParams,
  ref,
}: TableTabRow) {
  const { query, asPath } = useRouter();

  // TODO: actually not sure if we can use framer motion with this since <table> structure is kinda
  // specific in what it allows.

  return (
    <TableRow ref={ref} className="w-full">
      {/* Title */}
      <TableCell className="whitespace-nowrap">
        <Button variant={"link"} asChild>
          <Link
            prefetch={false}
            href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
            className="!p-0 !text-base !font-semibold md:!text-lg"
          >
            {minimalTab.title}
          </Link>
        </Button>
      </TableCell>

      {/* Artist */}
      {!query.artist && !query.user && !asPath.includes("/profile/tabs") && (
        <TableCell>
          {minimalTab.artist || minimalTab.createdBy ? (
            <Button variant={"link"} asChild>
              <Link
                prefetch={false}
                href={
                  minimalTab.artist
                    ? `/artist/${minimalTab.artist.id}/${encodeURIComponent(minimalTab.artist.name)}`
                    : minimalTab.createdBy
                      ? `/user/${minimalTab.createdBy.username}`
                      : ""
                }
                className="!h-6 !p-0"
              >
                {minimalTab.artist ? (
                  <div className="baseFlex gap-1">
                    {minimalTab.artist.isVerified && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.293-11.293a1 1 0 00-1.414 0L9.5 9.086l-.879-.879a1 1 0 10-1.414 1.414l1.793 1.793a1 1 0 001.414 0l3-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {minimalTab.artist.name}
                  </div>
                ) : (
                  (minimalTab.createdBy?.username ?? "Anonymous")
                )}
              </Link>
            </Button>
          ) : (
            <span className="text-sm italic">Anonymous</span>
          )}
        </TableCell>
      )}

      {/* Rating */}
      <TableCell>
        <div className="baseFlex !justify-start gap-1">
          {minimalTab.averageRating}
          <FaStar className="size-3" />({minimalTab.ratingsCount})
        </div>
      </TableCell>

      {/* Difficulty */}
      <TableCell>
        <div className="baseFlex !justify-start gap-2">
          <DifficultyBars difficulty={minimalTab.difficulty} />

          {DIFFICULTIES[minimalTab.difficulty - 1]}
        </div>
      </TableCell>

      {/* Genre */}
      {!query.genreId && (
        <TableCell>
          <Badge
            style={{
              backgroundColor: genreList[minimalTab.genreId]?.color,
            }}
          >
            {genreList[minimalTab.genreId]?.name}
          </Badge>
        </TableCell>
      )}

      {/* Date */}
      <TableCell>{formatDate(minimalTab.createdAt)}</TableCell>

      {/* Bookmark toggle */}
      <TableCell>
        <BookmarkToggle
          tabId={minimalTab.id}
          createdByUserId={minimalTab.createdBy?.userId ?? null}
          currentUser={currentUser}
          showText={false}
          isBookmarked={
            currentUser?.bookmarkedTabIds?.includes(minimalTab.id) ?? false
          }
          infiniteQueryParams={infiniteQueryParams}
          customClassName="size-10"
        />
      </TableCell>
    </TableRow>
  );
}

export default TableTabRow;
