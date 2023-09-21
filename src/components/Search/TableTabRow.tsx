import {
  useState,
  useMemo,
  forwardRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import {
  useTabStore,
  type Chord,
  type Section,
  type SectionProgression,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { AiOutlineUser } from "react-icons/ai";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import type { TabWithLikes } from "~/server/api/routers/tab";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";
import type { Genre } from "@prisma/client";
import type { RefetchTab } from "../Tab/Tab";
import useSound from "~/hooks/useSound";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
import GenrePreviewBubbles from "../Tab/GenrePreviewBubbles";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0.5,
  },
};

interface TableTabRow extends RefetchTab {
  tab: TabWithLikes;
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
}

const TableTabRow = forwardRef<HTMLTableRowElement, TableTabRow>(
  ({ tab, refetchTab, selectedPinnedTabId, setSelectedPinnedTabId }, ref) => {
    const { userId, isLoaded } = useAuth();
    const { push, asPath } = useRouter();

    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);

    const {
      playbackSpeed,
      audioMetadata,
      currentInstrument,
      // setId,
      setHasRecordedAudio,
      setTabData,
      setSectionProgression,
      setTuning,
      setBpm,
      setChords,
      setCapo,
      recordedAudioBuffer, // pick only one or are both useful here?
      recordedAudioBufferSourceNode, // pick only one or are both useful here?
    } = useTabStore(
      (state) => ({
        playbackSpeed: state.playbackSpeed,
        audioMetadata: state.audioMetadata,
        currentInstrument: state.currentInstrument,
        // setId: state.setId,
        setHasRecordedAudio: state.setHasRecordedAudio,
        setTabData: state.setTabData,
        setSectionProgression: state.setSectionProgression,
        setTuning: state.setTuning,
        setBpm: state.setBpm,
        setChords: state.setChords,
        setCapo: state.setCapo,
        recordedAudioBuffer: state.recordedAudioBuffer,
        recordedAudioBufferSourceNode: state.recordedAudioBufferSourceNode,
      }),
      shallow
    );

    const { playTab, pauseAudio } = useSound();

    const genreArray = api.genre.getAll.useQuery();

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

    return (
      <TableRow ref={ref} className="w-full">
        <TableCell className="whitespace-nowrap">
          <Button variant={"link"} asChild>
            <Link
              href={`/tab/${tab.id}`}
              className="!p-0 !text-lg !font-semibold"
            >
              {tab.title}
            </Link>
          </Button>
        </TableCell>
        {selectedPinnedTabId !== undefined && (
          <TableCell>
            <Button
              variant={"ghost"}
              className="baseFlex w-28 gap-2 px-3 py-1"
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
          </TableCell>
        )}
        <TableCell>
          <div
            style={{
              backgroundColor: genreObject[tab.genreId]?.color,
            }}
            className="baseFlex w-[150px] !justify-between gap-2 rounded-md px-4 py-[0.39rem]"
          >
            {genreObject[tab.genreId]?.name}
            <GenrePreviewBubbles
              color={genreObject[tab.genreId]?.color ?? "#FFFFFF"}
            />
          </div>
        </TableCell>
        <TableCell>
          {/* not sure why the profile image starts shrinking + eventually "pushed" out of view when
          viewport is shrunk. maybe something to do with "object-cover or object-center"? */}
          <Button asChild variant={"ghost"} className="px-3 py-1">
            <Link
              href={`/artist/${tabCreator?.username ?? ""}`}
              className="baseFlex w-fit !flex-nowrap !justify-start gap-2"
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
                      onLoadingComplete={() => setProfileImageLoaded(true)}
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
              <span>{tabCreator?.username ?? "Anonymous"}</span>
            </Link>
          </Button>
        </TableCell>
        <TableCell>{formatDate(tab.updatedAt ?? tab.createdAt)}</TableCell>
        <TableCell>
          <LikeAndUnlikeButton
            customClassName="baseFlex gap-2 px-3"
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
        </TableCell>
        <TableCell>
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
          >
            <PlayButtonIcon
              uniqueLocationKey={`gridTabCard${tab.id}`}
              tabId={tab.id}
              currentInstrument={currentInstrument}
              audioMetadata={audioMetadata}
            />
          </Button>
        </TableCell>
      </TableRow>
    );
  }
);

TableTabRow.displayName = "TableTabRow";

export default TableTabRow;
