import { useAuth } from "@clerk/nextjs";
import type { Genre } from "@prisma/client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AiOutlineUser } from "react-icons/ai";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { shallow } from "zustand/shallow";
import type { TabWithLikes } from "~/server/api/routers/tab";
import {
  useTabStore,
  type Chord,
  type Section,
  type SectionProgression,
} from "~/stores/TabStore";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import type { RefetchTab } from "../Tab/Tab";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
interface GridTabCard extends RefetchTab {
  tab: TabWithLikes;
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  largeVariant?: boolean;
}

const GridTabCard = forwardRef<HTMLDivElement, GridTabCard>(
  (
    {
      tab,
      refetchTab,
      selectedPinnedTabId,
      setSelectedPinnedTabId,
      largeVariant,
    },
    ref
  ) => {
    const { userId } = useAuth();
    const { asPath } = useRouter();

    const [tabScreenshot, setTabScreenshot] = useState<string>();
    const [tabScreenshotLoaded, setTabScreenshotLoaded] = useState(false);
    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const previewRef = useRef<HTMLAnchorElement>(null);

    const genreArray = api.genre.getAll.useQuery();

    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);

    const {
      audioMetadata,
      currentInstrument,
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
    } = useTabStore(
      (state) => ({
        audioMetadata: state.audioMetadata,
        currentInstrument: state.currentInstrument,
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
      }),
      shallow
    );

    const genreObject: Record<number, Genre> = useMemo(() => {
      if (!genreArray.data) return {};

      return genreArray.data.reduce((acc: Record<number, Genre>, genre) => {
        acc[genre.id] = genre;
        return acc;
      }, {});
    }, [genreArray.data]);

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
      isLoading: loadingTabCreator,
      refetch: refetchTabCreator,
    } = api.artist.getByIdOrUsername.useQuery(
      {
        userId: tab.createdById as string,
      },
      {
        enabled: !!tab.createdById,
      }
    );

    useEffect(() => {
      if (tabScreenshot) return;

      const fetchImage = async () => {
        try {
          const res = await fetch(`/api/getTabScreenshot/${tab.id}`);
          if (!res.ok) {
            console.error("Failed to fetch image");
            return;
          }
          const blob = await res.blob();

          const reader = new FileReader();
          reader.onloadend = function () {
            setTabScreenshot(reader.result);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Error fetching image:", error, tab.id);
        }
      };

      void fetchImage();
    }, [tabScreenshot, tab.id]);

    return (
      <motion.div
        ref={ref} // hoping that if ref is undefined it will just ignore it
        key={`${tab.id}gridTabCard`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          width: `${largeVariant ? 400 : 317}px`, // accounts for border (may need to add a few px to custom width now that I think about it)
          // height: `${width ? 183 : 146}px`,
        }}
        className="baseVertFlex !flex-nowrap rounded-md border-2"
      >
        {/* tab preview */}
        <Link
          ref={previewRef}
          href={`/tab/${tab.id}`}
          style={{
            width: largeVariant ? 396 : 313,
            height: largeVariant ? 185 : 146,
          }}
          className="relative w-full cursor-pointer rounded-t-md transition-all hover:brightness-90 active:brightness-75"
        >
          {/* tab preview screenshot */}
          <div className="grid grid-cols-1 grid-rows-1">
            <Image
              src={tabScreenshot ?? ""}
              alt={`screenshot of ${tab.title}`}
              width={largeVariant ? 396 : 313}
              height={largeVariant ? 185 : 146}
              // unoptimized
              onLoadingComplete={() => {
                setTimeout(() => {
                  setTabScreenshotLoaded(true);
                }, 1000);
              }}
              style={{
                opacity: tabScreenshotLoaded ? 1 : 0,
              }}
              className="col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-md object-cover object-center transition-opacity"
            />
            <div
              style={{
                opacity: !tabScreenshotLoaded ? 1 : 0,
                zIndex: !tabScreenshotLoaded ? 1 : -1,
                width: largeVariant ? 396 : 313,
                height: largeVariant ? 185 : 146,
              }}
              className={`col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-md bg-pink-300 transition-opacity
                              ${!tabScreenshotLoaded ? "animate-pulse" : ""}
                            `}
            ></div>
          </div>
        </Link>

        <Separator />

        <div className="baseVertFlex lightestGlassmorphic w-full !justify-between gap-2 rounded-b-md">
          {/* title and date + genre */}
          {/* hmmm what about the nowrap here, test w/ larget titles */}
          <div className="baseVertFlex w-full !flex-nowrap !items-start gap-0 px-2">
            <Button variant={"link"} asChild>
              <Link
                href={`/tab/${tab.id}`}
                className="h-6 !p-0 !font-semibold md:h-8 md:!text-lg"
              >
                <p>{tab.title}</p>
              </Link>
            </Button>

            <div className="baseFlex !flex-nowrap gap-2">
              <p className="text-sm text-pink-50/90">
                {formatDate(tab.updatedAt ?? tab.createdAt)}
              </p>

              {asPath.includes("genreId") && selectedPinnedTabId === tab.id && (
                <Badge className="bg-green-600">Pinned</Badge>
              )}

              {!asPath.includes("genreId") && (
                <div className="baseFlex gap-2">
                  <Badge
                    style={{
                      backgroundColor: genreObject[tab.genreId]?.color,
                    }}
                  >
                    {genreObject[tab.genreId]?.name}
                  </Badge>
                  {selectedPinnedTabId === tab.id && (
                    <Badge className="bg-green-600">Pinned</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* artist/pin button and (likes & play button) */}
          <div className="baseFlex w-full !flex-nowrap !items-end !justify-between gap-2">
            {/* not sure if the min-w-[112px] is vestigial or not */}
            <div className="baseFlex mb-1 w-1/2 !items-start !justify-start gap-2 pl-2">
              {!asPath.includes("/artist") &&
                !asPath.includes("/preferences") &&
                !asPath.includes("/tabs") &&
                asPath !== "/explore" && (
                  <Button
                    asChild
                    variant={"ghost"}
                    className="h-full px-3 py-1"
                  >
                    <Link
                      href={`/artist/${tabCreator?.username ?? ""}`}
                      className="baseFlex !justify-start gap-2"
                    >
                      <div className="grid grid-cols-1 grid-rows-1">
                        {tabCreator || loadingTabCreator ? (
                          <>
                            <Image
                              src={tabCreator?.profileImageUrl ?? ""}
                              alt={`${
                                tabCreator?.username ?? "Anonymous"
                              }'s profile image`}
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
                          <div className="baseFlex h-8 w-8 rounded-full border-[1px] shadow-md">
                            <AiOutlineUser className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <span className="max-w-[100%] truncate">
                        {tabCreator?.username ?? "Anonymous"}
                      </span>
                    </Link>
                  </Button>
                )}

              {selectedPinnedTabId !== undefined && (
                <Button
                  variant={"ghost"}
                  className="baseFlex gap-2 px-3 py-1"
                  onClick={() => {
                    if (!setSelectedPinnedTabId) return;
                    setSelectedPinnedTabId(
                      selectedPinnedTabId === tab.id ? -1 : tab.id
                    );
                  }}
                >
                  {selectedPinnedTabId === tab.id ? (
                    <TbPinnedFilled className="h-4 w-4" />
                  ) : (
                    <TbPinned className="h-4 w-4" />
                  )}

                  {selectedPinnedTabId === tab.id ? "Unpin tab" : "Pin tab"}
                </Button>
              )}
            </div>

            <div className="baseFlex w-1/2 !flex-nowrap !justify-evenly rounded-tl-md border-l-2 border-t-2">
              {/* likes button */}
              <LikeAndUnlikeButton
                customClassName="baseFlex h-8 w-1/2 gap-2 px-3 rounded-r-none rounded-bl-none rounded-tl-sm border-r-[1px]"
                createdById={tab.createdById}
                id={tab.id}
                numberOfLikes={tab.numberOfLikes}
                tabCreator={tabCreator}
                currentArtist={currentArtist}
                // fix typing/linting errors later
                refetchCurrentArtist={refetchCurrentArtist}
                // fix typing/linting errors later
                refetchTabCreator={refetchTabCreator}
                refetchTab={refetchTab}
              />

              {/* play/pause button*/}
              <Button
                variant="playPause"
                disabled={
                  (audioMetadata.type === "Generated" &&
                    (artificalPlayButtonTimeout || !currentInstrument)) ||
                  (audioMetadata.type === "Artist recording" &&
                    audioMetadata.tabId === tab.id &&
                    !recordedAudioBuffer)
                }
                onClick={() => {
                  if (audioMetadata.playing && audioMetadata.tabId === tab.id) {
                    if (audioMetadata.type === "Generated") {
                      setArtificalPlayButtonTimeout(true);

                      setTimeout(() => {
                        setArtificalPlayButtonTimeout(false);
                      }, 300);
                    }
                    pauseAudio();
                  } else {
                    // setting store w/ this tab's data
                    setId(tab.id);
                    setHasRecordedAudio(tab.hasRecordedAudio); // used specifically for artist recorded audio fetching purposes
                    setTabData(tab.tabData as unknown as Section[]);
                    setSectionProgression(
                      tab.sectionProgression as unknown as SectionProgression[]
                    );
                    setTuning(tab.tuning);
                    setBpm(tab.bpm);
                    setChords(tab.chords as unknown as Chord[]);
                    setCapo(tab.capo);

                    if (audioMetadata.playing) {
                      pauseAudio(true);
                    }
                    setTimeout(() => {
                      void playTab({
                        tabId: tab.id,
                        location: null,
                      });
                    }, 150); // hacky: trying to allow time for pauseAudio to finish and "flush out" state
                  }
                }}
                className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px] p-0"
              >
                <PlayButtonIcon
                  uniqueLocationKey={`gridTabCard${tab.id}`}
                  tabId={tab.id}
                  currentInstrument={currentInstrument}
                  audioMetadata={audioMetadata}
                />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

GridTabCard.displayName = "GridTabCard";

export default GridTabCard;
