import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { Fragment, memo } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useTabStore,
  type ChordSection as ChordSectionType,
  type ChordSequence as ChordSequenceType,
} from "~/stores/TabStore";
import {
  chordSequencesAllHaveSameNoteLength,
  QuarterNote,
} from "~/utils/bpmIconRenderingHelpers";
import ChordSequence from "./ChordSequence";
import MiscellaneousControls from "./MiscellaneousControls";

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
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: ChordSectionType;
}

function ChordSection({
  sectionId,
  sectionIndex,
  subSectionIndex,
  subSectionData,
}: ChordSection) {
  const { bpm, getTabData, setTabData } = useTabStore((state) => ({
    bpm: state.bpm,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
  }));

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);

    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.repetitions =
      newRepetitions;

    setTabData(newTabData);
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.bpm = newBpm;

    setTabData(newTabData);
  }

  function addAnotherChordSequence() {
    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.data.push({
      id: crypto.randomUUID(),
      repetitions: 1,
      bpm: -1,
      // @ts-expect-error the correct strummingPattern will get set in <ChordSequence /> if it is available
      strummingPattern: {} as StrummingPattern,
      data: [], // this will also get set in <ChordSequence />
    });

    setTabData(newTabData);
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
      className="baseVertFlex relative h-full w-full !justify-start gap-4 rounded-md border bg-secondary-active p-4 shadow-md md:p-8"
    >
      <div className="baseFlex w-full !items-start">
        <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
          <div className="baseFlex gap-2">
            <div className="baseFlex gap-2">
              <Label>BPM</Label>

              <div className="baseFlex">
                <QuarterNote className="-ml-1 size-5" />

                <Input
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
              <Label>Repetitions</Label>
              <div className="relative w-12">
                <span className="absolute bottom-[9px] left-2 text-sm">x</span>
                <Input
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
          sectionId={sectionId}
          sectionIndex={sectionIndex}
          subSectionIndex={subSectionIndex}
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
                    sectionId={sectionId}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    chordSequenceIndex={index}
                    chordSequenceData={chordSequence}
                    subSectionData={subSectionData}
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

export default memo(ChordSection, (prevProps, nextProps) => {
  const { subSectionData: prevSubSectionData, ...restPrev } = prevProps;
  const { subSectionData: nextSubSectionDataData, ...restNext } = nextProps;

  // Custom comparison for getTabData() related prop
  if (!isEqual(prevSubSectionData, nextSubSectionDataData)) {
    return false; // props are not equal, so component should re-render
  }

  // Default shallow comparison for other props using Object.is()
  const allKeys = new Set([...Object.keys(restPrev), ...Object.keys(restNext)]);
  for (const key of allKeys) {
    // @ts-expect-error we know that these keys are in the objects
    if (!Object.is(restPrev[key], restNext[key])) {
      return false; // props are not equal, so component should re-render
    }
  }

  return true;
});
