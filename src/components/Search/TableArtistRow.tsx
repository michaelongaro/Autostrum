import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { AiFillHeart } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import type { ArtistMetadata } from "~/server/api/routers/artist";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";

function TableArtistRow(artist: ArtistMetadata) {
  const { userId, isLoaded } = useAuth();
  const { push, asPath } = useRouter();

  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  // const { data: currentArtist, refetch: refetchCurrentArtist } =
  //   api.artist.getByIdOrUsername.useQuery(
  //     {
  //       userId: userId!,
  //     },
  //     {
  //       enabled: isLoaded,
  //     }
  //   );

  // may need resize observer to refetch data when more tabs are able to be shown
  // but maybe also is automatically handled by IntersectionObserver hook for main infinite scroll

  // not sure if this is best workaround because I would ideally not have loading spinner at all but:
  // maybe show loading spinner when isLoadingTabResults is true and then as soon as it is false
  // have a manual timeout to show correct amount of cards being rendered with their skeleton loading
  // state and then after that timeout is done, show the actual cards with their data?
  // ^^^ really all depends on how long it takes to fetch data in first place

  return (
    <TableRow className="w-full">
      <TableCell>
        <Button
          variant={"ghost"}
          className="baseFlex !justify-start gap-2 px-3 py-1"
        >
          <Link
            // not sure if you fully have defaults down yet but definitely want to be able
            // to have just baseline artist url w/o needing all search filter params
            href={`/user/${artist.username ?? ""}`}
            className="baseFlex gap-2"
          >
            <Image
              src={artist.profileImageUrl ?? ""}
              alt={`${artist.username ?? "Anonymous"}'s profile image`}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full bg-pink-800"
            ></Image>
            <span className="text-semibold">
              {artist.username ?? "Anonymous"}
            </span>
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

export default TableArtistRow;
