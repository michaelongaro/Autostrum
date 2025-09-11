import { AnimatePresence, motion } from "framer-motion";
import { Fragment } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useTabStore,
  type ChordSection as ChordSectionType,
  type ChordSequence as ChordSequenceType,
  type Section,
} from "~/stores/TabStore";
import {
  chordSequencesAllHaveSameNoteLength,
  QuarterNote,
} from "~/utils/bpmIconRenderingHelpers";
import ChordSequence from "./ChordSequence";
import MiscellaneousControls from "./MiscellaneousControls";
import type { Updater } from "use-immer";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.5,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
};
export interface ChordSection {
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: ChordSectionType;
  tabData: Section[];
  setTabData: Updater<Section[]>;
}

function ChordSection({
  sectionIndex,
  subSectionIndex,
  subSectionData,
  tabData,
  setTabData,
}: ChordSection) {
  const { bpm } = useTabStore((state) => ({
    bpm: state.bpm,
  }));

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);

    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "chord") {
        subSection.repetitions = newRepetitions;
      }
    });
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "chord") {
        subSection.bpm = newBpm;
      }
    });
  }

  function addAnotherChordSequence() {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "chord") {
        subSection.data.push({
          id: crypto.randomUUID(),
          repetitions: 1,
          bpm: -1,
          // @ts-expect-error the correct strummingPattern will get set in <ChordSequence /> if it is available
          strummingPattern: {} as StrummingPattern,
          data: [], // this will also get set in <ChordSequence />
        });
      }
    });
  }

  return (
    <motion.div
      key={subSectionData.id}
      layout={"position"}
      variants={opacityAndScaleVariants}
      initial={"closed"}
      animate={"expanded"}
      exit={"closed"}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      className="baseVertFlex relative h-full w-full !justify-start gap-4 rounded-md border bg-secondary-active/50 p-4 shadow-md md:p-8"
    >
      <div className="baseFlex w-full !items-start">
        <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
          <div className="baseFlex gap-2">
            <div className="baseFlex gap-2">
              <Label
                htmlFor={`sectionIndex${sectionIndex}subSectionIndex${subSectionIndex}bpm`}
              >
                BPM
              </Label>

              <div className="baseFlex">
                <QuarterNote className="-ml-1 size-5" />

                <Input
                  id={`sectionIndex${sectionIndex}subSectionIndex${subSectionIndex}bpm`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-[52px] px-2.5"
                  placeholder={
                    subSectionData.bpm === -1
                      ? bpm === -1
                        ? ""
                        : bpm.toString()
                      : subSectionData.bpm.toString()
                  }
                  value={
                    subSectionData.bpm === -1
                      ? ""
                      : subSectionData.bpm.toString()
                  }
                  onChange={handleBpmChange}
                />
              </div>
            </div>

            <div className="baseFlex gap-2">
              <Label
                htmlFor={`sectionIndex${sectionIndex}subSectionIndex${subSectionIndex}repetitions`}
              >
                Repetitions
              </Label>
              <div className="relative w-12">
                <span className="absolute bottom-[9px] left-2 text-sm">x</span>
                <Input
                  id={`sectionIndex${sectionIndex}subSectionIndex${subSectionIndex}repetitions`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1"
                  className="w-[45px] pl-4"
                  value={
                    subSectionData.repetitions === -1
                      ? ""
                      : subSectionData.repetitions.toString()
                  }
                  onChange={handleRepetitionsChange}
                />
              </div>
            </div>
          </div>
        </div>
        <MiscellaneousControls
          type={"chord"}
          sectionIndex={sectionIndex}
          subSectionIndex={subSectionIndex}
          tabData={tabData}
          setTabData={setTabData}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${subSectionData.id}ChordSectionWrapper`}
          layout={"position"}
          variants={opacityAndScaleVariants}
          initial={"closed"}
          animate={"expanded"}
          exit={"closed"}
          transition={{
            layout: {
              type: "spring",
              bounce: 0.15,
              duration: 1,
            },
          }}
          className="baseVertFlex w-full !items-end !justify-start gap-6"
        >
          {subSectionData.data.map((chordSequence, index) => (
            <Fragment key={`${chordSequence.id}wrapper`}>
              <div className="baseVertFlex w-full !items-start">
                <AnimatePresence mode="wait">
                  <ChordSequence
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    chordSequenceIndex={index}
                    chordSequenceData={chordSequence}
                    subSectionData={subSectionData}
                    tabData={tabData}
                    setTabData={setTabData}
                  />
                </AnimatePresence>
              </div>
            </Fragment>
          ))}
        </motion.div>
      </AnimatePresence>

      <Button onClick={addAnotherChordSequence}>Add chord progression</Button>
    </motion.div>
  );
}

export default ChordSection;
