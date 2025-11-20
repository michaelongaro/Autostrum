import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { AnimatePresence, motion } from "framer-motion";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import { ChevronDown } from "lucide-react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import { BsMusicNoteList } from "react-icons/bs";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import Logo from "~/components/ui/icons/Logo";

function DesktopExtraTabMetadata() {
  const {
    sectionProgression,
    chords,
    strummingPatterns,
    previewMetadata,
    currentInstrument,
    audioMetadata,
    pauseAudio,
    playPreview,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    playPreview: state.playPreview,
  }));

  const [activeTabName, setActiveTabName] = useState("Section progression");
  const [tabContentExpanded, setTabContentExpanded] = useState(false);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] = useState<
    boolean[]
  >([]);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  return (
    <div className="baseVertFlex w-3/4 gap-4">
      {/* tab selector */}
      <div className="baseFlex !items-start gap-16 rounded-lg rounded-t-none bg-accent px-8 py-1">
        <Button
          variant={"text"}
          onClick={() => setActiveTabName("Section progression")}
          className={`baseFlex relative gap-2 text-nowrap !px-0 text-lg font-medium text-primary-foreground hover:!text-primary-foreground/90 active:!text-primary-foreground/80 ${activeTabName === "Section progression" ? "" : "opacity-50 hover:opacity-100"}`}
        >
          <BsMusicNoteList className="size-4" />
          Section progression
          {activeTabName === "Section progression" && (
            <motion.span
              layoutId="activeTabUnderline"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className="absolute bottom-[-4px] left-0 z-0 h-[2px] w-full rounded-full bg-primary-foreground"
            />
          )}
        </Button>

        <Button
          variant={"text"}
          onClick={() => setActiveTabName("Chords")}
          className={`baseFlex relative gap-2 text-nowrap !px-0 text-lg font-medium text-primary-foreground hover:!text-primary-foreground/90 active:!text-primary-foreground/80 ${activeTabName === "Chords" ? "" : "opacity-50 hover:opacity-100"}`}
        >
          <BsMusicNoteBeamed className="size-4" />
          Chords
          {activeTabName === "Chords" && (
            <motion.span
              layoutId="activeTabUnderline"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className="absolute bottom-[-4px] left-0 z-0 h-[2px] w-full rounded-full bg-primary-foreground"
            />
          )}
        </Button>

        <Button
          variant={"text"}
          onClick={() => setActiveTabName("Strumming patterns")}
          className={`baseFlex relative gap-2 text-nowrap !px-0 text-lg font-medium text-primary-foreground hover:!text-primary-foreground/90 active:!text-primary-foreground/80 ${activeTabName === "Strumming patterns" ? "" : "opacity-50 hover:opacity-100"}`}
        >
          <Logo className="z-0 size-4" />
          Strumming patterns
          {activeTabName === "Strumming patterns" && (
            <motion.span
              layoutId="activeTabUnderline"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className="absolute bottom-[-4px] left-0 z-0 h-[2px] w-full rounded-full bg-primary-foreground"
            />
          )}
        </Button>
      </div>

      {/* tab content */}
      <div className="baseVertFlex w-full overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeTabName === "Section progression" && (
            <motion.div
              key="sectionProgressionTab"
              initial={{ opacity: 0, height: "6rem" }}
              animate={{
                opacity: 1,
                height: tabContentExpanded ? "auto" : "6rem",
              }}
              exit={{ opacity: 0, height: "6rem" }}
              transition={{ duration: 0.3, opacity: { duration: 0.15 } }}
              className="baseVertFlex !justify-start gap-2 overflow-y-hidden"
            >
              <div className="baseFlex w-full">
                {sectionProgression.length === 0 ? (
                  <p className="baseFlex h-24 text-gray">
                    No section progression specified
                  </p>
                ) : (
                  <div
                    className={`baseVertFlex min-h-24 gap-2 ${sectionProgression.length > 3 ? "!justify-start" : ""}`}
                  >
                    {sectionProgression.map((section) => (
                      <div
                        key={section.id}
                        className="baseFlex w-full !justify-start gap-2"
                      >
                        <div className="baseFlex w-24 gap-2 text-gray">
                          <p>{formatSecondsToMinutes(section.startSeconds)}</p>
                          <span>-</span>
                          <p>{formatSecondsToMinutes(section.endSeconds)}</p>
                        </div>

                        <div className="baseFlex gap-2">
                          <p className="text-nowrap font-semibold">
                            {section.title}
                          </p>
                          {section.repetitions > 1 && (
                            <p>({section.repetitions}x)</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTabName === "Chords" && (
            <motion.div
              key="chordsTab"
              initial={{ opacity: 0, height: "6rem" }}
              animate={{
                opacity: 1,
                height: tabContentExpanded
                  ? "auto"
                  : chords.length === 0
                    ? "6rem"
                    : "10rem",
              }}
              exit={{
                opacity: 0,
                height: "6rem",
              }}
              transition={{ duration: 0.3, opacity: { duration: 0.15 } }}
              className="baseVertFlex w-full !justify-start overflow-y-hidden"
            >
              {chords.length === 0 ? (
                <span className="baseFlex h-24 text-gray">
                  No chords specified
                </span>
              ) : (
                <div className="baseFlex flex-wrap !items-start gap-8">
                  {chords.map((chord, index) => (
                    <div key={chord.id} className="baseFlex max-w-[175px]">
                      <div className="baseVertFlex gap-3">
                        <div className="baseFlex w-full !justify-between gap-2 border-b pb-2">
                          <span
                            style={{
                              color:
                                previewMetadata.indexOfPattern === index &&
                                previewMetadata.playing &&
                                previewMetadata.type === "chord"
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--foreground))",
                            }}
                            className="font-semibold transition-colors"
                          >
                            {chord.name}
                          </span>

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
                            className="baseFlex h-6 w-10 rounded-sm"
                          >
                            <PlayButtonIcon
                              uniqueLocationKey={`chordPreview${index}`}
                              currentInstrument={currentInstrument}
                              previewMetadata={previewMetadata}
                              indexOfPattern={index}
                              previewType="chord"
                              size={"0.7rem"}
                            />
                          </Button>
                        </div>

                        <div className="h-[118px]">
                          <ChordDiagram originalFrets={chord.frets} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTabName === "Strumming patterns" && (
            <motion.div
              key="strummingPatternsTab"
              initial={{ opacity: 0, height: "6rem" }}
              animate={{
                opacity: 1,
                height: tabContentExpanded
                  ? "auto"
                  : strummingPatterns.length === 0
                    ? "6rem"
                    : "10rem",
              }}
              exit={{ opacity: 0, height: "6rem" }}
              transition={{ duration: 0.3, opacity: { duration: 0.15 } }}
              className={`baseVertFlex w-full overflow-y-hidden ${strummingPatterns.length > 2 ? "!justify-start" : ""}`}
            >
              {strummingPatterns.length === 0 ? (
                <p className="baseFlex h-24 text-gray">
                  No strumming patterns specified
                </p>
              ) : (
                <div className="baseFlex flex-wrap !items-start gap-8">
                  {strummingPatterns.map((pattern, index) => (
                    <div key={pattern.id} className="baseVertFlex !items-start">
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
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {((activeTabName === "Section progression" &&
            sectionProgression.length > 3) ||
            (activeTabName === "Chords" && chords.length > 6) ||
            (activeTabName === "Strumming patterns" &&
              strummingPatterns.length > 3)) && (
            <motion.div
              key={`expandTabContentButton`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, opacity: { duration: 0.15 } }}
              className="baseFlex w-full justify-center"
            >
              <Button
                variant={"link"}
                onClick={() => setTabContentExpanded((prev) => !prev)}
                className="baseFlex gap-2 !p-0"
              >
                <ChevronDown
                  className={`size-4 transition-transform ${
                    tabContentExpanded ? "rotate-180" : ""
                  }`}
                />
                <span className="font-medium">
                  see {tabContentExpanded ? "less" : "more"}
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DesktopExtraTabMetadata;
