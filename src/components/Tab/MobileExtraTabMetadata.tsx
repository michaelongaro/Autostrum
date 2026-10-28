import { useEffect, useState } from "react";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import ChordName from "~/components/ui/ChordName";
import ExtraTabMetadataPane from "./ExtraTabMetadataPane";
import styles from "./ExtraTabMetadataPane.module.css";
import useExtraTabMetadataLayout, {
  type MetadataPane,
} from "~/hooks/useExtraTabMetadataLayout";

function MobileExtraTabMetadata() {
  const {
    sectionProgression,
    chords,
    strummingPatterns,
    previewMetadata,
    currentInstrument,
    audioMetadata,
    chordDisplayMode,
    pauseAudio,
    playPreview,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    audioMetadata: state.audioMetadata,
    chordDisplayMode: state.chordDisplayMode,
    pauseAudio: state.pauseAudio,
    playPreview: state.playPreview,
  }));

  const [activeTabName, setActiveTabName] = useState<MetadataPane>(
    "Section progression",
  );
  const [tabContentExpanded, setTabContentExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const { contentRef, height, hasOverflow, hasAnyOverflow } =
    useExtraTabMetadataLayout(activeTabName, tabContentExpanded);

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselContentApi, setCarouselContentApi] =
    useState<CarouselApi | null>(null);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] = useState<
    boolean[]
  >([]);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  useEffect(() => {
    if (!carouselApi || !carouselContentApi) return;

    function handleContentSelect() {
      if (!carouselApi || !carouselContentApi) return;

      const currentIndex = carouselContentApi.selectedScrollSnap();

      switch (currentIndex) {
        case 0:
          carouselApi.scrollTo(0, !!reduceMotion);
          setActiveTabName("Section progression");
          break;
        case 1:
          carouselApi.scrollTo(1, !!reduceMotion);
          setActiveTabName("Chords");
          break;
        case 2:
          carouselApi.scrollTo(2, !!reduceMotion);
          setActiveTabName("Strumming patterns");
          break;
        default:
          carouselApi.scrollTo(0, !!reduceMotion);
          setActiveTabName("Section progression");
      }
    }

    carouselContentApi.on("select", handleContentSelect);
    carouselContentApi.on("reInit", handleContentSelect);
    handleContentSelect();

    return () => {
      carouselContentApi.off("select", handleContentSelect);
      carouselContentApi.off("reInit", handleContentSelect);
    };
  }, [carouselApi, carouselContentApi, reduceMotion]);

  return (
    <div className="baseVertFlex w-full gap-4">
      {/* tab selector + expand/collapse toggle*/}
      <div className="baseFlex w-full !justify-between gap-2 sm:!justify-center">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            dragFree: true,
            breakpoints: {
              "(min-width: 640px)": {
                active: false,
              },
            },
          }}
          className={`baseFlex min-w-0 flex-1 ${hasAnyOverflow ? "max-w-[90%]" : "w-full"}`}
        >
          <CarouselContent className="pl-3">
            <CarouselItem className="baseFlex basis-auto">
              <Button
                variant={"text"}
                aria-pressed={activeTabName === "Section progression"}
                onClick={() => {
                  carouselApi?.scrollTo(0, !!reduceMotion);
                  carouselContentApi?.scrollTo(0, !!reduceMotion);
                  setActiveTabName("Section progression");
                }}
                className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Section progression" ? "" : "opacity-50 hover:opacity-100"}`}
              >
                <BsMusicNoteList className="size-4" />
                Section progression
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 z-0 h-[2px] w-full rounded-full bg-foreground transition-opacity duration-200 motion-reduce:transition-none ${activeTabName === "Section progression" ? "opacity-100" : "opacity-0"}`}
                />
              </Button>
            </CarouselItem>

            <CarouselItem className="baseFlex basis-auto">
              <Button
                variant={"text"}
                aria-pressed={activeTabName === "Chords"}
                onClick={() => {
                  carouselApi?.scrollTo(1, !!reduceMotion);
                  carouselContentApi?.scrollTo(1, !!reduceMotion);
                  setActiveTabName("Chords");
                }}
                className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Chords" ? "" : "opacity-50 hover:opacity-100"}`}
              >
                <BsMusicNoteBeamed className="size-4" />
                Chords
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 z-0 h-[2px] w-full rounded-full bg-foreground transition-opacity duration-200 motion-reduce:transition-none ${activeTabName === "Chords" ? "opacity-100" : "opacity-0"}`}
                />
              </Button>
            </CarouselItem>

            <CarouselItem className="baseFlex basis-auto pr-3">
              <Button
                variant={"text"}
                aria-pressed={activeTabName === "Strumming patterns"}
                onClick={() => {
                  carouselApi?.scrollTo(2, !!reduceMotion);
                  carouselContentApi?.scrollTo(2, !!reduceMotion);
                  setActiveTabName("Strumming patterns");
                }}
                className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Strumming patterns" ? "" : "opacity-50 hover:opacity-100"}`}
              >
                <Logo className="z-0 size-4" />
                Strumming patterns
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 z-0 h-[2px] w-full rounded-full bg-foreground transition-opacity duration-200 motion-reduce:transition-none ${activeTabName === "Strumming patterns" ? "opacity-100" : "opacity-0"}`}
                />
              </Button>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {hasAnyOverflow && (
          <Button
            variant={"text"}
            aria-label={
              hasOverflow && tabContentExpanded
                ? "Collapse extra tab metadata"
                : "Expand extra tab metadata"
            }
            aria-expanded={hasOverflow && tabContentExpanded}
            onClick={() => setTabContentExpanded((prev) => !prev)}
            disabled={!hasOverflow}
            className="baseFlex mr-[9px] shrink-0 !p-0"
          >
            <ChevronDown
              className={`size-[18px] transition-transform motion-reduce:transition-none ${
                hasOverflow && tabContentExpanded ? "rotate-180" : ""
              }`}
            />
          </Button>
        )}
      </div>

      {/* tab content */}
      <motion.div
        ref={contentRef}
        data-metadata-viewport
        initial={false}
        animate={{ height }}
        transition={{
          duration: reduceMotion ? 0 : 0.25,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`w-full overflow-hidden ${hasOverflow && !tabContentExpanded ? styles.overflowFade : ""}`}
        style={{ overflowAnchor: "none" }}
      >
        <Carousel
          setApi={setCarouselContentApi}
          opts={{ duration: reduceMotion ? 0 : 25 }}
          className="w-full"
        >
          <CarouselContent className="!ml-0 items-start">
            <CarouselItem className="basis-full !pl-0">
              <ExtraTabMetadataPane
                name="Section progression"
                active={activeTabName === "Section progression"}
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
                            <p>
                              {formatSecondsToMinutes(section.startSeconds)}
                            </p>
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
            </CarouselItem>

            <CarouselItem className="basis-full !pl-0">
              <ExtraTabMetadataPane
                name="Chords"
                active={activeTabName === "Chords"}
              >
                {chords.length === 0 ? (
                  <p className="baseFlex h-24 text-gray">No chords specified</p>
                ) : (
                  <div
                    data-metadata-items
                    className={`grid w-fit max-w-full ${chords.length === 1 ? "grid-cols-1" : "grid-cols-2"} items-start justify-items-center gap-x-12 gap-y-6 sm:flex sm:w-full sm:flex-wrap sm:justify-center`}
                  >
                    {chords.map((chord, index) => (
                      <div
                        key={chord.id}
                        className="baseFlex min-w-0 max-w-full last:odd:col-span-full sm:max-w-[175px]"
                      >
                        <div className="baseVertFlex min-w-0 max-w-full gap-3">
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
                                  audioMetadata.playing ||
                                    previewMetadata.playing
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

                          <div className="h-[118px] max-w-full">
                            <ChordDiagram originalFrets={chord.frets} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ExtraTabMetadataPane>
            </CarouselItem>

            <CarouselItem className="basis-full !pl-0">
              <ExtraTabMetadataPane
                name="Strumming patterns"
                active={activeTabName === "Strumming patterns"}
              >
                {strummingPatterns.length === 0 ? (
                  <p className="baseFlex h-24 text-gray">
                    No strumming patterns specified
                  </p>
                ) : (
                  <div
                    data-metadata-items
                    className="baseFlex w-full flex-wrap !items-start gap-x-8 gap-y-6 px-8"
                  >
                    {strummingPatterns.map((pattern, index) => (
                      <div
                        key={pattern.id}
                        className="baseVertFlex max-w-full !items-start"
                      >
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
                                const prevArtificalPlayButtonTimeout = [
                                  ...prev,
                                ];
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
                        <div className="baseFlex border-b-none max-w-full rounded-md border-2">
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
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </motion.div>
    </div>
  );
}

export default MobileExtraTabMetadata;
