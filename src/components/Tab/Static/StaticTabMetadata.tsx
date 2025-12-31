import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MdModeEditOutline } from "react-icons/md";
import { IoIosShareAlt } from "react-icons/io";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import { genreColors } from "~/utils/genreColors";
import { tuningNotesToName } from "~/utils/tunings";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import classes from "../TabMetadata.module.css";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { QuarterNote } from "~/utils/noteLengthIcons";
import RateTab from "~/components/ui/RateTab";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { formatNumber } from "~/utils/formatNumber";
import Verified from "~/components/ui/icons/Verified";
import getDynamicFontSize from "~/utils/getDynamicFontSize";
import { Badge } from "~/components/ui/badge";

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

function StaticTabMetadata() {
  const { userId } = useAuth();
  const { push, asPath } = useRouter();

  const {
    id,
    createdByUserId,
    createdAt,
    title,
    artistId,
    artistName,
    artistIsVerified,
    description,
    genre,
    tuning,
    bpm,
    key,
    difficulty,
    capo,
    isLoadingARoute,
    viewportLabel,
  } = useTabStore((state) => ({
    id: state.id,
    createdByUserId: state.createdByUserId,
    createdAt: state.createdAt,
    title: state.title,
    artistId: state.artistId,
    artistName: state.artistName,
    artistIsVerified: state.artistIsVerified,
    description: state.description,
    genre: state.genre,
    tuning: state.tuning,
    bpm: state.bpm,
    key: state.key,
    difficulty: state.difficulty,
    capo: state.capo,
    isLoadingARoute: state.isLoadingARoute,
    viewportLabel: state.viewportLabel,
  }));

  const { data: dynamicMetadata } =
    api.tab.getRatingBookmarkAndViewCount.useQuery(id, {
      enabled: true,
    });

  const { mutate: processPageView } = api.tab.processPageView.useMutation({
    onError: (e) => {
      console.error("Error processing page view:", e);
    },
  });

  // current user
  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  // owner of tab
  const { data: tabCreator, isFetching: fetchingTabCreator } =
    api.user.getById.useQuery(createdByUserId!, {
      enabled: !!createdByUserId,
    });

  // hack to prevent createdAt <span> from moving around when <Drawer> is open on mobile
  const [disableCreatedAtLayout, setDisableCreatedAtLayout] = useState(false);

  const overMediumViewportThreshold = useViewportWidthBreakpoint(768);

  useEffect(() => {
    if (disableCreatedAtLayout || !tabCreator) return;

    setTimeout(() => {
      setDisableCreatedAtLayout(true);
    }, 500);
  }, [tabCreator, disableCreatedAtLayout]);

  useEffect(() => {
    let processPageViewTimeout: NodeJS.Timeout | null = null;

    processPageViewTimeout = setTimeout(() => {
      processPageView({
        tabId: id,
        tabCreatorUserId: createdByUserId ?? undefined,
        artistId: artistId ?? undefined,
      });
    }, 5000); // user must be on page for at least 5 seconds before processing page view

    return () => {
      if (processPageViewTimeout) {
        clearTimeout(processPageViewTimeout);
      }
    };
  }, [artistId, createdByUserId, id, processPageView]);

  return (
    <div className="min-h-[100px] w-full">
      <div className="baseVertFlex !flex-start w-full !items-start gap-2 border-b bg-accent px-4 py-4 text-primary-foreground shadow-md sm:!flex-row sm:!items-center sm:gap-4 md:rounded-t-xl tablet:!px-6">
        {overMediumViewportThreshold ? (
          <div className="baseFlex w-full !justify-between gap-4">
            <div className="baseFlex !justify-start gap-2">
              <div
                style={{
                  fontSize: getDynamicFontSize(title, 20, 24, 50),
                }}
                className="max-w-[100%] text-wrap font-bold"
              >
                {title}
              </div>

              {artistName && (
                <div className="baseFlex gap-2 text-lg">
                  by
                  <Button variant={"link"} asChild>
                    <Link
                      prefetch={false}
                      href={`/artist/${encodeURIComponent(artistName)}/${artistId}/filters`}
                      className="!h-6 !p-0"
                    >
                      <div className="baseFlex gap-1 text-lg font-medium">
                        {artistIsVerified && (
                          <Verified className="size-5 shrink-0" />
                        )}
                        <span className="max-w-[300px] truncate">
                          {artistName}
                        </span>
                      </div>
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="baseFlex shrink-0 gap-3">
              {userId && createdByUserId === userId && (
                <Button
                  disabled={isLoadingARoute}
                  className="baseFlex gap-2 whitespace-nowrap text-nowrap"
                  onClick={() => void push(`/tab/${id}/edit`)}
                >
                  Edit
                  <MdModeEditOutline className="size-5" />
                </Button>
              )}

              {!asPath.includes("create") && !asPath.includes("edit") && (
                <AnimatePresence mode="popLayout">
                  {dynamicMetadata ? (
                    <motion.div
                      key={"crossfadeRateTab"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex h-10 w-28"
                    >
                      <RateTab
                        tabId={id}
                        averageRating={dynamicMetadata.averageRating}
                        ratingsCount={dynamicMetadata.ratingsCount}
                        currentUser={currentUser}
                        userRating={dynamicMetadata.userRating}
                        tabCreatorUserId={createdByUserId ?? undefined}
                        customClassName={`${classes.rating} baseFlex w-28 gap-2 px-3 py-1`}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"crossfadeRateTabPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex pulseAnimation h-10 w-28 rounded-md bg-primary-foreground/50"
                    ></motion.div>
                  )}

                  {dynamicMetadata ? (
                    <motion.div
                      key={"crossfadeBookmarkToggle"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex h-10 w-36"
                    >
                      <BookmarkToggle
                        tabId={id}
                        createdByUserId={createdByUserId}
                        currentUser={currentUser}
                        showText={true}
                        isBookmarked={dynamicMetadata.bookmarked}
                        customClassName={`${classes.bookmark} baseFlex w-full gap-2 px-3 py-1`}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"crossfadeBookmarkTogglePlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex pulseAnimation h-10 w-36 rounded-md bg-primary-foreground/50"
                    ></motion.div>
                  )}

                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    disabled={isLoadingARoute}
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title,
                          text: `Check out this tab I found on Autostrum!`,
                          url: `${window.location.origin}/tab/${id}/${encodeURIComponent(title)}`,
                        });
                      } catch (error) {
                        console.error("Error sharing tab:", error);
                      }
                    }}
                  >
                    <IoIosShareAlt className="size-5" />
                  </Button>
                </AnimatePresence>
              )}
            </div>
          </div>
        ) : (
          <div className="baseVertFlex relative w-full !items-start gap-4 sm:!flex-row sm:!items-end">
            <div className="baseVertFlex w-full !items-start gap-4">
              <div className="baseVertFlex w-full !items-start gap-2">
                <div
                  style={{
                    fontSize: getDynamicFontSize(title, 20, 24, 50),
                  }}
                  className="text-wrap font-bold"
                >
                  {title}
                </div>

                {artistName && (
                  <div className="baseFlex w-full max-w-[100%] !justify-start gap-1.5 text-lg">
                    by
                    <Button variant={"link"} asChild>
                      <Link
                        prefetch={false}
                        href={`/artist/${encodeURIComponent(artistName)}/${artistId}/filters`}
                        className="baseFlex !h-6 !justify-start !p-0"
                      >
                        <div className="baseFlex w-full gap-1 text-lg font-medium">
                          {artistIsVerified && (
                            <Verified className="size-5 shrink-0" />
                          )}
                          <span className="max-w-full truncate">
                            {artistName}
                          </span>
                        </div>
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                <div className="baseFlex gap-3">
                  {dynamicMetadata ? (
                    <motion.div
                      key={"crossfadeRateTab"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex h-10 w-28"
                    >
                      <RateTab
                        tabId={id}
                        averageRating={dynamicMetadata.averageRating}
                        ratingsCount={dynamicMetadata.ratingsCount}
                        currentUser={currentUser}
                        userRating={dynamicMetadata.userRating}
                        tabCreatorUserId={createdByUserId ?? undefined}
                        customClassName={`${classes.rating} baseFlex w-28 gap-2 px-3 py-1`}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"crossfadeRateTabPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex pulseAnimation h-10 w-28 rounded-md bg-primary-foreground/50"
                    ></motion.div>
                  )}

                  {dynamicMetadata ? (
                    <motion.div
                      key={"crossfadeBookmarkToggle"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex h-10 w-36"
                    >
                      <BookmarkToggle
                        tabId={id}
                        createdByUserId={createdByUserId}
                        currentUser={currentUser}
                        showText={true}
                        isBookmarked={dynamicMetadata.bookmarked}
                        customClassName={`${classes.bookmark} baseFlex w-full gap-2 px-3 py-1`}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"crossfadeBookmarkTogglePlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex pulseAnimation h-10 w-36 rounded-md bg-primary-foreground/50"
                    ></motion.div>
                  )}

                  <Button
                    variant={"secondary"}
                    disabled={isLoadingARoute}
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title,
                          text: `Check out this tab I found on Autostrum!`,
                          url: `${window.location.origin}/tab/${id}/${encodeURIComponent(title)}`,
                        });
                      } catch (error) {
                        console.error("Error sharing tab:", error);
                      }
                    }}
                    className="!p-2"
                  >
                    <IoIosShareAlt className="size-5" />
                  </Button>
                </div>
              </AnimatePresence>
            </div>

            {userId && createdByUserId === userId && (
              <Button
                disabled={isLoadingARoute}
                className="baseFlex gap-2"
                onClick={() => void push(`/tab/${id}/edit`)}
              >
                Edit
                <MdModeEditOutline className="size-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className={`${classes.viewingMetadataContainer}`}>
        <div className={`${classes.descriptionGrid}`}>
          <div
            className={`${classes.description} baseVertFlex !items-start gap-2`}
          >
            <div className="font-semibold">Description</div>

            <div className="baseVertFlex !items-start !justify-start gap-2 text-wrap break-words text-sm md:text-base lg:min-h-[44px]">
              {description ? (
                description.split("\n").map((paragraph, index) => (
                  <p key={index} className="text-wrap break-words">
                    {paragraph}
                  </p>
                ))
              ) : (
                <span className="italic text-foreground/70">
                  No description provided.
                </span>
              )}
            </div>
          </div>

          <div
            className={`${classes.createdBy} baseVertFlex mt-[2px] w-full !items-start gap-1`}
          >
            <div className="font-semibold">Created by</div>
            <div className="baseFlex h-6 gap-2">
              <Button
                disabled={!tabCreator}
                variant={"link"}
                className="h-6 !py-0 px-0 text-base"
              >
                <Link
                  prefetch={false}
                  href={`/user/${tabCreator?.username ?? ""}/filters`}
                  className="baseFlex gap-2"
                >
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={fetchingTabCreator ? "loading" : "loaded"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="baseFlex"
                    >
                      {fetchingTabCreator ? (
                        <div className="pulseAnimation col-start-1 col-end-2 row-start-1 row-end-2 h-6 w-32 rounded-md bg-foreground/50"></div>
                      ) : (
                        <>
                          {tabCreator ? (
                            <span className="col-start-1 col-end-2 row-start-1 row-end-2 max-w-[100%] truncate">
                              {tabCreator.username}
                            </span>
                          ) : (
                            <span className="italic text-foreground/75">
                              Anonymous
                            </span>
                          )}
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Link>
              </Button>

              <motion.div
                layout={!disableCreatedAtLayout}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="mt-[2px] whitespace-nowrap text-sm opacity-80"
              >
                {`on ${new Intl.DateTimeFormat("en-US").format(createdAt ?? new Date())}`}
              </motion.div>
            </div>
          </div>

          <div className={`${classes.pageViews} self-end text-sm opacity-80`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={"dynamicPageViews"}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{
                  duration: 0.25,
                }}
                className="baseFlex gap-1"
              >
                {dynamicMetadata?.pageViews &&
                  formatNumber(dynamicMetadata?.pageViews)}
                <span>view{dynamicMetadata?.pageViews === 1 ? "" : "s"}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <Separator
          orientation={
            viewportLabel.includes("mobile") ? "horizontal" : "vertical"
          }
          className={`${classes.separator} my-4 h-[2px] w-full bg-gray/50 lg:mx-4 lg:my-0 lg:h-full lg:w-[1px] xl:mx-8`}
        />

        <div className={`${classes.metadataGrid}`}>
          <div className={`${classes.genre} baseVertFlex !items-start gap-2`}>
            <div className="font-semibold">Genre</div>
            <Badge
              style={{
                backgroundColor: genreColors
                  .get(genre)
                  ?.replace(/\)$/, " / 0.7)"),
                border: "1px solid",
                borderColor: genreColors.get(genre),
              }}
              className="px-4 py-2.5 text-xs text-primary-foreground"
            >
              {genre}
            </Badge>
          </div>

          <div className={`${classes.tuning} baseVertFlex !items-start gap-2`}>
            <div className="font-semibold">Tuning</div>
            {tuningNotesToName[
              tuning.toLowerCase() as keyof typeof tuningNotesToName
            ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
          </div>

          <div className={`${classes.capo} baseVertFlex !items-start gap-2`}>
            <p className="font-semibold">Capo</p>
            <p className="whitespace-nowrap text-nowrap">
              {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
            </p>
          </div>

          <div className={`${classes.tempo} baseVertFlex !items-start gap-2`}>
            <div className="font-semibold">Tempo</div>
            <div className="baseFlex">
              <QuarterNote className="-ml-1 size-5" />
              <span>{bpm === -1 ? "" : bpm}</span>
              <span className="ml-1">BPM</span>
            </div>
          </div>

          <div
            className={`${classes.difficulty} baseVertFlex !items-start gap-2`}
          >
            <div className="font-semibold">Difficulty</div>
            <div className="baseFlex gap-2">
              <DifficultyBars difficulty={difficulty} />
              <span>{DIFFICULTIES[difficulty - 1]}</span>
            </div>
          </div>

          <div className={`${classes.key} baseVertFlex !items-start gap-2`}>
            <div className="font-semibold">Key</div>
            <p>{key ?? "Not specified"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaticTabMetadata;
