import FocusTrap from "focus-trap-react";
import { motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useState, useEffect } from "react";
import { BsFillPlayFill, BsKeyboard } from "react-icons/bs";
import { shallow } from "zustand/shallow";
import { Label } from "~/components/ui/label";
import { useTabStore, type Chord as ChordType } from "~/stores/TabStore";
import Chord from "../Tab/Chord";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { isDesktop, isMobile } from "react-device-detect";

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
  const [accordionValue, setAccordionValue] = useState(
    isMobile ? "" : "opened"
  );

  const {
    chords,
    setChords,
    setChordBeingEdited,
    getTabData,
    setTabData,
    audioMetadata,
    previewMetadata,
    playPreview,
    pauseAudio,
    setPreventFramerLayoutShift,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      setChords: state.setChords,
      setChordBeingEdited: state.setChordBeingEdited,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      audioMetadata: state.audioMetadata,
      previewMetadata: state.previewMetadata,
      playPreview: state.playPreview,
      pauseAudio: state.pauseAudio,
      setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
    }),
    shallow
  );

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10)
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);

  function handleChordNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    if (value.length > 10) return;

    const modifiedChord = structuredClone(chordBeingEdited);
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
        const newTabData = getTabData();

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
      const newChords = structuredClone(chords);

      // decomposed shallow copy of frets so that the chord elem won't get updated
      // when the chord is edited in the chord modal
      const newChord = structuredClone(chordBeingEdited.value);
      newChords[chordBeingEdited.index] = {
        id: newChord.id,
        name: newChord.name,
        frets: [...newChord.frets],
      };
      if (audioMetadata.playing) pauseAudio();
      setChordBeingEdited(null);
      setChords(newChords);
    }
  }

  return (
    <motion.div
      key={"ChordModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget && isDesktop) {
          if (audioMetadata.playing) pauseAudio();
          setChordBeingEdited(null);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div
          tabIndex={-1}
          className="baseVertFlex min-w-[300px] max-w-[90vw] gap-8 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 xl:max-w-[50vw]"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (audioMetadata.playing) pauseAudio();
              setChordBeingEdited(null);
            }
          }}
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

          <Accordion
            type="single"
            collapsible
            value={accordionValue}
            onValueChange={(value) => {
              setAccordionValue(value);
            }}
            className="baseVertFlex lightestGlassmorphic w-full gap-2 rounded-md px-2 py-0 text-sm"
          >
            <AccordionItem value="opened">
              <AccordionTrigger extraPadding className="w-[300px]">
                <div className="baseFlex w-full gap-2 font-semibold">
                  <BsKeyboard className="h-6 w-6" />
                  Hotkeys
                </div>
              </AccordionTrigger>
              <AccordionContent extraPaddingBottom>
                <div className="baseFlex mt-2 gap-2 sm:gap-6">
                  <div className="baseFlex gap-2">
                    <span className="font-semibold">A-G</span>
                    <span>-</span>
                    <span>Major chords</span>
                  </div>

                  <div className="baseFlex gap-2">
                    <span className="font-semibold">a-g</span>
                    <span>-</span>
                    <span>Minor chords</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Chord
            chordBeingEdited={chordBeingEdited}
            editing={true}
            highlightChord={
              previewMetadata.indexOfPattern === chordBeingEdited.index &&
              previewMetadata.playing &&
              previewMetadata.type === "chord"
            }
          />

          <div className="baseVertFlex gap-8">
            <Button
              disabled={
                (previewMetadata.indexOfPattern === chordBeingEdited.index &&
                  previewMetadata.playing &&
                  previewMetadata.type === "chord") ||
                chordBeingEdited.value.frets.every((fret) => fret === "")
              }
              className="baseFlex gap-4"
              onClick={() => {
                void playPreview({
                  data: chordBeingEdited.value.frets,
                  index: chordBeingEdited.index,
                  type: "chord",
                });
              }}
            >
              <BsFillPlayFill className="h-6 w-6" />
              Preview chord
            </Button>

            <div className="baseFlex gap-4">
              <Button
                variant={"secondary"}
                onClick={() => {
                  if (audioMetadata.playing) pauseAudio();
                  setChordBeingEdited(null);
                }}
              >
                Close
              </Button>
              <Button
                disabled={
                  chordBeingEdited.value.frets.every((fret) => fret === "") ||
                  chordBeingEdited.value.name === "" ||
                  isEqual(
                    chordBeingEdited.value,
                    chords[chordBeingEdited.index]
                  )
                }
                onClick={handleSaveChord}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default ChordModal;
