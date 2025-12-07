import { motion } from "framer-motion";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useState } from "react";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import { type LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import { Button } from "~/components/ui/button";
import ChordName from "~/components/ui/ChordName";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";

function PlaybackMenuContent() {
  const {
    sectionProgression,
    currentInstrument,
    chords,
    strummingPatterns,
    audioMetadata,
    previewMetadata,
    playPreview,
    pauseAudio,
    playbackModalViewingState,
    chordDisplayMode,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    currentInstrument: state.currentInstrument,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    audioMetadata: state.audioMetadata,
    previewMetadata: state.previewMetadata,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
    playbackModalViewingState: state.playbackModalViewingState,
    chordDisplayMode: state.chordDisplayMode,
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
            <p className="text-lg font-semibold text-gray">
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
                    <span className="text-gray">
                      {formatSecondsToMinutes(section.startSeconds)}
                    </span>
                    <span className="text-gray">-</span>
                    <span className="text-gray">
                      {formatSecondsToMinutes(section.endSeconds)}
                    </span>
                  </div>

                  <div className="baseFlex gap-2">
                    <p className="text-nowrap font-semibold">{section.title}</p>
                    {section.repetitions > 1 && <p>({section.repetitions}x)</p>}
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
            <div className="baseFlex max-h-[calc(100dvh-6rem)] w-full flex-wrap gap-8 overflow-y-auto px-8">
              <>
                {chords.map((chord, index) => (
                  <div key={chord.id} className="baseFlex">
                    <div className="baseVertFlex gap-3">
                      <div className="baseFlex w-full !justify-between border-b py-2">
                        <ChordName
                          name={chord.name}
                          color={chord.color}
                          truncate={false}
                          isHighlighted={
                            chordDisplayMode === "color"
                              ? false
                              : previewMetadata.indexOfPattern === index &&
                                  previewMetadata.playing &&
                                  previewMetadata.type === "chord"
                                ? true
                                : false
                          }
                        />

                        {/* preview chord button */}
                        <Button
                          variant={"audio"}
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
                            currentInstrument={currentInstrument}
                            previewMetadata={previewMetadata}
                            indexOfPattern={index}
                            previewType="chord"
                          />
                        </Button>
                      </div>

                      <div className="h-36">
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
          className={`baseVertFlex h-full ${strummingPatterns.length > 0 ? "max-h-[520px] pb-8" : ""}`}
        >
          {strummingPatterns.length > 0 ? (
            <OverlayScrollbarsComponent
              options={{
                scrollbars: { autoHide: "leave", autoHideDelay: 150 },
              }}
              defer
              className="w-full"
            >
              <div className="baseVertFlex size-full !justify-start gap-10">
                {strummingPatterns.map((pattern, index) => (
                  <div key={pattern.id} className="shrink-0 overflow-hidden">
                    <div className="baseVertFlex !items-start">
                      <Button
                        variant={"audio"}
                        size={"sm"}
                        disabled={
                          !currentInstrument ||
                          artificalPlayButtonTimeout[index]
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
                                const prevArtificalPlayButtonTimeout = [
                                  ...prev,
                                ];
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
                          currentInstrument={currentInstrument}
                          previewMetadata={previewMetadata}
                          indexOfPattern={index}
                          previewType="strummingPattern"
                        />
                      </Button>
                      <div className="baseFlex border-b-none rounded-md border-2">
                        <StrummingPattern
                          data={pattern}
                          mode="viewing"
                          index={index}
                          lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                          setLastModifiedPalmMuteNode={
                            setLastModifiedPalmMuteNode
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </OverlayScrollbarsComponent>
          ) : (
            <div>No strumming patterns were specified for this tab.</div>
          )}
        </motion.div>
      )}
    </>
  );
}

export default PlaybackMenuContent;
