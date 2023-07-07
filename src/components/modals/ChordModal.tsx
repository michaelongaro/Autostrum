import { useState, useRef } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { motion } from "framer-motion";
import { parse, toString } from "~/utils/tunings";
import { Input } from "../ui/input";

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

function ChordModal() {
  const innerModalRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);

  const { tuning, currentlyEditingChord, setShowChordModal } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      currentlyEditingChord: state.currentlyEditingChord,
      setShowChordModal: state.setShowChordModal,
    }),
    shallow
  );

  // maybe have separate function for input change to check if name already exists
  function handleChordNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    //
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // copy a lot of the validation from <TabNote /> for handling only 0-22
    // and a-g + A-G for ez chord completion
  }

  return (
    <motion.div
      key={"ChordModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100vh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={() => setShowChordModal(false)}
    >
      <div
        ref={innerModalRef}
        className="lightestGlassmorphic baseVertFlex gap-4 rounded-md p-2 shadow-sm md:p-4"
      >
        {/* chord title */}
        <Input
          placeholder="Chord name"
          value={currentlyEditingChord.name}
          onChange={handleChordNameChange}
        />

        {/* information "i" to let users know they can prefill with a-g or A-G */}

        {/* actual preview of tuning + chord */}
        <div className="baseFlex w-full !justify-start">
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

          {/* will have to work on spacing for sure */}
          <div className="baseVertFlex">
            {currentlyEditingChord.frets.map((fret, index) => (
              <Input
                key={index}
                type="text"
                autoComplete="off"
                value={fret}
                onKeyDown={handleKeyDown}
                onChange={handleChange}
                style={{
                  borderWidth: `${
                    fret.length > 0 && !isFocused ? "2px" : "1px"
                  }`,
                }}
                className={`h-[2.35rem] w-[2.35rem] rounded-full p-0 text-center 
          ${fret.length > 0 ? "shadow-md" : "shadow-sm"}
          `}
                onFocus={() => {
                  setIsFocused(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                }}
              />
            ))}
          </div>
          <div
            style={{
              height: "284px",
            }}
            className="rounded-r-2xl border-2 border-pink-50 p-1"
          ></div>
        </div>
      </div>
    </motion.div>
  );
}

export default ChordModal;
