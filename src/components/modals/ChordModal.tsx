import { FocusTrap } from "focus-trap-react";
import { motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { BsFillPlayFill, BsKeyboard } from "react-icons/bs";
import { Label } from "~/components/ui/label";
import { useTabStore, type Chord as ChordType } from "~/stores/TabStore";
import Chord from "../Tab/Chord";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
import { X } from "lucide-react";

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
  const {
    chords,
    setChords,
    setChordBeingEdited,
    getTabData,
    setTabData,
    audioMetadata,
    previewMetadata,
    capo,
    playPreview,
    pauseAudio,
  } = useTabStore((state) => ({
    chords: state.chords,
    setChords: state.setChords,
    setChordBeingEdited: state.setChordBeingEdited,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    audioMetadata: state.audioMetadata,
    previewMetadata: state.previewMetadata,
    capo: state.capo,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
  }));

  useModalScrollbarHandling();

  function handleChordNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    if (value.length > 6) return;

    const modifiedChord = structuredClone(chordBeingEdited);
    modifiedChord.value.name = value;

    setChordBeingEdited(modifiedChord);
  }

  function handleSaveChord() {
    const chordNameAlreadyExists = chords.some(
      (chord, index) =>
        chord.name === chordBeingEdited.value.name &&
        index !== chordBeingEdited.index,
    );

    if (chordNameAlreadyExists) {
      // TODO: show error message
    } else {
      // update chord name of all strumming patterns that use this chord
      // if the chord name has changed.

      if (
        chords[chordBeingEdited.index]?.name !== chordBeingEdited.value.name
      ) {
        const newTabData = getTabData();

        for (const [sectionIndex, section] of newTabData.entries()) {
          if (!section) continue;

          for (const [subSectionIndex, subSection] of section.data.entries()) {
            if (subSection?.type === "chord") {
              for (const [
                chordSequenceIndex,
                chordGroup,
              ] of subSection.data.entries()) {
                if (!chordGroup) continue;
                for (const [
                  chordIndex,
                  chordName,
                ] of chordGroup.data.entries()) {
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
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (audioMetadata.playing) pauseAudio();
          setChordBeingEdited(null);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
        }}
      >
        <div
          tabIndex={-1}
          className="baseVertFlex modalGradient relative min-w-[300px] max-w-[90vw] gap-4 rounded-md p-4 shadow-sm xs:max-w-[380px] xs:gap-8"
        >
          {/* chord title */}
          <div className="baseFlex w-full !items-start !justify-between">
            <div className="baseVertFlex !items-start gap-2">
              <Label>Chord name</Label>
              <Input
                placeholder="(e.g. Em, Cmaj7)"
                value={chordBeingEdited?.value?.name}
                onChange={handleChordNameChange}
                className="w-[150px]"
              />
            </div>

            <Button
              variant={"ghost"}
              onClick={() => {
                if (audioMetadata.playing) pauseAudio();
                setChordBeingEdited(null);
              }}
              className="baseFlex size-8 rounded-sm !p-0 text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="baseVertFlex gap-2">
            <div className="baseFlex !items-start gap-2">
              <Chord
                chordBeingEdited={chordBeingEdited}
                highlightChord={
                  previewMetadata.indexOfPattern === chordBeingEdited.index &&
                  previewMetadata.playing &&
                  previewMetadata.type === "chord"
                }
              />

              {/* ml here seems hacky */}
              <div className="baseVertFlex ml-0 h-full w-48 gap-4 xs:ml-[30px]">
                <div className="baseVertFlex w-full !items-start gap-2 rounded-md border bg-secondary p-2 text-sm shadow-sm">
                  <div className="baseFlex w-[160px] gap-2 font-semibold">
                    <BsKeyboard className="h-6 w-6" />
                    Hotkeys
                  </div>

                  <div className="grid w-full grid-cols-[45px_5px_90px] gap-2">
                    <div className="baseFlex gap-1">
                      <kbd>A</kbd> - <kbd>G</kbd>
                    </div>
                    <span>-</span>
                    <span>Major chords</span>

                    <div className="baseFlex gap-1">
                      <kbd>a</kbd> - <kbd>g</kbd>
                    </div>
                    <span>-</span>
                    <span>Minor chords</span>

                    <kbd className="h-min w-min place-self-end">x</kbd>
                    <span>-</span>
                    <span>Muted string</span>
                  </div>
                </div>

                {capo > 0 && (
                  <div className="baseVertFlex !items-start gap-1 text-sm">
                    <p className="font-medium underline underline-offset-2">
                      Reminder
                    </p>
                    <p>
                      Fret values should be relative to capo on the{" "}
                      {getOrdinalSuffix(capo)} fret.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* a bit janky to have absolute positioning on this  */}
          <div className="baseFlex w-full !justify-between gap-4">
            <Button
              disabled={
                (previewMetadata.indexOfPattern === chordBeingEdited.index &&
                  previewMetadata.playing &&
                  previewMetadata.type === "chord") ||
                chordBeingEdited.value.frets.every((fret) => fret === "")
              }
              variant={"playPause"}
              size={"default"}
              className="baseFlex gap-2"
              onClick={() => {
                void playPreview({
                  data: chordBeingEdited.value.frets,
                  index: chordBeingEdited.index,
                  type: "chord",
                });
              }}
            >
              <BsFillPlayFill className="h-6 w-6" />
              Preview
            </Button>

            <Button
              disabled={
                chordBeingEdited.value.frets.every((fret) => fret === "") ||
                chordBeingEdited.value.name === "" ||
                isEqual(chordBeingEdited.value, chords[chordBeingEdited.index])
              }
              onClick={handleSaveChord}
              className="px-8"
            >
              Save
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default ChordModal;
