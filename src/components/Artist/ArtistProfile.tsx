import { useRouter } from "next/navigation";
import { useRouteLocation } from "~/hooks/useRouteLocation";
import { motion } from "framer-motion";

import { Fragment, useEffect } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye } from "react-icons/fa";
import SearchResults from "~/components/Search/SearchResults";
import styles from "~/components/Search/SearchResults.module.css";
import Verified from "~/components/ui/icons/Verified";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import { decodeRouteSegment } from "~/utils/decodeRouteSegment";
import { formatNumber } from "~/utils/formatNumber";
import getDynamicFontSize from "~/utils/getDynamicFontSize";

function ArtistProfile({ uniqueKey }: { uniqueKey: string }) {
  const { pathname, query } = useRouteLocation();
  const router = useRouter();
  const utils = api.useContext();
  // The pathname preserves the original segment encoding, so decode only once.
  const name = decodeRouteSegment(pathname.split("/")[2] ?? "");
  const id = query.id ? Number(query.id) : undefined;

  const { data: artist, isError } = api.artist.getByNameAndOrId.useQuery(
    { id, name },
    { enabled: id !== undefined || Boolean(name) },
  );
  const loading = artist === undefined && !isError;

  const { data: relatedArtists, isFetching: isFetchingRelatedArtists } =
    api.search.getRelatedArtistsByName.useQuery(name, {
      enabled: artist === null,
    });

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  useEffect(() => {
    if (!artist || !name || id !== undefined) return;

    // The canonical route can render the same artist immediately during navigation.
    utils.artist.getByNameAndOrId.setData({ id: artist.id, name }, artist);
    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = `/artist/${encodeURIComponent(name)}/${artist.id}/filters`;
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  }, [artist, id, name, router, utils]);

  const displayName = artist?.name ?? name;
  const stats = [
    { label: "Song", Icon: BsMusicNoteBeamed, value: artist?.totalTabs ?? 0 },
    { label: "View", Icon: FaEye, value: artist?.totalViews ?? 0 },
  ];

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`${styles.pageShell} baseVertFlex my-12 min-h-[650px] !justify-start md:my-24 md:p-0`}
    >
      <div className="baseVertFlex w-full gap-4">
        <div
          aria-busy={loading}
          className="baseVertFlex w-full !items-start gap-2 px-4 md:!flex-row md:!items-end md:!justify-between md:px-0"
        >
          <div className="baseVertFlex min-w-0 max-w-full !items-start gap-1 sm:gap-0">
            <div className="baseFlex h-6 gap-2">
              Artist
              {artist?.isVerified && <Verified className="size-5" />}
            </div>
            <h1
              title={displayName}
              style={{
                fontSize: getDynamicFontSize(
                  displayName,
                  isAboveMediumViewportWidth ? 26 : 20,
                  isAboveMediumViewportWidth ? 36 : 30,
                  50,
                ),
              }}
              className="h-10 max-w-full truncate font-semibold leading-10 tracking-tight md:h-12 md:leading-[48px]"
            >
              {displayName}
            </h1>
          </div>

          <div className="baseFlex h-7 shrink-0 gap-2 font-medium sm:gap-4 sm:text-lg">
            {stats.map(({ label, Icon, value }, index) => (
              <Fragment key={label}>
                {index > 0 && (
                  <Separator
                    orientation="vertical"
                    className="h-6 w-px bg-foreground/50"
                  />
                )}
                <div className="baseFlex gap-2">
                  <Icon aria-hidden="true" className="size-4 sm:size-5" />
                  <span
                    className="baseFlex w-[4ch] !justify-end tabular-nums"
                    title={loading ? undefined : value.toLocaleString()}
                  >
                    {loading ? (
                      <span
                        aria-hidden="true"
                        className="pulseAnimation h-5 w-full rounded-md"
                      />
                    ) : (
                      formatNumber(value)
                    )}
                  </span>
                  <span className="w-[3.25rem]">
                    {value === 1 ? label : `${label}s`}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <SearchResults
          isFetchingArtistId={loading || (Boolean(artist) && id === undefined)}
          relatedArtists={relatedArtists}
          isFetchingRelatedArtists={isFetchingRelatedArtists}
        />
      </div>
    </motion.div>
  );
}

export default ArtistProfile;
