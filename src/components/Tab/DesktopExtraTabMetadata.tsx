import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { motion, useReducedMotion } from "framer-motion";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import { ChevronDown } from "lucide-react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import { BsMusicNoteList } from "react-icons/bs";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import Logo from "~/components/ui/icons/Logo";
import ChordName from "~/components/ui/ChordName";
import ExtraTabMetadataPane from "./ExtraTabMetadataPane";
import useExtraTabMetadataLayout, {
  type MetadataPane,
} from "~/hooks/useExtraTabMetadataLayout";

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
    chordDisplayMode,
    theme,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    playPreview: state.playPreview,
    chordDisplayMode: state.chordDisplayMode,
    theme: state.theme,
  }));

  const [activeTabName, setActiveTabName] = useState<MetadataPane>(
    "Section progression",
  );
  const [tabContentExpanded, setTabContentExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const { contentRef, height, hasOverflow } = useExtraTabMetadataLayout(
    activeTabName,
    tabContentExpanded,
  );

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
      <div className="baseFlex !items-start gap-16 rounded-lg bg-accent px-8 py-1">
        <Button
          variant={"text"}
          aria-pressed={activeTabName === "Section progression"}
          onClick={() => setActiveTabName("Section progression")}
          className={`baseFlex relative gap-2 text-nowrap !px-0 text-lg font-medium text-primary-foreground hover:!text-primary-foreground/90 active:!text-primary-foreground/80 ${activeTabName === "Section progression" ? "" : "opacity-50 hover:opacity-100"}`}
        >
          <BsMusicNoteList className="size-4" />
          Section progression
          {activeTabName === "Section progression" && (
            <motion.span
              layoutId="desktopActiveTabUnderline"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className={`absolute left-0 z-0 h-[2px] w-full rounded-full bg-primary-foreground ${theme === "light" ? "bottom-0" : "bottom-[-4px]"}`}
            />
          )}
        </Button>

        <Button
          variant={"text"}
          aria-pressed={activeTabName === "Chords"}
          onClick={() => setActiveTabName("Chords")}
          className={`baseFlex relative gap-2 text-nowrap !px-0 text-lg font-medium text-primary-foreground hover:!text-primary-foreground/90 active:!text-primary-foreground/80 ${activeTabName === "Chords" ? "" : "opacity-50 hover:opacity-100"}`}
        >
          <BsMusicNoteBeamed className="size-4" />
          Chords
          {activeTabName === "Chords" && (
            <motion.span
              layoutId="desktopActiveTabUnderline"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className={`absolute left-0 z-0 h-[2px] w-full rounded-full bg-primary-foreground ${theme === "light" ? "bottom-0" : "bottom-[-4px]"}`}
            />
          )}
        </Button>

        <Button
          variant={"text"}
          aria-pressed={activeTabName === "Strumming patterns"}
          onClick={() => setActiveTabName("Strumming patterns")}
          className={`baseFlex relative gap-2 text-nowrap !px-0 text-lg font-medium text-primary-foreground hover:!text-primary-foreground/90 active:!text-primary-foreground/80 ${activeTabName === "Strumming patterns" ? "" : "opacity-50 hover:opacity-100"}`}
        >
          <Logo className="z-0 size-4" />
          Strumming patterns
          {activeTabName === "Strumming patterns" && (
            <motion.span
              layoutId="desktopActiveTabUnderline"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className={`absolute left-0 z-0 h-[2px] w-full rounded-full bg-primary-foreground ${theme === "light" ? "bottom-0" : "bottom-[-4px]"}`}
            />
          )}
        </Button>
      </div>

      {/* tab content */}
      <motion.div
        ref={contentRef}
        data-metadata-viewport
        initial={false}
        animate={{ height: height + (hasOverflow ? 40 : 0) }}
        transition={{
          duration: reduceMotion ? 0 : 0.25,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-full overflow-hidden"
        style={{ overflowAnchor: "none" }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ bottom: hasOverflow ? 40 : 0 }}
        >
          <ExtraTabMetadataPane
            name="Section progression"
            active={activeTabName === "Section progression"}
            desktop
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
          </ExtraTabMetadataPane>

          <ExtraTabMetadataPane
            name="Chords"
            active={activeTabName === "Chords"}
            desktop
          >
            {chords.length === 0 ? (
              <span className="baseFlex h-24 text-gray">
                No chords specified
              </span>
            ) : (
              <div
                data-metadata-items
                className="baseFlex w-full flex-wrap !items-start gap-8"
              >
                {chords.map((chord, index) => (
                  <div key={chord.id} className="baseFlex">
                    <div className="baseVertFlex gap-3">
                      <div className="baseFlex w-full !justify-between gap-2 border-b pb-2">
                        <ChordName
                          name={chord.name}
                          color={chord.color}
                          truncate={false}
                          showFullName={true}
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
                            previewMetadata.indexOfPattern === index &&
                            previewMetadata.playing &&
                            previewMetadata.type === "chord"
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
          </ExtraTabMetadataPane>

          <ExtraTabMetadataPane
            name="Strumming patterns"
            active={activeTabName === "Strumming patterns"}
            desktop
          >
            {strummingPatterns.length === 0 ? (
              <p className="baseFlex h-24 text-gray">
                No strumming patterns specified
              </p>
            ) : (
              <div
                data-metadata-items
                className="baseFlex w-full flex-wrap !items-start gap-8"
              >
                {strummingPatterns.map((pattern, index) => (
                  <div key={pattern.id} className="baseVertFlex !items-start">
                    <Button
                      variant={"audio"}
                      size={"sm"}
                      disabled={artificalPlayButtonTimeout[index]}
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
                        currentInstrument={currentInstrument}
                        previewMetadata={previewMetadata}
                        indexOfPattern={index}
                        previewType="strummingPattern"
                      />
                    </Button>
                    <div className="baseFlex border-b-none rounded-md border-2">
                      <StrummingPattern
                        data={pattern}
                        mode="viewingWithHighlights"
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
          </ExtraTabMetadataPane>
        </div>

        <motion.div
          aria-hidden={!hasOverflow}
          inert={!hasOverflow}
          initial={false}
          animate={{ opacity: hasOverflow ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
          className="baseFlex absolute inset-x-0 bottom-0 h-10"
        >
          <Button
            variant="link"
            aria-expanded={tabContentExpanded}
            onClick={() => setTabContentExpanded((prev) => !prev)}
            className="baseFlex gap-2 !p-0"
          >
            <ChevronDown
              className={`size-4 transition-transform motion-reduce:transition-none ${tabContentExpanded ? "rotate-180" : ""}`}
            />
            <span className="font-medium">
              See {tabContentExpanded ? "less" : "more"}
            </span>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default DesktopExtraTabMetadata;
