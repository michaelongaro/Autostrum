import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye } from "react-icons/fa";
import SearchResults from "~/components/Search/SearchResults";
import Verified from "~/components/ui/icons/Verified";
import { Separator } from "~/components/ui/separator";
import { api } from "~/utils/api";

interface ArtistProfile {
  uniqueKey: string;
}

function ArtistProfile({ uniqueKey }: ArtistProfile) {
  const { query } = useRouter();

  const [artistHasBeenFound, setArtistHasBeenFound] = useState(false);

  const { data: artist, isFetching: isFetchingArtist } =
    api.artist.getByNameAndOrId.useQuery(
      {
        id: query.id ? parseInt(query.id as string) : undefined,
        name: query.name ? (query.name as string) : undefined,
      },
      {
        enabled:
          (query.id !== undefined || query.name !== undefined) &&
          !artistHasBeenFound, // do not want to refetch upon history.replaceState() below
      },
    );

  const { data: relatedArtists, isFetching: isFetchingRelatedArtists } =
    api.search.getRelatedArtistsByName.useQuery(
      query.name ? (query.name as string) : "",
      {
        enabled: artist === null, // only fetch once initial query is complete and has no results
      },
    );

  useEffect(() => {
    setArtistHasBeenFound(Boolean(artist));
  }, [artist]);

  useEffect(() => {
    if (!artist) return;

    const currentUrl = new URL(window.location.href);

    // if the id is not present in the url, add it after the name parameter
    // (used to limit search results to this specific artist)
    if (query.name && !query.id) {
      currentUrl.pathname = `/artist/${query.name as string}/${artist?.id}/filters`;
      window.history.replaceState({}, "", currentUrl);
    }
  }, [artist, query]);

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>{`${artist?.name ? `${artist.name}` : "Artist"} | Autostrum`}</title>
        <meta
          name="description"
          content={`Check out ${
            artist?.name ? `${artist.name}'s songs` : "this artist"
          } on Autostrum.`}
        />
        <meta
          property="og:title"
          content={`${artist?.name ? `${artist.name}` : "Artist"} | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/artist/${artist?.name}`}
        />
        <meta
          property="og:description"
          content={`Check out ${
            artist?.name ? `${artist.name}'s songs` : "this artist"
          } on Autostrum.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/artistProfile.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <AnimatePresence mode="popLayout">
          {isFetchingArtist ? (
            <motion.div
              key={"artistMetadataLoading"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="baseVertFlex w-full !items-start gap-4 px-2 md:!flex-row md:!items-center md:!justify-between md:px-0"
            >
              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-1">Artist</div>

                <div className="pulseAnimation h-[38px] w-36 rounded-md bg-pink-300"></div>
              </div>

              <div className="baseVertFlex !items-start gap-4 md:!flex-row md:!items-center">
                <div className="baseFlex gap-2">
                  <BsMusicNoteBeamed className="size-4" />
                  <span className="font-medium">Songs</span>
                  <div className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"></div>
                </div>

                <div className="baseFlex gap-2">
                  <FaEye className="size-4" />
                  <span className="font-medium">Views</span>
                  <div className="pulseAnimation h-5 w-10 rounded-md bg-pink-300"></div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={"artistMetadataLoaded"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="baseVertFlex w-full !items-start gap-4 px-2 md:!flex-row md:!items-end md:!justify-between md:px-0"
            >
              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-1">
                  {artist && artist.isVerified && (
                    <Verified className="size-5" />
                  )}
                  Artist
                </div>

                <h1
                  style={
                    {
                      // computed font size based on length of artist name
                    }
                  }
                  className="baseFlex text-3xl font-semibold tracking-tight text-pink-50 md:left-8 md:top-14 md:text-4xl"
                >
                  {artist ? artist.name : query.name}
                </h1>
              </div>

              <div className="baseFlex gap-4 font-medium sm:text-lg">
                <div className="baseFlex gap-2">
                  <BsMusicNoteBeamed className="size-4 sm:size-5" />
                  <span>{artist ? artist.totalTabs : 0}</span>
                  <span>
                    {artist
                      ? artist.totalTabs === 1
                        ? "Song"
                        : "Songs"
                      : "Songs"}
                  </span>
                </div>

                <Separator orientation="vertical" className="h-6 w-[1px]" />

                <div className="baseFlex gap-2">
                  <FaEye className="size-4 sm:size-5" />
                  <span>{artist ? artist.totalViews : 0}</span>
                  <span>
                    {artist
                      ? artist.totalViews === 1
                        ? "View"
                        : "Views"
                      : "Views"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SearchResults
          isFetchingArtistId={isFetchingArtist}
          relatedArtists={relatedArtists}
          isFetchingRelatedArtists={isFetchingRelatedArtists}
        />
      </div>
    </motion.div>
  );
}

export default ArtistProfile;
