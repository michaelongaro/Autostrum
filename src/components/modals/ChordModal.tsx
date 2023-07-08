import { useState, useRef } from "react";
import { type Chord, useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { motion } from "framer-motion";
import { parse, toString } from "~/utils/tunings";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "@radix-ui/react-label";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

// fyi: only ever showing chordmodal and strumming pattern modal if editing
// otherwise just on hover show chord modal as a tooltip, nothing for strumming pattern

interface ChordModal {
  chordThatIsBeingEdited: { index: number; value: Chord };
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

  // TODO: probably extract the chord input into its own component
  // so that it can also be used to render the chord "diagram" when clicking on chord
  // in viewing mode!

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
        className="baseVertFlex min-w-[300px] gap-8 rounded-md bg-pink-400 p-2 shadow-sm md:p-4"
      >
        {/* chord title */}
        <div className="baseVertFlex !items-start gap-2">
          <Label>Chord Name</Label>
          <Input
            placeholder="Abbreviated chord name (e.g. Cmaj7)"
            value={chordThatIsBeingEdited?.value?.name}
            onChange={handleChordNameChange}
            className="w-[300px]"
          />
        </div>

        {/* information "i" to let users know they can prefill with a-g or A-G */}

        {/* actual preview of tuning + chord */}
        <div className="baseFlex w-full">
          <div
            style={{
              height: "284px",
              gap: "1.35rem",
            }}
            className="baseVertFlex relative rounded-l-2xl border-2 border-pink-50 p-2"
          >
            {toString(parse(tuning), { pad: 1 })
              .split(" ")
              .reverse()
              .map((note, index) => (
                <div key={index}>{note}</div>
              ))}
          </div>

          <div className="baseVertFlex gap-2">
            {chordThatIsBeingEdited.value.frets.map((fret, index) => (
              <div
                key={index}
                style={{
                  borderTop: `${
                    index === 0 ? "2px solid rgb(253 242 248)" : "none"
                  }`,
                  paddingTop: `${index === 0 ? "0.45rem" : "0rem"}`,
                  borderBottom: `${
                    index === 5 ? "2px solid rgb(253 242 248)" : "none"
                  }`,
                  paddingBottom: `${index === 5 ? "0.45rem" : "0rem"}`,
                }}
                className="baseFlex"
              >
                <div className="h-[1px] w-2 bg-pink-50/50"></div>
                <Input
                  type="text"
                  autoComplete="off"
                  value={fret}
                  // onKeyDown={(e) => handleKeyDown(e, index)}
                  onChange={(e) => handleChange(e, index)}
                  style={{
                    borderWidth: `${
                      fret.length > 0 && !isFocused[index] ? "2px" : "1px"
                    }`,
                  }}
                  className={`h-[2.35rem] w-[2.35rem] rounded-full p-0 text-center 
                            ${fret.length > 0 ? "shadow-md" : "shadow-sm"}
                          `}
                  onFocus={() => {
                    setIsFocused((prev) => {
                      prev[index] = true;
                      return [...prev];
                    });
                  }}
                  onBlur={() => {
                    setIsFocused((prev) => {
                      prev[index] = false;
                      return [...prev];
                    });
                  }}
                />
                <div className="h-[1px] w-2 bg-pink-50/50"></div>
              </div>
            ))}
          </div>
          <div
            style={{
              height: "284px",
            }}
            className="rounded-r-2xl border-2 border-pink-50 p-1"
          ></div>
        </div>

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
    </motion.div>
  );
}

export default ChordModal;
