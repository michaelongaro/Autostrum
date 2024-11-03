import { motion } from "framer-motion";
import { useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import Chord from "~/components/Tab/Chord";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import { type LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";

function PlaybackMenuContent() {
  const {
    sectionProgression,
    id,
    currentInstrument,
    chords,
    strummingPatterns,
    audioMetadata,
    previewMetadata,
    playPreview,
    pauseAudio,
    playbackDialogViewingState,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    id: state.id,
    currentInstrument: state.currentInstrument,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    audioMetadata: state.audioMetadata,
    previewMetadata: state.previewMetadata,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
    playbackDialogViewingState: state.playbackDialogViewingState,
  }));

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] = useState<
    boolean[]
  >([]);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  return (
    <>
      {playbackDialogViewingState === "Section progression" && (
        <motion.div
          key="Section progression"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="baseVertFlex max-h-[calc(100dvh-rem)] w-full gap-2 overflow-y-auto"
        >
          {sectionProgression.length === 0 ? (
            <p className="text-lg font-semibold text-white">
              No section progression found.
            </p>
          ) : (
            <div className="baseVertFlex !justify-start gap-2">
              {sectionProgression.map((section) => (
                <div key={section.id} className="baseFlex gap-2">
                  <p className="text-stone-400">
                    {formatSecondsToMinutes(section.elapsedSecondsIntoTab)}
                  </p>
                  <p className="font-semibold">{section.title}</p>
                  {section.repetitions > 1 && <p>x{section.repetitions}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {playbackDialogViewingState === "Chords" && (
        <motion.div
          key="Chords"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="baseVertFlex w-full"
        >
          <div className="baseVertFlex max-h-[calc(100dvh-6rem)] !justify-start gap-4 overflow-y-auto">
            {chords.length > 0 ? (
              <>
                {chords.map((chord, index) => (
                  <div
                    key={chord.id}
                    className="baseFlex border-r-none h-10 shrink-0 overflow-hidden rounded-md border-2"
                  >
                    <p
                      style={{
                        textShadow:
                          previewMetadata.indexOfPattern === index &&
                          previewMetadata.playing &&
                          previewMetadata.type === "chord"
                            ? "none"
                            : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
                        color:
                          previewMetadata.indexOfPattern === index &&
                          previewMetadata.playing &&
                          previewMetadata.type === "chord"
                            ? "hsl(335, 78%, 42%)"
                            : "hsl(324, 77%, 95%)",
                      }}
                      className="px-3 font-semibold transition-colors"
                    >
                      {chord.name}
                    </p>

                    {/* TODO: replace this with better dynamic visual representation of chord on
                      fretboard */}
                    <div className="baseFlex h-full w-full !justify-evenly">
                      {/* preview button */}
                      <Popover>
                        <PopoverTrigger className="baseFlex mr-1 h-8 w-8 rounded-md transition-all hover:bg-white/20 active:hover:bg-white/10">
                          <HiOutlineInformationCircle className="h-5 w-5" />
                        </PopoverTrigger>
                        <PopoverContent className="chordPreviewGlassmorphic w-40 border-2 p-0 text-pink-100">
                          <Chord
                            chordBeingEdited={{
                              index,
                              value: chord,
                            }}
                            editing={false}
                            highlightChord={
                              previewMetadata.indexOfPattern === index &&
                              previewMetadata.playing &&
                              previewMetadata.type === "chord"
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      {/* preview chord button */}
                      <Button
                        variant={"playPause"}
                        disabled={
                          !currentInstrument ||
                          (previewMetadata.indexOfPattern === index &&
                            previewMetadata.playing &&
                            previewMetadata.type === "chord")
                        }
                        size={"sm"}
                        onClick={() => {
                          if (
                            audioMetadata.playing ||
                            previewMetadata.playing
                          ) {
                            pauseAudio();
                          }

                          setTimeout(
                            () => {
                              void playPreview({
                                data: chord.frets,
                                index,
                                type: "chord",
                              });
                            },
                            audioMetadata.playing || previewMetadata.playing
                              ? 50
                              : 0,
                          );
                        }}
                        className="baseFlex h-full w-10 rounded-l-none border-l-2"
                      >
                        <PlayButtonIcon
                          uniqueLocationKey={`chordPreview${index}`}
                          tabId={id}
                          currentInstrument={currentInstrument}
                          previewMetadata={previewMetadata}
                          indexOfPattern={index}
                          previewType="chord"
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div>No chords were specified for this tab.</div>
            )}
          </div>
        </motion.div>
      )}

      {playbackDialogViewingState === "Strumming patterns" && (
        <motion.div
          key="Strumming patterns"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`baseVertFlex max-h-[calc(100dvh-6rem)] w-full gap-10 overflow-y-auto ${strummingPatterns.length > 0 ? "!items-start !justify-start" : ""}`}
        >
          {strummingPatterns.length > 0 ? (
            <>
              {strummingPatterns.map((pattern, index) => (
                <div key={pattern.id} className="shrink-0 overflow-hidden">
                  <div className="baseFlex !items-start">
                    <div className="baseFlex border-b-none rounded-md rounded-tr-none border-2">
                      <StrummingPattern
                        data={pattern}
                        mode="viewing"
                        index={index}
                        lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                        setLastModifiedPalmMuteNode={
                          setLastModifiedPalmMuteNode
                        }
                        pmNodeOpacities={[]}
                      />
                    </div>

                    <Button
                      variant={"playPause"}
                      size={"sm"}
                      disabled={
                        !currentInstrument || artificalPlayButtonTimeout[index]
                      }
                      onClick={() => {
                        if (
                          previewMetadata.playing &&
                          index === previewMetadata.indexOfPattern &&
                          previewMetadata.type === "strummingPattern"
                        ) {
                          pauseAudio();
                          setArtificalPlayButtonTimeout((prev) => {
                            const prevArtificalPlayButtonTimeout = [...prev];
                            prevArtificalPlayButtonTimeout[index] = true;
                            return prevArtificalPlayButtonTimeout;
                          });

                          setTimeout(() => {
                            setArtificalPlayButtonTimeout((prev) => {
                              const prevArtificalPlayButtonTimeout = [...prev];
                              prevArtificalPlayButtonTimeout[index] = false;
                              return prevArtificalPlayButtonTimeout;
                            });
                          }, 300);
                        } else {
                          if (
                            audioMetadata.playing ||
                            previewMetadata.playing
                          ) {
                            pauseAudio();
                          }

                          setTimeout(
                            () => {
                              void playPreview({
                                data: pattern,
                                index,
                                type: "strummingPattern",
                              });
                            },
                            audioMetadata.playing || previewMetadata.playing
                              ? 50
                              : 0,
                          );
                        }
                      }}
                      className="w-10 rounded-l-none rounded-r-sm border-2 border-l-0 p-3"
                    >
                      <PlayButtonIcon
                        uniqueLocationKey={`strummingPatternPreview${index}`}
                        tabId={id}
                        currentInstrument={currentInstrument}
                        previewMetadata={previewMetadata}
                        indexOfPattern={index}
                        previewType="strummingPattern"
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div>No strumming patterns were specified for this tab.</div>
          )}
        </motion.div>
      )}
    </>
  );
}

export default PlaybackMenuContent;
