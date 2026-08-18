import { AnimatePresence } from "framer-motion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useTabStore, type StrummingPattern } from "~/stores/TabStore";
import { QuarterNote } from "~/utils/noteLengthIcons";
import AnimatedListItem from "./AnimatedListItem";
import ChordSequence from "./ChordSequence";
import MiscellaneousControls from "./MiscellaneousControls";
import {
  useChordSequenceIds,
  useChordSubSectionMeta,
} from "~/hooks/useTabDataSelectors";

export interface ChordSection {
  sectionIndex: number;
  subSectionIndex: number;
}

function ChordSection({ sectionIndex, subSectionIndex }: ChordSection) {
  const { bpm, setTabData } = useTabStore((state) => ({
    bpm: state.bpm,
    setTabData: state.setTabData,
  }));

  const subSection = useChordSubSectionMeta(sectionIndex, subSectionIndex);
  const chordSequenceIds = useChordSequenceIds(sectionIndex, subSectionIndex);

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
          // Filled in by <ChordSequence /> once a real pattern exists.
          strummingPattern: {} as StrummingPattern,
          data: [],
        });
      }
    });
  }

  return (
    <div className="baseVertFlex relative w-full !justify-start gap-4 rounded-md border bg-secondary-active/25 p-4 shadow-md md:p-8">
      <div className="baseFlex w-full !items-start">
        <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
          <div className="baseFlex gap-2 lg:gap-4">
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
                    subSection.bpm === -1
                      ? bpm === -1
                        ? ""
                        : bpm.toString()
                      : subSection.bpm.toString()
                  }
                  value={subSection.bpm === -1 ? "" : subSection.bpm.toString()}
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
                <span className="pointer-events-none absolute bottom-[9px] left-2 text-sm">
                  x
                </span>
                <Input
                  id={`sectionIndex${sectionIndex}subSectionIndex${subSectionIndex}repetitions`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1"
                  className="w-[45px] px-2 pl-4"
                  value={
                    subSection.repetitions === -1
                      ? ""
                      : subSection.repetitions.toString()
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
        />
      </div>

      <div className="baseVertFlex w-full !items-end !justify-start">
        <AnimatePresence initial={false}>
          {chordSequenceIds.map((chordSequenceId, index) => (
            <AnimatedListItem
              key={chordSequenceId}
              contentClassName="mb-6 w-full"
            >
              <ChordSequence
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                chordSequenceIndex={index}
              />
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>

      <Button onClick={addAnotherChordSequence}>Add chord progression</Button>
    </div>
  );
}

export default ChordSection;
