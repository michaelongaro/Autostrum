import { useState, useRef } from "react";
import { type Chord as ChordType, useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { motion } from "framer-motion";
import { parse, toString } from "~/utils/tunings";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "@radix-ui/react-label";
import { HiOutlineInformationCircle } from "react-icons/hi";
import Chord from "../Tab/Chord";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface ChordModal {
  chordThatIsBeingEdited: { index: number; value: ChordType };
}

function ChordModal({ chordThatIsBeingEdited }: ChordModal) {
  const innerModalRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const { tuning, chords, setChords, setChordThatIsBeingEdited } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      chords: state.chords,
      setChords: state.setChords,
      setChordThatIsBeingEdited: state.setChordThatIsBeingEdited,
    }),
    shallow
  );

  // maybe have separate function for input change to check if name already exists
  function handleChordNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    if (value.length > 10) return;

    const modifiedChord = { ...chordThatIsBeingEdited };
    modifiedChord.value.name = value;

    setChordThatIsBeingEdited(modifiedChord);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const value = e.target.value;

    // regular notes
    // wanted to always allow a-g in regular note even if there was a number
    // present for easy placement of chords
    let valueHasAChordLetter = false;
    let chordLetter = "";
    for (let i = 0; i < value.length; i++) {
      if ("abcdefgABCDEFG".includes(value.charAt(i))) {
        valueHasAChordLetter = true;
        chordLetter = value.charAt(i);
        break;
      }
    }
    if (valueHasAChordLetter) {
      // capital letter means major chord
      // lowercase letter means minor chord

      let chordArray: string[] = [];
      if (chordLetter === "A") {
        chordArray = ["", "0", "2", "2", "2", "0"];
      } else if (chordLetter === "a") {
        chordArray = ["", "0", "2", "2", "1", "0"];
      } else if (chordLetter === "B") {
        chordArray = ["", "2", "4", "4", "4", "2"];
      } else if (chordLetter === "b") {
        chordArray = ["", "2", "4", "4", "3", "2"];
      } else if (chordLetter === "C") {
        chordArray = ["", "3", "2", "0", "1", "0"];
      } else if (chordLetter === "c") {
        chordArray = ["", "3", "5", "5", "4", "3"];
      } else if (chordLetter === "D") {
        chordArray = ["", "", "0", "2", "3", "2"];
      } else if (chordLetter === "d") {
        chordArray = ["", "", "0", "2", "3", "1"];
      } else if (chordLetter === "E") {
        chordArray = ["0", "2", "2", "1", "0", "0"];
      } else if (chordLetter === "e") {
        chordArray = ["0", "2", "2", "0", "0", "0"];
      } else if (chordLetter === "F") {
        chordArray = ["1", "3", "3", "2", "1", "1"];
      } else if (chordLetter === "f") {
        chordArray = ["1", "3", "3", "1", "1", "1"];
      } else if (chordLetter === "G") {
        chordArray = ["3", "2", "0", "0", "0", "3"];
      } else if (chordLetter === "g") {
        chordArray = ["3", "5", "5", "3", "3", "3"];
      }

      setChordThatIsBeingEdited({
        ...chordThatIsBeingEdited,
        value: {
          ...chordThatIsBeingEdited.value,
          frets: chordArray.reverse(),
        },
      });

      return;
    }

    const numberPattern = /^(?:[1-9]|1[0-9]|2[0-2]|0)$/;

    if (value !== "" && !numberPattern.test(value)) return;

    const newChordData = [...chordThatIsBeingEdited.value.frets];

    newChordData[index] = value;

    setChordThatIsBeingEdited({
      ...chordThatIsBeingEdited,
      value: {
        ...chordThatIsBeingEdited.value,
        frets: newChordData,
      },
    });

    return;
  }

  function handleSaveChord() {
    const chordNameAlreadyExists = chords.some(
      (chord, index) =>
        chord.name === chordThatIsBeingEdited.value.name &&
        index !== chordThatIsBeingEdited.index
    );

    if (chordNameAlreadyExists) {
      // show error message
    } else {
      // save chord
      const newChords = [...chords];
      newChords[chordThatIsBeingEdited.index] = chordThatIsBeingEdited.value;
      setChords(newChords);
      setChordThatIsBeingEdited(null);
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
          setChordThatIsBeingEdited(null);
        }
      }}
    >
      <div
        ref={innerModalRef}
        className="baseVertFlex min-w-[300px] max-w-[80vw] gap-8 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 xl:max-w-[50vw]"
      >
        {/* chord title */}
        <div className="baseVertFlex !items-start gap-2">
          <Label>Chord Name</Label>
          <Input
            placeholder="Chord name (e.g. Cmaj7)"
            value={chordThatIsBeingEdited?.value?.name}
            onChange={handleChordNameChange}
            className="w-[200px]"
          />
        </div>

        <div className="baseFlex lightGlassmorphic gap-4 rounded-md p-2">
          <HiOutlineInformationCircle className="h-6 w-6" />
          <div>
            <span>You can quickly enter major or minor chords with</span>
            <span className="font-semibold"> A-G </span>
            <span>or</span>
            <span className="font-semibold"> a-g </span>
            <span>respectively.</span>
          </div>
        </div>

        <Chord chordThatIsBeingEdited={chordThatIsBeingEdited} editing={true} />

        <div className="baseVertFlex gap-8">
          <Button className="baseFlex gap-4">
            {/* conditional play/pause icon here */}
            Preview chord
          </Button>

          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => setChordThatIsBeingEdited(null)}
            >
              Close
            </Button>
            <Button onClick={handleSaveChord}>Save</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ChordModal;
