import Image from "next/image";
import Link from "next/link";
import { forwardRef, useState } from "react";
import { AiFillHeart, AiOutlineUser } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import type { ArtistMetadata } from "~/server/api/routers/artist";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";

const TableArtistRow = forwardRef<HTMLTableRowElement, ArtistMetadata>(
  (artist, ref) => {
    const [profileImageLoaded, setProfileImageLoaded] = useState(false);

    return (
      <TableRow ref={ref} className="w-full">
        <TableCell>
          {/* not sure why the profile image starts shrinking + eventually "pushed" out of view when
          viewport is shrunk. maybe something to do with "object-cover or object-center"? */}
          <Button asChild variant={"ghost"} className="px-3 py-1">
            <Link
              href={`/artist/${artist?.username ?? ""}`}
              className="baseFlex w-fit !flex-nowrap !justify-start gap-2"
            >
              <div className="grid grid-cols-1 grid-rows-1">
                {artist ? (
                  <>
                    <Image
                      src={artist?.profileImageUrl ?? ""}
                      alt={`${artist?.username ?? "Anonymous"}'s profile image`}
                      width={32}
                      height={32}
                      onLoadingComplete={() => {
                        setTimeout(() => {
                          setProfileImageLoaded(true);
                        }, 1000);
                      }}
                      style={{
                        opacity: profileImageLoaded ? 1 : 0,
                      }}
                      className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full object-cover object-center transition-opacity"
                    />
                    <div
                      style={{
                        opacity: !profileImageLoaded ? 1 : 0,
                        zIndex: !profileImageLoaded ? 1 : -1,
                      }}
                      className={`col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full bg-pink-300 transition-opacity
                              ${!profileImageLoaded ? "animate-pulse" : ""}
                            `}
                    ></div>
                  </>
                ) : (
                  <AiOutlineUser className="h-8 w-8" />
                )}
              </div>
              <span>{artist?.username ?? "Anonymous"}</span>
            </Link>
          </Button>
        </TableCell>

        <TableCell>
          <div className="baseFlex !justify-start gap-2">
            <GiMusicalScore className="h-6 w-6" />
            {formatNumber(artist.numberOfTabs)}
          </div>
        </TableCell>

        <TableCell>
          <div className="baseFlex !justify-start gap-2">
            <AiFillHeart className="h-6 w-6 text-pink-800" />
            {formatNumber(artist.numberOfLikes)}
          </div>
        </TableCell>

        <TableCell>{formatDate(artist.createdAt)}</TableCell>
      </TableRow>
    );
  }
);

TableArtistRow.displayName = "TableArtistRow";

export default TableArtistRow;
