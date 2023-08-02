import { Label } from "~/components/ui/label";
import { motion } from "framer-motion";
import { useRef } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { shallow } from "zustand/shallow";
import { useTabStore, type Chord as ChordType } from "~/stores/TabStore";
import Chord from "../Tab/Chord";
import { Button } from "../ui/button";
import { isEqual } from "lodash";
import { Input } from "../ui/input";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface ChordModal {
  chordBeingEdited: { index: number; value: ChordType };
}

function ChordModal({ chordBeingEdited }: ChordModal) {
  const innerModalRef = useRef<HTMLDivElement>(null);

  const { chords, setChords, setChordBeingEdited, tabData, setTabData } =
    useTabStore(
      (state) => ({
        chords: state.chords,
        setChords: state.setChords,
        setChordBeingEdited: state.setChordBeingEdited,
        tabData: state.tabData,
        setTabData: state.setTabData,
      }),
      shallow
    );

  function handleChordNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    const allowAnyValidLetterOrNumber = /^[\p{L}\p{N} ]+$/gu;

    if (
      value.length > 10 ||
      (value.length > 0 && !allowAnyValidLetterOrNumber.test(value))
    )
      return;

    const modifiedChord = { ...chordBeingEdited };
    modifiedChord.value.name = value;

    setChordBeingEdited(modifiedChord);
  }

  function handleSaveChord() {
    const chordNameAlreadyExists = chords.some(
      (chord, index) =>
        chord.name === chordBeingEdited.value.name &&
        index !== chordBeingEdited.index
    );

    if (chordNameAlreadyExists) {
      // show error message
    } else {
      // update chord name of all strumming patterns that use this chord
      // if the chord name has changed.

      if (
        chords[chordBeingEdited.index]?.name !== chordBeingEdited.value.name
      ) {
        const newTabData = [...tabData];

        for (
          let sectionIndex = 0;
          sectionIndex < newTabData.length;
          sectionIndex++
        ) {
          const section = newTabData[sectionIndex];

          if (!section) continue;

          for (
            let subSectionIndex = 0;
            subSectionIndex < section.data.length;
            subSectionIndex++
          ) {
            const subSection = section.data[subSectionIndex];

            if (subSection?.type === "chord") {
              for (
                let chordSequenceIndex = 0;
                chordSequenceIndex < subSection.data.length;
                chordSequenceIndex++
              ) {
                const chordGroup = subSection.data[chordSequenceIndex];
                if (!chordGroup) continue;
                for (
                  let chordIndex = 0;
                  chordIndex < chordGroup.data.length;
                  chordIndex++
                ) {
                  const chordName = chordGroup.data[chordIndex];
                  if (!chordName) continue;

                  if (chordName === chords[chordBeingEdited.index]?.name) {
                    // @ts-expect-error undefined checks are done above
                    newTabData[sectionIndex].data[subSectionIndex].data[
                      chordSequenceIndex
                    ]!.data[chordIndex] = chordBeingEdited.value.name;
                  }
                }
              }
            }
          }
        }

        setTabData(newTabData);
      }

      // save chord
      const newChords = [...chords];

      // decomposed shallow copy of frets so that the chord elem won't get updated
      // when the chord is edited in the chord modal
      const newChord = { ...chordBeingEdited.value };
      newChords[chordBeingEdited.index] = {
        name: newChord.name,
        frets: [...newChord.frets],
      };
      setChordBeingEdited(null);
      setChords(newChords);
    }
  }

  return (
    <motion.div
      key={"ChordModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100vh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setChordBeingEdited(null);
        }
      }}
    >
      <div
        ref={innerModalRef}
        className="baseVertFlex min-w-[300px] max-w-[80vw] gap-8 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 xl:max-w-[50vw]"
      >
        {/* chord title */}
        <div className="baseVertFlex !items-start gap-2">
          <Label>Chord name</Label>
          <Input
            placeholder="Chord name (e.g. Cmaj7)"
            value={chordBeingEdited?.value?.name}
            onChange={handleChordNameChange}
            className="w-[200px]"
          />
        </div>

        <div className="baseFlex lightestGlassmorphic max-w-[23rem] gap-4 rounded-md p-2">
          <HiOutlineInformationCircle className="h-6 w-6" />
          <div>
            <span>You can quickly enter major or minor chords with</span>
            <span className="font-semibold"> A-G </span>
            <span>or</span>
            <span className="font-semibold"> a-g </span>
            <span>respectively.</span>
          </div>
        </div>

        <Chord chordBeingEdited={chordBeingEdited} editing={true} />

        <div className="baseVertFlex gap-8">
          <Button className="baseFlex gap-4">
            {/* conditional play/pause icon here */}
            Preview chord
          </Button>

          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => setChordBeingEdited(null)}
            >
              Close
            </Button>
            <Button
              disabled={
                chordBeingEdited.value.frets.every((fret) => fret === "") ||
                chordBeingEdited.value.name === "" ||
                isEqual(chordBeingEdited.value, chords[chordBeingEdited.index])
              }
              onClick={handleSaveChord}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ChordModal;
