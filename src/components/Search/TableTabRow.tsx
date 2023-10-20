import { useAuth } from "@clerk/nextjs";
import type { Genre } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import {
  forwardRef,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AiOutlineUser } from "react-icons/ai";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { shallow } from "zustand/shallow";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
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
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
import type { InfiniteQueryParams } from "./SearchResults";

interface TableTabRow {
  minimalTab: MinimalTabRepresentation;
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  infiniteQueryParams?: InfiniteQueryParams;
}

const TableTabRow = forwardRef<HTMLTableRowElement, TableTabRow>(
  (
    {
      minimalTab,
      selectedPinnedTabId,
      setSelectedPinnedTabId,
      infiniteQueryParams,
    },
    ref
  ) => {
    const { userId } = useAuth();

    const [fullTab, setFullTab] = useState<TabWithLikes>();
    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);

    const {
      audioMetadata,
      currentInstrument,
      id,
      setId,
      setHasRecordedAudio,
      setTabData,
      setSectionProgression,
      setTuning,
      setBpm,
      setChords,
      setCapo,
      recordedAudioBuffer,
      playTab,
      pauseAudio,
      setFetchingFullTabData,
    } = useTabStore(
      (state) => ({
        audioMetadata: state.audioMetadata,
        currentInstrument: state.currentInstrument,
        id: state.id,
        setId: state.setId,
        setHasRecordedAudio: state.setHasRecordedAudio,
        setTabData: state.setTabData,
        setSectionProgression: state.setSectionProgression,
        setTuning: state.setTuning,
        setBpm: state.setBpm,
        setChords: state.setChords,
        setCapo: state.setCapo,
        recordedAudioBuffer: state.recordedAudioBuffer,
        playTab: state.playTab,
        pauseAudio: state.pauseAudio,
        setFetchingFullTabData: state.setFetchingFullTabData,
      }),
      shallow
    );

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

    const { mutate: fetchFullTab, isLoading: loadingFullTab } =
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

            if (audioMetadata.playing) {
              pauseAudio(true);
            }
            setTimeout(() => {
              void playTab({
                tabId: fullTab.id,
                location: null,
              });
            }, 150); // hacky: trying to allow time for pauseAudio to finish and "flush out" state

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

    return (
      <TableRow ref={ref} className="w-full">
        <TableCell className="whitespace-nowrap">
          <Button variant={"link"} asChild>
            <Link
              href={`/tab/${minimalTab.id}`}
              className="!p-0 !text-lg !font-semibold"
            >
              {minimalTab.title}
            </Link>
          </Button>
        </TableCell>
        {selectedPinnedTabId !== undefined && (
          <TableCell>
            <Button
              variant={"ghost"}
              className="baseFlex w-fit !flex-nowrap gap-2 px-3 py-1"
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

              {selectedPinnedTabId === minimalTab.id ? "Unpin tab" : "Pin tab"}
            </Button>
          </TableCell>
        )}
        <TableCell>
          {genreObject[minimalTab.genreId] && (
            <div
              style={{
                backgroundColor: genreObject[minimalTab.genreId]?.color,
              }}
              className="baseFlex w-[140px] !justify-between gap-2 rounded-md px-4 py-[0.39rem]"
            >
              {genreObject[minimalTab.genreId]?.name}
              <Image
                src={`/genrePreviewBubbles/id${minimalTab.genreId}.png`}
                alt="three genre preview bubbles with the same color as the associated genre"
                width={32}
                height={32}
                quality={100}
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            </div>
          )}
        </TableCell>
        <TableCell>
          <Button
            disabled={!tabCreator}
            // asChild // hmm want to use asChild but it overrides the disabled prop
            variant={"ghost"}
            className="px-3 py-1"
          >
            <Link
              href={`/artist/${tabCreator?.username ?? ""}`}
              className="baseFlex w-fit !flex-nowrap !justify-start gap-2"
            >
              <div className="grid h-8 w-8 grid-cols-1 grid-rows-1">
                {tabCreator || fetchingTabCreator ? (
                  <>
                    <Image
                      src={tabCreator?.profileImageUrl ?? ""}
                      alt={`${
                        tabCreator?.username ?? "Anonymous"
                      }'s profile image`}
                      width={32}
                      height={32}
                      onLoad={() => {
                        setTimeout(() => {
                          setProfileImageLoaded(true);
                        }, 1500);
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
              <span
                className={`text-lg ${
                  !tabCreator && !fetchingTabCreator ? "italic" : ""
                }`}
              >
                {tabCreator?.username ?? "Anonymous"}
              </span>
            </Link>
          </Button>
        </TableCell>
        <TableCell>
          {formatDate(minimalTab.updatedAt ?? minimalTab.createdAt)}
        </TableCell>
        <TableCell>
          <LikeAndUnlikeButton
            customClassName="baseFlex gap-2 px-3"
            createdById={minimalTab.createdById}
            id={minimalTab.id}
            numberOfLikes={minimalTab.numberOfLikes}
            tabCreator={tabCreator}
            currentArtist={currentArtist}
            // fix typing/linting errors later
            refetchCurrentArtist={refetchCurrentArtist}
            // fix typing/linting errors later
            refetchTabCreator={refetchTabCreator}
            infiniteQueryParams={infiniteQueryParams}
          />
        </TableCell>
        <TableCell>
          <Button
            variant="playPause"
            disabled={
              (audioMetadata.type === "Generated" &&
                (artificalPlayButtonTimeout || !currentInstrument)) ||
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
                // fetch the full tab
                void fetchFullTab({ id: minimalTab.id });
                setId(minimalTab.id);
                setFetchingFullTabData(true);
              } else {
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

                if (audioMetadata.playing) {
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
            className="h-8 md:h-auto"
          >
            <PlayButtonIcon
              uniqueLocationKey={`tableTabRow${minimalTab.id}`}
              tabId={minimalTab.id}
              currentInstrument={currentInstrument}
              audioMetadata={audioMetadata}
              loadingTabData={loadingFullTab}
            />
          </Button>
        </TableCell>
      </TableRow>
    );
  }
);

TableTabRow.displayName = "TableTabRow";

export default TableTabRow;
