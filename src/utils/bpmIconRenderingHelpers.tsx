import type { ChordSection } from "~/stores/TabStore";

function chordSequencesAllHaveSameNoteLength(chordSection: ChordSection) {
  const noteLength = chordSection.data[0]?.strummingPattern.noteLength;

  return chordSection.data.every(
    (chordSequence) => chordSequence.strummingPattern.noteLength === noteLength
  );
}

function getDynamicNoteLengthIcon(
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet"
) {
  if (noteLength === "1/4th" || noteLength === "1/4th triplet") {
    return (
      <span className="mb-[1px] mr-[1px] h-[1.275rem] text-[1.2rem]">𝅘𝅥</span>
    );
  } else if (noteLength === "1/8th" || noteLength === "1/8th triplet") {
    return <span className="mr-[2px] h-[1.275rem] text-[1.2rem]">𝅘𝅥𝅮</span>;
  } else if (noteLength === "1/16th" || noteLength === "1/16th triplet") {
    return (
      <span className="mb-[1px] mr-[2px] h-[1.275rem] text-[1.2rem]">𝅘𝅥𝅯</span>
    );
  }
}

export { chordSequencesAllHaveSameNoteLength, getDynamicNoteLengthIcon };
