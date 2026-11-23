import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppPreferencesStore } from "~/stores/AppPreferencesStore";

import { useEffect } from "react";
import { IoIosShareAlt } from "react-icons/io";
import { MdModeEditOutline } from "react-icons/md";
import PrintTabButton from "~/components/Tab/Print/PrintTabButton";
import { Badge } from "~/components/ui/badge";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { Button } from "~/components/ui/button";
import DifficultyBars from "~/components/ui/DifficultyBars";
import Verified from "~/components/ui/icons/Verified";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import RateTab from "~/components/ui/RateTab";
import { useTabStoreShallow } from "~/stores/TabStore";
import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import { genreColors } from "~/utils/genreColors";
import getDynamicFontSize from "~/utils/getDynamicFontSize";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { QuarterNote } from "~/utils/noteLengthIcons";
import { getTuningName, normalizeTuningValue } from "~/utils/tunings";
import classes from "../TabMetadata.module.css";

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

function StaticTabMetadata() {
  const { userId } = useAuth();
  const isScreenshot = usePathname().startsWith("/screenshot-preview/");
  const router = useRouter();

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
    tuning: rawTuning,
    bpm,
    key,
    difficulty,
    capo,
    isLoadingARoute,
  } = useTabStoreShallow((state) => ({
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
  }));
  const tuning = normalizeTuningValue(rawTuning);
  const theme = useAppPreferencesStore((state) => state.theme);
  const editButtonVariant = theme === "light" ? "headerGhost" : "default";

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

  const isMetaFieldsLoading = fetchingTabCreator || !dynamicMetadata;

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

  const editButton =
    userId && createdByUserId === userId ? (
      <Button
        variant={editButtonVariant}
        disabled={isLoadingARoute}
        className="baseFlex h-10 gap-2 whitespace-nowrap"
        onClick={() => void router.push(`/tab/${id}/edit`)}
      >
        Edit
        <MdModeEditOutline className="size-5" />
      </Button>
    ) : null;

  return (
    <div className="min-h-[100px] w-full">
      <div className="w-full border-b bg-accent px-4 py-4 text-primary-foreground shadow-md md:rounded-t-xl lg:px-6">
        <div className="flex w-full min-w-0 flex-col items-start gap-4 xs:flex-row xs:items-end lg:items-center">
          <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="baseFlex min-w-0 max-w-full flex-col !items-start !justify-start gap-2 lg:flex-1 lg:flex-row lg:flex-wrap lg:!items-baseline">
              <h1
                style={{ fontSize: getDynamicFontSize(title, 20, 24, 50) }}
                className="max-w-full break-words font-bold [overflow-wrap:anywhere]"
              >
                {title}
              </h1>
              {artistName && (
                <div className="baseFlex min-w-0 max-w-full !justify-start gap-2 text-lg">
                  by
                  <Button
                    role="link"
                    variant="link"
                    nativeButton={false}
                    render={
                      <Link
                        prefetch={false}
                        href={`/artist/${encodeURIComponent(artistName)}/${artistId}/filters`}
                        className="baseFlex !h-6 min-w-0 !p-0"
                      >
                        <span className="baseFlex min-w-0 gap-1 text-lg font-medium">
                          {artistIsVerified && (
                            <Verified className="mr-[2px] size-5 shrink-0" />
                          )}
                          <span className="truncate lg:max-w-[300px]">
                            {artistName}
                          </span>
                        </span>
                      </Link>
                    }
                  />
                </div>
              )}
            </div>

            <div className="baseFlex max-w-full flex-wrap !justify-start gap-3 lg:shrink-0 lg:flex-nowrap">
              {editButton && (
                <div className="hidden lg:block">{editButton}</div>
              )}
              <div className="relative h-10 w-28 shrink-0">
                <AnimatePresence initial={false}>
                  {dynamicMetadata ? (
                    <motion.div
                      key="rating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="baseFlex absolute inset-0"
                    >
                      <RateTab
                        tabId={id}
                        averageRating={dynamicMetadata.averageRating}
                        ratingsCount={dynamicMetadata.ratingsCount}
                        currentUser={currentUser}
                        userRating={dynamicMetadata.userRating}
                        tabCreatorUserId={createdByUserId ?? undefined}
                        customClassName={
                          classes.rating + " baseFlex w-28 gap-2 px-3 py-1"
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loading"
                      exit={{ opacity: 0 }}
                      className="pulseAnimation absolute inset-0 rounded-md"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="relative h-10 w-10 shrink-0 md:w-36">
                <AnimatePresence initial={false}>
                  {dynamicMetadata ? (
                    <motion.div
                      key="bookmark"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="baseFlex absolute inset-0"
                    >
                      <BookmarkToggle
                        tabId={id}
                        createdByUserId={createdByUserId}
                        currentUser={currentUser}
                        showText
                        isBookmarked={dynamicMetadata.bookmarked}
                        customClassName={
                          classes.bookmark +
                          " baseFlex h-10 w-full gap-2 p-2 md:px-3 md:py-1"
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loading"
                      exit={{ opacity: 0 }}
                      className="pulseAnimation absolute inset-0 rounded-md"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button
                  aria-label="Share tab"
                  variant="secondary"
                  size="icon"
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
                {!isScreenshot && <PrintTabButton />}
              </div>
            </div>
          </div>
          {editButton && <div className="lg:hidden">{editButton}</div>}
        </div>
      </div>

      <div className={`${classes.viewingMetadataContainer}`}>
        <div className={`${classes.descriptionGrid}`}>
          <div
            className={`${classes.description} baseVertFlex !items-start gap-1`}
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
            className={`${classes.createdBy} baseVertFlex mt-[2px] w-full !items-start gap-0.5`}
          >
            <div className="font-semibold">Created by</div>
            <AnimatePresence mode="wait" initial={false}>
              {isMetaFieldsLoading ? (
                <motion.div
                  key="createdByAndDateLoading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-6 w-48"
                >
                  <div className="pulseAnimation size-full rounded-md" />
                </motion.div>
              ) : (
                <motion.div
                  key="createdByAndDateLoaded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="baseFlex h-6 gap-1.5"
                >
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
                      {tabCreator ? (
                        <span className="max-w-[100%] truncate text-left">
                          {tabCreator.username}
                        </span>
                      ) : (
                        <span className="italic text-foreground/75">
                          Anonymous
                        </span>
                      )}
                    </Link>
                  </Button>

                  <div className="mt-[2px] whitespace-nowrap text-sm opacity-80">
                    {`on ${new Intl.DateTimeFormat("en-US").format(createdAt ?? new Date())}`}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`${classes.pageViews} self-end text-sm opacity-80`}>
            <AnimatePresence mode="wait" initial={false}>
              {!isMetaFieldsLoading && dynamicMetadata ? (
                <motion.div
                  key={`dynamicPageViews-${dynamicMetadata.pageViews}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                  }}
                  className="baseFlex min-w-[78px] !justify-end gap-1"
                >
                  {formatNumber(dynamicMetadata.pageViews)}
                  <span>view{dynamicMetadata.pageViews === 1 ? "" : "s"}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="dynamicPageViewsLoading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-5 min-w-[78px]"
                >
                  <div className="pulseAnimation size-full rounded-md"></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={
            classes.separator +
            " my-4 h-px w-full shrink-0 rounded-full bg-border lg:mx-4 lg:my-0 lg:h-full lg:w-px xl:mx-8"
          }
        />

        <div className={`${classes.metadataGrid}`}>
          <div className={`${classes.genre} baseVertFlex !items-start gap-1`}>
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

          <div className={`${classes.tuning} baseVertFlex !items-start gap-1`}>
            <div className="font-semibold">Tuning</div>
            {getTuningName(tuning) ?? (
              <PrettyTuning
                tuning={tuning}
                displayWithFlex
                noteClass="text-base"
                accidentalClass="text-sm"
              />
            )}
          </div>

          <div className={`${classes.capo} baseVertFlex !items-start gap-1`}>
            <p className="font-semibold">Capo</p>
            <p className="whitespace-nowrap text-nowrap">
              {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
            </p>
          </div>

          <div className={`${classes.tempo} baseVertFlex !items-start gap-1`}>
            <div className="font-semibold">Tempo</div>
            <div className="baseFlex">
              <QuarterNote className="-ml-1 size-4" />
              <span>{bpm === -1 ? "" : bpm}</span>
              <span className="ml-1">BPM</span>
            </div>
          </div>

          <div
            className={`${classes.difficulty} baseVertFlex !items-start gap-1`}
          >
            <div className="font-semibold">Difficulty</div>
            <div className="baseFlex gap-2">
              <DifficultyBars difficulty={difficulty} />
              <span>{DIFFICULTIES[difficulty - 1]}</span>
            </div>
          </div>

          <div className={`${classes.key} baseVertFlex !items-start gap-1`}>
            <div className="font-semibold">Key</div>
            <p>{key ?? "Not specified"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaticTabMetadata;
