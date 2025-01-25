import { motion } from "framer-motion";
import { useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import Chord from "~/components/Tab/Chord";
import ChordDiagram from "~/components/Tab/Playback/ChordDiagram";
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
    playbackModalViewingState,
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
    playbackModalViewingState: state.playbackModalViewingState,
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
      {playbackModalViewingState === "Section progression" && (
        <motion.div
          key="Section progression"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="baseVertFlex h-full max-h-[calc(100dvh-rem)] w-full gap-2 overflow-y-auto"
        >
          {sectionProgression.length === 0 ? (
            <p className="text-lg font-semibold text-white">
              No section progression found.
            </p>
          ) : (
            <div className="baseVertFlex gap-2">
              {sectionProgression.map((section) => (
                <div
                  key={section.id}
                  className="baseFlex w-full !justify-start gap-2"
                >
                  <div className="baseFlex w-24 gap-2">
                    <p className="text-stone-400">
                      {formatSecondsToMinutes(section.startSeconds)}
                    </p>
                    <span className="text-stone-400">-</span>
                    <p className="text-stone-400">
                      {formatSecondsToMinutes(section.endSeconds)}
                    </p>
                  </div>

                  <div className="baseFlex gap-2">
                    <p className="text-nowrap font-semibold">{section.title}</p>
                    {section.repetitions > 1 && <p>(x{section.repetitions})</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {playbackModalViewingState === "Chords" && (
        <motion.div
          key="Chords"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="baseVertFlex size-full overflow-y-hidden py-8"
        >
          {chords.length > 0 ? (
            <div className="grid max-h-[calc(100dvh-6rem)] w-full auto-rows-auto grid-cols-6 place-items-center gap-4 overflow-y-auto px-8">
              <>
                {chords.map((chord, index) => (
                  <div key={chord.id} className="baseFlex">
                    <div className="baseVertFlex gap-3">
                      <div className="baseFlex w-full !justify-between border-b py-2">
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
                          className="baseFlex mr-3 h-6 w-10 rounded-sm"
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

                      <div className="h-48">
                        <ChordDiagram originalFrets={chord.frets} />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            </div>
          ) : (
            <div>No chords were specified for this tab.</div>
          )}
        </motion.div>
      )}

      {playbackModalViewingState === "Strumming patterns" && (
        <motion.div
          key="Strumming patterns"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`baseVertFlex h-full max-h-[calc(100dvh-6rem)] w-full overflow-y-auto ${strummingPatterns.length > 0 ? "mt-8 !justify-start" : ""}`}
        >
          {strummingPatterns.length > 0 ? (
            <div className="baseVertFlex !items-start gap-10">
              {strummingPatterns.map((pattern, index) => (
                <div key={pattern.id} className="shrink-0 overflow-hidden">
                  <div className="baseVertFlex !items-start">
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
                      className="baseFlex ml-2 h-6 w-20 gap-2 rounded-b-none"
                    >
                      <p>
                        {previewMetadata.playing &&
                        index === previewMetadata.indexOfPattern &&
                        previewMetadata.type === "strummingPattern"
                          ? "Stop"
                          : "Play"}
                      </p>
                      <PlayButtonIcon
                        uniqueLocationKey={`strummingPatternPreview${index}`}
                        tabId={id}
                        currentInstrument={currentInstrument}
                        previewMetadata={previewMetadata}
                        indexOfPattern={index}
                        previewType="strummingPattern"
                      />
                    </Button>
                    <div className="baseFlex border-b-none !flex-nowrap rounded-md border-2">
                      <StrummingPattern
                        data={pattern}
                        mode="viewing"
                        index={index}
                        lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                        setLastModifiedPalmMuteNode={
                          setLastModifiedPalmMuteNode
                        }
                        pmNodeOpacities={[]} //
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>No strumming patterns were specified for this tab.</div>
          )}
        </motion.div>
      )}
    </>
  );
}

export default PlaybackMenuContent;
