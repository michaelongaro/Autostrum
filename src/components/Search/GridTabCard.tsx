import { useAuth } from "@clerk/nextjs";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AiOutlineUser } from "react-icons/ai";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { shallow } from "zustand/shallow";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import type {
  MinimalTabRepresentation,
  TabWithLikes,
} from "~/server/api/routers/tab";
import {
  useTabStore,
  type Chord,
  type Section,
  type SectionProgression,
} from "~/stores/TabStore";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { genreList } from "~/utils/genreList";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { type InfiniteQueryParams } from "./SearchResults";

interface GridTabCard {
  minimalTab: MinimalTabRepresentation;
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  largeVariant?: boolean;
  hideLikesAndPlayButtons?: boolean;
  infiniteQueryParams?: InfiniteQueryParams;
  refetchTab?: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
    // @ts-expect-error asdf
  ) => Promise<QueryObserverResult<TData, TError>>;
}

const GridTabCard = forwardRef<HTMLDivElement, GridTabCard>(
  (
    {
      refetchTab,
      minimalTab,
      selectedPinnedTabId,
      setSelectedPinnedTabId,
      largeVariant,
      hideLikesAndPlayButtons,
      infiniteQueryParams,
    },
    ref
  ) => {
    const { userId } = useAuth();
    const { asPath } = useRouter();

    const [fullTab, setFullTab] = useState<TabWithLikes>();
    const [tabScreenshot, setTabScreenshot] = useState<string>();
    const [tabScreenshotLoaded, setTabScreenshotLoaded] = useState(false);
    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const [forceShowLoadingSpinner, setForceShowLoadingSpinner] =
      useState(false);
    const previewRef = useRef<HTMLAnchorElement>(null);

    const isAboveExtraSmallViewportWidth = useViewportWidthBreakpoint(450);

    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);

    const {
      audioMetadata,
      currentInstrument,
      id,
      setId,
      setTabData,
      setSectionProgression,
      setHasRecordedAudio,
      setTuning,
      setBpm,
      setChords,
      setCapo,
      recordedAudioBuffer,
      playTab,
      pauseAudio,
      setFetchingFullTabData,
      showingAudioControls,
      setShowingAudioControls,
    } = useTabStore(
      (state) => ({
        audioMetadata: state.audioMetadata,
        currentInstrument: state.currentInstrument,
        id: state.id,
        setId: state.setId,
        setTabData: state.setTabData,
        setSectionProgression: state.setSectionProgression,
        setHasRecordedAudio: state.setHasRecordedAudio,
        setTuning: state.setTuning,
        setBpm: state.setBpm,
        setChords: state.setChords,
        setCapo: state.setCapo,
        recordedAudioBuffer: state.recordedAudioBuffer,
        playTab: state.playTab,
        pauseAudio: state.pauseAudio,
        setFetchingFullTabData: state.setFetchingFullTabData,
        showingAudioControls: state.showingAudioControls,
        setShowingAudioControls: state.setShowingAudioControls,
      }),
      shallow
    );

    const { data: currentArtist, refetch: refetchCurrentArtist } =
      api.artist.getByIdOrUsername.useQuery(
        {
          userId: userId as string,
        },
        {
          enabled: !!userId,
        }
      );

    const {
      data: tabCreator,
      isFetching: fetchingTabCreator,
      refetch: refetchTabCreator,
    } = api.artist.getByIdOrUsername.useQuery(
      {
        userId: minimalTab.createdById as string,
      },
      {
        enabled: !!minimalTab.createdById,
      }
    );

    const { mutate: fetchFullTab } =
      api.tab.getTabByIdMutateVariation.useMutation({
        onSuccess: (fullTab) => {
          if (fullTab) {
            // if user clicked play on another tab before this
            // tab finished loading, then don't autoplay this tab
            if (fullTab.id !== id) return;

            // setting store w/ this tab's data
            setHasRecordedAudio(fullTab.hasRecordedAudio); // used specifically for artist recorded audio fetching purposes
            setTabData(fullTab.tabData as unknown as Section[]);
            setSectionProgression(
              fullTab.sectionProgression as unknown as SectionProgression[]
            );
            setTuning(fullTab.tuning);
            setBpm(fullTab.bpm);
            setChords(fullTab.chords as unknown as Chord[]);
            setCapo(fullTab.capo);

            if (audioMetadata.tabId !== fullTab.id) {
              pauseAudio(true);
            }

            setTimeout(
              () => {
                void playTab({
                  tabId: fullTab.id,
                  location: null,
                });
                setForceShowLoadingSpinner(false);
              },
              showingAudioControls ? 150 : 500
            ); // hacky: trying to allow time for pauseAudio to finish and "flush out" state

            setFullTab(fullTab);
            setFetchingFullTabData(false);
          }
        },
        onError: (e) => {
          //  const errorMessage = e.data?.zodError?.fieldErrors.content;
          //  if (errorMessage && errorMessage[0]) {
          //    toast.error(errorMessage[0]);
          //  } else {
          //    toast.error("Failed to post! Please try again later.");
          //  }
        },
      });

    useEffect(() => {
      if (tabScreenshot) return;

      const fetchImage = async () => {
        try {
          const res = await fetch(`/api/getTabScreenshot/${minimalTab.id}`);
          if (!res.ok) {
            console.error("Failed to fetch image");
            return;
          }
          const blob = await res.blob();

          const reader = new FileReader();
          reader.onloadend = function () {
            if (typeof reader?.result === "string") {
              setTabScreenshot(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Error fetching image:", error, minimalTab.id);
        }
      };

      void fetchImage();
    }, [tabScreenshot, minimalTab.id]);

    return (
      <motion.div
        ref={ref} // hoping that if ref is undefined it will just ignore it
        key={`${minimalTab.id}gridTabCard`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          width: `${
            largeVariant ? 400 : isAboveExtraSmallViewportWidth ? 317 : 270
          }px`, // accounts for border (may need to add a few px to custom width now that I think about it)
          // height: `${width ? 183 : 146}px`,
        }}
        className="baseVertFlex !flex-nowrap rounded-md border-2 shadow-md"
      >
        {/* tab preview */}
        <Link
          ref={previewRef}
          href={`/tab/${minimalTab.id}`}
          style={{
            width: largeVariant
              ? 396
              : isAboveExtraSmallViewportWidth
              ? 313
              : 266,
            height: largeVariant
              ? 185
              : isAboveExtraSmallViewportWidth
              ? 146
              : 124,
          }}
          className="relative w-full cursor-pointer rounded-t-md transition-all hover:brightness-90 active:brightness-[0.8]"
        >
          {/* tab preview screenshot */}
          <div className="grid grid-cols-1 grid-rows-1">
            {tabScreenshot && (
              <Image
                src={tabScreenshot}
                alt={`screenshot of ${minimalTab.title}`}
                width={
                  largeVariant
                    ? 396
                    : isAboveExtraSmallViewportWidth
                    ? 313
                    : 266
                }
                height={
                  largeVariant
                    ? 185
                    : isAboveExtraSmallViewportWidth
                    ? 146
                    : 124
                }
                onLoadingComplete={() => {
                  setTabScreenshotLoaded(true);
                }}
                style={{
                  opacity: tabScreenshotLoaded ? 1 : 0,
                }}
                className="col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-md object-cover object-center transition-opacity"
              />
            )}
            <div
              style={{
                opacity: !tabScreenshotLoaded ? 1 : 0,
                zIndex: !tabScreenshotLoaded ? 1 : -1,
                width: largeVariant
                  ? 396
                  : isAboveExtraSmallViewportWidth
                  ? 313
                  : 266,
                height: largeVariant
                  ? 185
                  : isAboveExtraSmallViewportWidth
                  ? 146
                  : 124,
              }}
              className={`col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-md bg-pink-300 transition-opacity
                              ${!tabScreenshotLoaded ? "animate-pulse" : ""}
                            `}
            ></div>
          </div>
        </Link>

        <Separator />

        <div className="baseVertFlex lightestGlassmorphic w-full !justify-between gap-2 rounded-b-md !shadow-none">
          {/* title and date + genre */}
          {/* hmmm what about the nowrap here, test w/ larget titles */}
          <div className="baseVertFlex w-full !flex-nowrap !items-start gap-0 px-2">
            <Button variant={"link"} asChild>
              <Link
                href={`/tab/${minimalTab.id}`}
                className="h-6 !p-0 !font-semibold md:h-8 md:!text-lg"
              >
                <p>{minimalTab.title}</p>
              </Link>
            </Button>

            <div className="baseFlex !flex-nowrap gap-2">
              <p className="text-sm text-pink-50/90">
                {formatDate(minimalTab.updatedAt ?? minimalTab.createdAt)}
              </p>

              {asPath.includes("genreId") &&
                selectedPinnedTabId === minimalTab.id && (
                  <Badge className="bg-green-600">Pinned</Badge>
                )}

              {!asPath.includes("genreId") && (
                <div className="baseFlex gap-2">
                  <Badge
                    style={{
                      backgroundColor: genreList[minimalTab.genreId]?.color,
                    }}
                  >
                    {genreList[minimalTab.genreId]?.name}
                  </Badge>
                  {selectedPinnedTabId === minimalTab.id && (
                    <Badge className="bg-green-600">Pinned</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* artist/pin button and (likes & play button) */}
          <div className="baseFlex w-full !flex-nowrap !items-end !justify-between gap-2">
            {/* not sure if the min-w-[112px] is vestigial or not */}
            <div
              className={`baseFlex w-1/2 !items-start !justify-start gap-2 pl-2 ${
                hideLikesAndPlayButtons ? "" : "mb-1"
              }`}
            >
              {!asPath.includes("/artist") &&
                !asPath.includes("/preferences") &&
                !asPath.includes("/tabs") &&
                asPath !== "/explore" && (
                  <Button
                    disabled={!tabCreator}
                    {...(tabCreator && { asChild: true })}
                    variant={"ghost"}
                    className="h-full px-3 py-1"
                  >
                    <Link
                      href={`/artist/${tabCreator?.username ?? ""}`}
                      className="baseFlex !flex-nowrap !justify-start gap-2"
                    >
                      <div className="grid min-h-[32px] min-w-[32px] grid-cols-1 grid-rows-1">
                        {tabCreator || fetchingTabCreator ? (
                          <>
                            {tabCreator && (
                              <Image
                                src={tabCreator.profileImageUrl}
                                alt={`${
                                  tabCreator?.username ?? "Anonymous"
                                }'s profile image`}
                                width={75}
                                height={75}
                                quality={100}
                                onLoadingComplete={() => {
                                  setProfileImageLoaded(true);
                                }}
                                style={{
                                  opacity: profileImageLoaded ? 1 : 0,
                                  height: "2rem",
                                  width: "2rem",
                                }}
                                className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full object-cover object-center transition-opacity"
                              />
                            )}
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
                          <div className="baseFlex h-8 w-8 rounded-full border-[1px] shadow-md">
                            <AiOutlineUser className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      {tabCreator || fetchingTabCreator ? (
                        <div className="grid grid-cols-1 grid-rows-1">
                          <>
                            {tabCreator ? (
                              <span className="col-start-1 col-end-2 row-start-1 row-end-2 max-w-[100%] truncate ">
                                {tabCreator.username}
                              </span>
                            ) : (
                              <div className="col-start-1 col-end-2 row-start-1 row-end-2 h-5 w-16 animate-pulse rounded-md bg-pink-300 sm:w-20 "></div>
                            )}
                          </>
                        </div>
                      ) : (
                        <span className="italic text-pink-50">Anonymous</span>
                      )}
                    </Link>
                  </Button>
                )}
            </div>

            {!hideLikesAndPlayButtons ? (
              <div className="baseFlex w-1/2 !flex-nowrap !justify-evenly rounded-tl-md border-l-2 border-t-2">
                {/* likes button */}
                <LikeAndUnlikeButton
                  customClassName="baseFlex h-8 w-1/2 gap-2 px-3 rounded-r-none rounded-bl-none rounded-tl-sm border-r-[1px]"
                  createdById={minimalTab.createdById}
                  id={minimalTab.id}
                  numberOfLikes={minimalTab.numberOfLikes}
                  tabCreator={tabCreator}
                  currentArtist={currentArtist}
                  // fix typing/linting errors later
                  refetchCurrentArtist={refetchCurrentArtist}
                  // fix typing/linting errors later
                  refetchTabCreator={refetchTabCreator}
                  refetchTab={refetchTab}
                  infiniteQueryParams={infiniteQueryParams}
                />

                {/* play/pause button*/}
                <Button
                  variant="playPause"
                  disabled={
                    (audioMetadata.type === "Generated" &&
                      (artificalPlayButtonTimeout ||
                        !currentInstrument ||
                        forceShowLoadingSpinner)) ||
                    (audioMetadata.type === "Artist recording" &&
                      audioMetadata.tabId === minimalTab.id &&
                      !recordedAudioBuffer)
                  }
                  onClick={() => {
                    if (
                      audioMetadata.playing &&
                      audioMetadata.tabId === minimalTab.id
                    ) {
                      if (audioMetadata.type === "Generated") {
                        setArtificalPlayButtonTimeout(true);

                        setTimeout(() => {
                          setArtificalPlayButtonTimeout(false);
                        }, 300);
                      }
                      pauseAudio();
                    } else if (!fullTab) {
                      void fetchFullTab({ id: minimalTab.id });
                      setForceShowLoadingSpinner(true);
                      setId(minimalTab.id);
                      setFetchingFullTabData(true);
                      setShowingAudioControls(true);
                    } else {
                      // setting store w/ this tab's data
                      setId(fullTab.id);
                      setHasRecordedAudio(fullTab.hasRecordedAudio); // used specifically for artist recorded audio fetching purposes
                      setTabData(fullTab.tabData as unknown as Section[]);
                      setSectionProgression(
                        fullTab.sectionProgression as unknown as SectionProgression[]
                      );
                      setTuning(fullTab.tuning);
                      setBpm(fullTab.bpm);
                      setChords(fullTab.chords as unknown as Chord[]);
                      setCapo(fullTab.capo);

                      if (audioMetadata.tabId !== fullTab.id) {
                        pauseAudio(true);
                      }

                      setTimeout(() => {
                        void playTab({
                          tabId: minimalTab.id,
                          location: null,
                        });
                      }, 150); // hacky: trying to allow time for pauseAudio to finish and "flush out" state
                    }
                  }}
                  className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px] p-0"
                >
                  <PlayButtonIcon
                    uniqueLocationKey={`gridTabCard${minimalTab.id}`}
                    tabId={minimalTab.id}
                    currentInstrument={currentInstrument}
                    audioMetadata={audioMetadata}
                    forceShowLoadingSpinner={forceShowLoadingSpinner}
                  />
                </Button>
              </div>
            ) : (
              <Button
                variant={"ghost"}
                className="baseFlex mb-1 mr-2 gap-2 px-3 py-1"
                onClick={() => {
                  if (!setSelectedPinnedTabId) return;
                  setSelectedPinnedTabId(
                    selectedPinnedTabId === minimalTab.id ? -1 : minimalTab.id
                  );
                }}
              >
                {selectedPinnedTabId === minimalTab.id ? (
                  <TbPinnedFilled className="h-4 w-4" />
                ) : (
                  <TbPinned className="h-4 w-4" />
                )}

                {selectedPinnedTabId === minimalTab.id
                  ? "Unpin tab"
                  : "Pin tab"}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

GridTabCard.displayName = "GridTabCard";

export default GridTabCard;
