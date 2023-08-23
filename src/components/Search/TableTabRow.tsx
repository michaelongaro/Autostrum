import { useState, useMemo, forwardRef } from "react";
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
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import type { TabWithLikes } from "~/server/api/routers/tab";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";
import type { Genre } from "@prisma/client";
import type { RefetchTab } from "../Tab/Tab";
import useSound from "~/hooks/useSound";

interface TableTabRow extends RefetchTab {
  tab: TabWithLikes;
}

const TableTabRow = forwardRef<HTMLTableRowElement, TableTabRow>(
  ({ tab, refetchTab }, ref) => {
    const { userId, isLoaded } = useAuth();
    const { push, asPath } = useRouter();

    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
      useState(false);

    const {
      playbackSpeed,
      audioMetadata,
      currentInstrument,
      setTabData,
      setSectionProgression,
      setTuning,
      setBpm,
      setChords,
      setCapo,
    } = useTabStore(
      (state) => ({
        playbackSpeed: state.playbackSpeed,
        audioMetadata: state.audioMetadata,
        currentInstrument: state.currentInstrument,
        setTabData: state.setTabData,
        setSectionProgression: state.setSectionProgression,
        setTuning: state.setTuning,
        setBpm: state.setBpm,
        setChords: state.setChords,
        setCapo: state.setCapo,
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
          userId: userId!,
        },
        {
          enabled: isLoaded,
        }
      );

    const { data: tabCreator, refetch: refetchTabCreator } =
      api.artist.getByIdOrUsername.useQuery({
        userId: tab.createdById,
      });
    const ctx = api.useContext();

    const { mutate: likeTab, isLoading: isLiking } =
      api.like.createLike.useMutation({
        onMutate: async () => {
          // optimistic updates

          if (asPath.includes("artist")) {
            await ctx.artist.getByIdOrUsername.cancel({
              userId: tabCreator?.userId,
            });
            ctx.artist.getByIdOrUsername.setData(
              {
                userId: tabCreator?.userId,
              },
              (prevArtistData) => {
                if (!prevArtistData) return prevArtistData;

                return {
                  ...prevArtistData,
                  numberOfLikes: prevArtistData.numberOfLikes++,
                };
              }
            );
          }

          // using username because artist profile page uses username for it's query
          await ctx.artist.getByIdOrUsername.cancel({
            username: currentArtist?.username,
          });
          ctx.artist.getByIdOrUsername.setData(
            {
              username: currentArtist?.username,
            },
            (prevArtistData) => {
              if (!prevArtistData) return prevArtistData;

              const currentArtistIsOwner =
                currentArtist?.username === tabCreator?.username;

              return {
                ...prevArtistData,
                likedTabIds: [...prevArtistData.likedTabIds, tab.id],
                numberOfLikes: currentArtistIsOwner
                  ? prevArtistData.numberOfLikes + 1
                  : prevArtistData.numberOfLikes,
              };
            }
          );

          await ctx.tab.getTabById.cancel();
          ctx.tab.getTabById.setData(
            {
              id: tab.id,
            },
            (prevTabData) => {
              if (!prevTabData) return prevTabData;
              return {
                ...prevTabData,
                numberOfLikes: prevTabData.numberOfLikes + 1,
              };
            }
          );
        },
        onError: (e) => {
          console.error(e);
        },
        onSettled: () => {
          void refetchTab();
          void refetchCurrentArtist();
          if (asPath.includes("artist")) void refetchTabCreator();
        },
      });

    const { mutate: unlikeTab, isLoading: isUnliking } =
      api.like.deleteLike.useMutation({
        onMutate: async () => {
          // optimistic updates

          if (asPath.includes("artist")) {
            await ctx.artist.getByIdOrUsername.cancel({
              userId: tabCreator?.userId,
            });
            ctx.artist.getByIdOrUsername.setData(
              {
                userId: tabCreator?.userId,
              },
              (prevArtistData) => {
                if (!prevArtistData) return prevArtistData;

                return {
                  ...prevArtistData,
                  numberOfLikes: prevArtistData.numberOfLikes--,
                };
              }
            );
          }

          // using username because artist profile page uses username for it's query
          await ctx.artist.getByIdOrUsername.cancel({
            username: currentArtist?.username,
          });
          ctx.artist.getByIdOrUsername.setData(
            {
              username: currentArtist?.username,
            },
            (prevArtistData) => {
              if (!prevArtistData) return prevArtistData;

              const currentArtistIsOwner =
                currentArtist?.username === tabCreator?.username;

              return {
                ...prevArtistData,
                likedTabIds: prevArtistData.likedTabIds.filter(
                  (id) => id !== tab.id
                ),
                numberOfLikes: currentArtistIsOwner
                  ? prevArtistData.numberOfLikes - 1
                  : prevArtistData.numberOfLikes,
              };
            }
          );

          await ctx.tab.getTabById.cancel();
          ctx.tab.getTabById.setData(
            {
              id: tab.id,
            },
            (prevTabData) => {
              if (!prevTabData) return prevTabData;
              return {
                ...prevTabData,
                numberOfLikes: prevTabData.numberOfLikes - 1,
              };
            }
          );
        },
        onError: (e) => {
          console.error(e);
        },
        onSettled: () => {
          void refetchTab();
          void refetchCurrentArtist();
          if (asPath.includes("artist")) void refetchTabCreator();
        },
      });

    return (
      <TableRow ref={ref} className="w-full">
        <TableCell className="min-w-[100px] font-medium">
          <Button variant={"link"} asChild>
            <Link
              href={`/tab/${tab.id}`}
              className="!p-0 !text-lg !font-semibold"
            >
              {tab.title}
            </Link>
          </Button>
        </TableCell>
        <TableCell>
          <div
            style={{
              backgroundColor: genreObject[tab.genreId]?.color,
            }}
            className="rounded-md px-4 py-[0.65rem] lg:px-16"
          >
            {/* need bubbles, prob fine to hardcode them tbh */}
            {genreObject[tab.genreId]?.name}
          </div>
        </TableCell>
        <TableCell className="baseFlex !justify-start gap-2">
          <Button variant={"ghost"} className="px-3 py-1">
            <Link
              href={`/artist/${tabCreator?.username ?? ""}`}
              className="baseFlex gap-2"
            >
              <div className="grid grid-cols-1 grid-rows-1">
                <Image
                  src={tabCreator?.profileImageUrl ?? ""}
                  alt={`${tabCreator?.username ?? "Anonymous"}'s profile image`}
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
              </div>
              <span>{tabCreator?.username ?? "Anonymous"}</span>
            </Link>
          </Button>
        </TableCell>
        <TableCell>{formatDate(tab.updatedAt ?? tab.createdAt)}</TableCell>
        <TableCell>
          <Button
            variant={"ghost"}
            size={"sm"}
            className="baseFlex gap-2"
            onClick={() => {
              if (!tabCreator || !currentArtist) return;

              if (currentArtist.likedTabIds.includes(tab.id)) {
                unlikeTab({
                  tabId: tab.id,
                  artistWhoLikedId: currentArtist.userId,
                });
              } else {
                likeTab({
                  tabId: tab.id,
                  tabArtistId: tab.createdById,
                  tabArtistUsername: tabCreator.username,
                  artistWhoLikedId: currentArtist.userId,
                });
              }
            }}
          >
            {currentArtist?.likedTabIds.includes(tab.id) ? (
              <AiFillHeart className="h-6 w-6 text-pink-800" />
            ) : (
              <AiOutlineHeart className="h-6 w-6" />
            )}
            {tab.numberOfLikes > 0 && (
              <div className="text-lg">{formatNumber(tab.numberOfLikes)}</div>
            )}
          </Button>
        </TableCell>
        <TableCell>
          <Button
            variant="playPause"
            disabled={artificalPlayButtonTimeout || !currentInstrument}
            onClick={() => {
              if (audioMetadata.playing && audioMetadata.tabId === tab.id) {
                setArtificalPlayButtonTimeout(true);

                setTimeout(() => {
                  setArtificalPlayButtonTimeout(false);
                }, 300);
                pauseAudio();
              } else {
                // setting store w/ this tab's data
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
            {audioMetadata.playing && audioMetadata.tabId === tab.id ? (
              <BsFillPauseFill className="h-5 w-5" />
            ) : (
              <BsFillPlayFill className="h-5 w-5" />
            )}
          </Button>
        </TableCell>
      </TableRow>
    );
  }
);

TableTabRow.displayName = "TableTabRow";

export default TableTabRow;
