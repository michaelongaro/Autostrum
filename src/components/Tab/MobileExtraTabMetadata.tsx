import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { AnimatePresence, motion } from "framer-motion";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import ChordDiagram from "~/components/Tab/Playback/ChordDiagram";
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

function MobileExtraTabMetadata() {
  const {
    sectionProgression,
    chords,
    strummingPatterns,
    previewMetadata,
    currentInstrument,
    audioMetadata,
    id,
    pauseAudio,
    playPreview,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    audioMetadata: state.audioMetadata,
    id: state.id,
    pauseAudio: state.pauseAudio,
    playPreview: state.playPreview,
  }));

  const [activeTabName, setActiveTabName] = useState("Section progression");
  const [tabContentExpanded, setTabContentExpanded] = useState(false);

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
          carouselApi.scrollTo(0);
          setActiveTabName("Section progression");
          break;
        case 1:
          carouselApi.scrollTo(1);
          setActiveTabName("Chords");
          break;
        case 2:
          carouselApi.scrollTo(2);
          setActiveTabName("Strumming patterns");
          break;
        default:
          carouselApi.scrollTo(0);
          setActiveTabName("Section progression");
      }
    }

    carouselContentApi.on("select", handleContentSelect);

    return () => {
      carouselContentApi.off("select", handleContentSelect);
    };
  }, [carouselApi, carouselContentApi]);

  return (
    <div className="baseVertFlex w-full gap-4">
      {/* sticky tab selector + expand/collapse toggle*/}
      <div className="baseFlex sticky left-0 top-16 w-full !justify-between gap-2 px-3 sm:!justify-center">
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
          className="baseFlex max-w-[90%]"
        >
          <CarouselContent>
            <CarouselItem className="baseFlex basis-auto">
              <Button
                variant={"text"}
                onClick={() => {
                  carouselApi?.scrollTo(0);
                  carouselContentApi?.scrollTo(0);
                }}
                className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Section progression" ? "" : "opacity-50 hover:opacity-100"}`}
              >
                <BsMusicNoteList className="size-4" />
                Section progression
                {activeTabName === "Section progression" && (
                  <motion.span
                    layoutId="activeTabUnderline"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className="absolute bottom-0 left-0 z-0 h-[2px] w-full bg-pink-50"
                  />
                )}
              </Button>
            </CarouselItem>

            <CarouselItem className="baseFlex basis-auto">
              <Button
                variant={"text"}
                onClick={() => {
                  carouselApi?.scrollTo(1);
                  carouselContentApi?.scrollTo(1);
                }}
                className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Chords" ? "" : "opacity-50 hover:opacity-100"}`}
              >
                <BsMusicNoteBeamed className="size-4" />
                Chords
                {activeTabName === "Chords" && (
                  <motion.span
                    layoutId="activeTabUnderline"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className="absolute bottom-0 left-0 z-0 h-[2px] w-full bg-pink-50"
                  />
                )}
              </Button>
            </CarouselItem>

            <CarouselItem className="baseFlex basis-auto">
              <Button
                variant={"text"}
                onClick={() => {
                  carouselApi?.scrollTo(2);
                  carouselContentApi?.scrollTo(2);
                }}
                className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Strumming patterns" ? "" : "opacity-50 hover:opacity-100"}`}
              >
                <Logo className="z-0 size-4" />
                Strumming patterns
                {activeTabName === "Strumming patterns" && (
                  <motion.span
                    layoutId="activeTabUnderline"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className="absolute bottom-0 left-0 z-0 h-[2px] w-full bg-pink-50"
                  />
                )}
              </Button>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        <Button
          variant={"text"}
          onClick={() => setTabContentExpanded((prev) => !prev)}
          className="baseFlex !p-0"
        >
          <ChevronDown
            className={`size-4 transition-transform ${
              tabContentExpanded ? "rotate-180" : ""
            }`}
          />
        </Button>
      </div>

      {/* tab content */}
      <div className="baseVertFlex w-full overflow-hidden">
        <Carousel setApi={setCarouselContentApi} className="w-full">
          <CarouselContent className="-ml-2 w-full">
            <CarouselItem className="baseFlex basis-full">
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
                        <p className="baseFlex h-24 text-stone-300">
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
                              <div className="baseFlex w-24 gap-2 text-stone-300">
                                <p>
                                  {formatSecondsToMinutes(section.startSeconds)}
                                </p>
                                <span>-</span>
                                <p>
                                  {formatSecondsToMinutes(section.endSeconds)}
                                </p>
                              </div>

                              <div className="baseFlex gap-2">
                                <p className="text-nowrap font-semibold">
                                  {section.title}
                                </p>
                                {section.repetitions > 1 && (
                                  <p>(x{section.repetitions})</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CarouselItem>

            <CarouselItem className="baseFlex basis-full">
              <AnimatePresence mode="wait" initial={false}>
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
                      <p className="baseFlex h-24 text-stone-300">
                        No chords specified
                      </p>
                    ) : (
                      <div className="baseFlex !flex-wrap !items-start gap-8">
                        {chords.map((chord, index) => (
                          <div
                            key={chord.id}
                            className="baseFlex max-w-[175px]"
                          >
                            <div className="baseVertFlex gap-3">
                              <div className="baseFlex w-full !justify-between gap-2 border-b pb-2">
                                <p
                                  style={{
                                    textShadow:
                                      previewMetadata.indexOfPattern ===
                                        index &&
                                      previewMetadata.playing &&
                                      previewMetadata.type === "chord"
                                        ? "none"
                                        : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
                                    color:
                                      previewMetadata.indexOfPattern ===
                                        index &&
                                      previewMetadata.playing &&
                                      previewMetadata.type === "chord"
                                        ? "hsl(335, 78%, 42%)"
                                        : "hsl(324, 77%, 95%)",
                                  }}
                                  className="font-semibold transition-colors"
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
                                    tabId={id}
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
              </AnimatePresence>
            </CarouselItem>

            <CarouselItem className="baseFlex basis-full">
              <AnimatePresence mode="wait" initial={false}>
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
                      <p className="baseFlex h-24 text-stone-300">
                        No strumming patterns specified
                      </p>
                    ) : (
                      <div className="baseFlex !flex-wrap !items-start gap-8">
                        {strummingPatterns.map((pattern, index) => (
                          <div
                            key={pattern.id}
                            className="baseVertFlex !items-start"
                          >
                            <Button
                              variant={"playPause"}
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
                                    const prevArtificalPlayButtonTimeout = [
                                      ...prev,
                                    ];
                                    prevArtificalPlayButtonTimeout[index] =
                                      true;
                                    return prevArtificalPlayButtonTimeout;
                                  });

                                  setTimeout(() => {
                                    setArtificalPlayButtonTimeout((prev) => {
                                      const prevArtificalPlayButtonTimeout = [
                                        ...prev,
                                      ];
                                      prevArtificalPlayButtonTimeout[index] =
                                        false;
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
                                    audioMetadata.playing ||
                                      previewMetadata.playing
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
                                lastModifiedPalmMuteNode={
                                  lastModifiedPalmMuteNode
                                }
                                setLastModifiedPalmMuteNode={
                                  setLastModifiedPalmMuteNode
                                }
                                pmNodeOpacities={[]} // placeholder
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}

export default MobileExtraTabMetadata;
