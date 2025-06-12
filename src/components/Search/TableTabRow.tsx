import Link from "next/link";
import { useRouter } from "next/router";
import { FaStar } from "react-icons/fa";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import { motion } from "framer-motion";
import type {
  InfiniteQueryParams,
  MinimalTabRepresentation,
} from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import formatDate from "~/utils/formatDate";
import { genreList } from "~/utils/genreList";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { MdModeEditOutline } from "react-icons/md";
import Verified from "~/components/ui/icons/Verified";

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
  const { asPath } = useRouter();

  return (
    <TableRow ref={ref} className="w-full">
      {/* Direct /edit page button */}
      {asPath.includes("/profile/tabs") && (
        <TableCell>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <Button variant={"navigation"} asChild>
              <Link
                prefetch={false}
                href={`/tab/${minimalTab.id}/edit`}
                className="baseFlex size-10 !p-0"
              >
                <MdModeEditOutline className="size-5" />
              </Link>
            </Button>
          </motion.div>
        </TableCell>
      )}

      {/* Title */}
      <TableCell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.25 }}
          className="w-full"
        >
          <Button variant={"link"} asChild>
            <Link
              prefetch={false}
              href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
              className="!p-0 !text-base !font-semibold md:!text-lg"
            >
              <span className="max-w-[230px] truncate sm:max-w-[300px]">
                {minimalTab.title}
              </span>
            </Link>
          </Button>
        </motion.div>
      </TableCell>

      {/* Artist */}
      {!asPath.includes("/artist") && (
        <TableCell>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.25 }}
            className="w-full"
          >
            {minimalTab.artist || minimalTab.createdBy ? (
              <Button variant={"link"} asChild>
                <Link
                  prefetch={false}
                  href={
                    minimalTab.artist
                      ? `/artist/${encodeURIComponent(minimalTab.artist.name)}/${minimalTab.artist.id}/filters`
                      : minimalTab.createdBy
                        ? `/user/${minimalTab.createdBy.username}/filters`
                        : ""
                  }
                  className="baseFlex !h-6 max-w-[100%] !justify-start !p-0"
                >
                  {minimalTab.artist ? (
                    <div className="baseFlex size-full !justify-start gap-1">
                      {minimalTab.artist.isVerified && (
                        <Verified className="size-4 shrink-0" />
                      )}
                      <span className="min-w-0 max-w-[165px] truncate">
                        {minimalTab.artist.name}
                      </span>
                    </div>
                  ) : (
                    <span className="min-w-0 max-w-[165px] truncate">
                      {minimalTab.createdBy?.username ?? "Anonymous"}
                    </span>
                  )}
                </Link>
              </Button>
            ) : (
              <span className="text-sm italic">Anonymous</span>
            )}
          </motion.div>
        </TableCell>
      )}

      {/* Rating */}
      <TableCell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.25 }}
          className="w-full"
        >
          {minimalTab.ratingsCount > 0 ? (
            <div className="baseFlex !justify-start gap-1">
              {minimalTab.averageRating}
              <FaStar className="size-3" />({minimalTab.ratingsCount})
            </div>
          ) : (
            <div></div>
          )}
        </motion.div>
      </TableCell>

      {/* Difficulty */}
      <TableCell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.25 }}
          className="w-full"
        >
          <div className="baseFlex !justify-start gap-2">
            <DifficultyBars difficulty={minimalTab.difficulty} />

            {DIFFICULTIES[minimalTab.difficulty - 1]}
          </div>
        </motion.div>
      </TableCell>

      {/* Genre */}
      <TableCell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.25 }}
          className="w-full"
        >
          <Badge
            style={{
              backgroundColor: genreList.get(minimalTab.genre),
            }}
          >
            {minimalTab.genre}
          </Badge>
        </motion.div>
      </TableCell>

      {/* Date */}
      <TableCell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.25 }}
          className="w-full"
        >
          {formatDate(minimalTab.createdAt)}
        </motion.div>
      </TableCell>

      {/* Bookmark toggle */}
      <TableCell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
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
        </motion.div>
      </TableCell>
    </TableRow>
  );
}

export default TableTabRow;
