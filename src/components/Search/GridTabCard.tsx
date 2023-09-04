import {
  forwardRef,
  useState,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Genre, Tab } from "@prisma/client";
import { motion } from "framer-motion";
import { Separator } from "../ui/separator";
import Image from "next/image";
import { api } from "~/utils/api";
import {
  useTabStore,
  type Chord,
  type Section,
  type SectionProgression,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Skeleton } from "../ui/skeleton";
import formatDate from "~/utils/formatDate";
import { Button } from "../ui/button";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AiOutlineUser } from "react-icons/ai";
import { formatNumber } from "~/utils/formatNumber";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { TbPinnedFilled, TbPinned } from "react-icons/tb";
import { useRouter } from "next/router";
import type { TabWithLikes } from "~/server/api/routers/tab";
import { Badge } from "../ui/badge";
import type { RefetchTab } from "../Tab/Tab";
import TabPreview from "../Tab/TabPreview";
import useSound from "~/hooks/useSound";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";

interface GridTabCard extends RefetchTab {
  tab: TabWithLikes;
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  width?: number;
  height?: number;
}

const GridTabCard = forwardRef<HTMLDivElement, GridTabCard>(
  (
    {
      tab,
      refetchTab,
      selectedPinnedTabId,
      setSelectedPinnedTabId,
      width,
      height,
    },
    ref
  ) => {
    const { userId, isLoaded } = useAuth();
    const { push, asPath } = useRouter();

    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    const genreArray = api.genre.getAll.useQuery();

    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);

    const {
      playbackSpeed,
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
    } = useTabStore(
      (state) => ({
        playbackSpeed: state.playbackSpeed,
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
      }),
      shallow
    );

    const { playTab, pauseAudio } = useSound();

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
          userId: userId!,
        },
        {
          enabled: isLoaded && userId !== null,
        }
      );

    const {
      data: tabCreator,
      isLoading: loadingTabCreator,
      refetch: refetchTabCreator,
    } = api.artist.getByIdOrUsername.useQuery({
      userId: tab.createdById,
    });

    return (
      <motion.div
        ref={ref} // hoping that if ref is undefined it will just ignore it
        key={tab.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25 }}
        style={{
          width: width ?? "100%",
        }}
        className="lightestGlassmorphic baseVertFlex rounded-md border-2"
      >
        {/* tab preview */}
        <div
          ref={previewRef}
          style={{
            height: height ?? "9rem",
          }}
          className="relative w-full cursor-pointer overflow-hidden rounded-t-md transition-all hover:bg-black/10 active:bg-black/20"
          onClick={() => {
            void push(`/tab/${tab.id}`, undefined, {
              scroll: false, // defaults to true but try both
              shallow: true,
            });
          }}
        >
          <TabPreview
            tab={tab}
            scale={
              (previewRef.current?.getBoundingClientRect()?.width ?? 0) / 1200
            }
          />
        </div>

        <Separator />

        <div
          style={{
            alignItems: !asPath.includes("genreId") ? "flex-end" : "center",
          }}
          className="baseFlex w-full !justify-between"
        >
          {/* title, date, and genre */}
          <div className="baseVertFlex !items-start pb-2 pl-2">
            <Button variant={"link"} asChild>
              <Link
                href={`/tab/${tab.id}`}
                className="!p-0 !text-lg !font-semibold"
              >
                <p
                  style={{
                    maxWidth:
                      (previewRef.current?.getBoundingClientRect()?.width ??
                        330) * 0.5,
                  }}
                  className="truncate"
                >
                  {tab.title}
                </p>
              </Link>
            </Button>
            <p className="text-sm text-pink-50/90">
              {formatDate(tab.updatedAt ?? tab.createdAt)}
            </p>

            {asPath.includes("genreId") && selectedPinnedTabId === tab.id && (
              <Badge className="mt-2 bg-green-600">Pinned</Badge>
            )}

            {!asPath.includes("genreId") && (
              <div className="baseFlex gap-2">
                <Badge
                  style={{
                    backgroundColor: genreObject[tab.genreId]?.color,
                  }}
                  className="mt-2"
                >
                  {genreObject[tab.genreId]?.name}
                </Badge>
                {selectedPinnedTabId === tab.id && (
                  <Badge className="mt-2 bg-green-600">Pinned</Badge>
                )}
              </div>
            )}
          </div>

          {/* artist link & likes & play button */}
          <div className="baseVertFlex gap-2">
            <div className="baseFlex min-w-[112px] gap-2 px-2 py-1">
              {!asPath.includes("/artist") &&
                !asPath.includes("/preferences") &&
                !asPath.includes("/tabs") &&
                asPath !== "/explore" && (
                  <Button asChild variant={"ghost"} className="px-3 py-1">
                    <Link
                      href={`/artist/${tabCreator?.username ?? ""}`}
                      className="baseFlex gap-2"
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
                              // maybe just a developemnt thing, but it still very
                              // briefly shows the default placeholder for a loading
                              // or not found image before the actual image loads...
                              onLoadingComplete={() =>
                                setProfileImageLoaded(true)
                              }
                              style={{
                                opacity: profileImageLoaded ? 1 : 0,
                              }}
                              className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full bg-pink-800 object-cover object-center 
                          transition-opacity"
                            />
                            <div
                              style={{
                                opacity: !profileImageLoaded ? 1 : 0,
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
                      <span className="w-[58px] truncate">
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
            <div className="baseFlex w-full !flex-nowrap !justify-evenly rounded-tl-md border-l-2 border-t-2">
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
                  (audioMetadata.type === "Artist recorded" &&
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
                    setHasRecordedAudio(tab.hasRecordedAudio); // used specifically for artist recorded audio fetching purposes
                    setTabData(tab.tabData as unknown as Section[]);
                    setSectionProgression(
                      tab.sectionProgression as unknown as SectionProgression[]
                    );
                    setTuning(tab.tuning);
                    setBpm(tab.bpm);
                    setChords(tab.chords as unknown as Chord[]);
                    setCapo(tab.capo);

                    void playTab({
                      tabData: tab.tabData as unknown as Section[],
                      rawSectionProgression:
                        tab.sectionProgression as unknown as SectionProgression[],
                      tuningNotes: tab.tuning,
                      baselineBpm: tab.bpm,
                      chords: tab.chords as unknown as Chord[],
                      capo: tab.capo,
                      tabId: tab.id,
                      playbackSpeed,
                      resetToStart: audioMetadata.tabId !== tab.id,
                    });
                  }
                }}
                className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px] p-0"
              >
                {audioMetadata.playing && audioMetadata.tabId === tab.id ? (
                  <BsFillPauseFill className="h-5 w-5" />
                ) : (
                  <BsFillPlayFill className="h-5 w-5" />
                )}
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
