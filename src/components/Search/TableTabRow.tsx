import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import {
  forwardRef,
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
import { genreList } from "~/utils/genreList";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
import type { InfiniteQueryParams } from "./SearchResults";

interface TableTabRow {
  minimalTab: MinimalTabRepresentation;
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  infiniteQueryParams?: InfiniteQueryParams;
  hideLikesAndPlayButtons?: boolean;
}

const TableTabRow = forwardRef<HTMLTableRowElement, TableTabRow>(
  (
    {
      minimalTab,
      selectedPinnedTabId,
      setSelectedPinnedTabId,
      infiniteQueryParams,
      hideLikesAndPlayButtons,
    },
    ref
  ) => {
    const { userId } = useAuth();

    const [fullTab, setFullTab] = useState<TabWithLikes>();
    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);
    const [forceShowLoadingSpinner, setForceShowLoadingSpinner] =
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
      showingAudioControls,
      setShowingAudioControls,
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

    return (
      <TableRow ref={ref} className="w-full">
        <TableCell className="whitespace-nowrap">
          <Button variant={"link"} asChild>
            <Link
              href={`/tab/${minimalTab.id}`}
              className="!p-0 !text-base !font-semibold md:!text-lg"
            >
              {minimalTab.title}
            </Link>
          </Button>
        </TableCell>
        {selectedPinnedTabId !== undefined && (
          <TableCell>
            <Button
              variant={"ghost"}
              className="baseFlex w-fit !flex-nowrap gap-2 whitespace-nowrap px-3 py-1"
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
          {genreList[minimalTab.genreId] && (
            <div
              style={{
                backgroundColor: genreList[minimalTab.genreId]?.color,
              }}
              className="baseFlex w-[140px] !justify-between gap-2 rounded-md px-4 py-[0.39rem]"
            >
              {genreList[minimalTab.genreId]?.name}
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
            {...(tabCreator && { asChild: true })}
            variant={"ghost"}
            className="px-3 py-1"
          >
            <Link
              href={`/artist/${tabCreator?.username ?? ""}`}
              className="baseFlex w-fit !flex-nowrap !justify-start gap-2"
            >
              <div className="grid min-h-[32px] min-w-[32px] grid-cols-1 grid-rows-1">
                {tabCreator || fetchingTabCreator ? (
                  <>
                    {tabCreator && (
                      <Image
                        src={tabCreator.profileImageUrl}
                        alt={`${tabCreator.username}'s profile image`}
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
                      <div className="col-start-1 col-end-2 row-start-1 row-end-2 h-5 w-20 animate-pulse rounded-md bg-pink-300 "></div>
                    )}
                  </>
                </div>
              ) : (
                <span className="italic text-pink-50">Anonymous</span>
              )}
            </Link>
          </Button>
        </TableCell>
        <TableCell>
          {formatDate(minimalTab.updatedAt ?? minimalTab.createdAt)}
        </TableCell>

        {!hideLikesAndPlayButtons && (
          <>
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
                className="h-8 md:h-9"
              >
                <PlayButtonIcon
                  uniqueLocationKey={`tableTabRow${minimalTab.id}`}
                  tabId={minimalTab.id}
                  currentInstrument={currentInstrument}
                  audioMetadata={audioMetadata}
                  forceShowLoadingSpinner={forceShowLoadingSpinner}
                />
              </Button>
            </TableCell>
          </>
        )}
      </TableRow>
    );
  }
);

TableTabRow.displayName = "TableTabRow";

export default TableTabRow;
