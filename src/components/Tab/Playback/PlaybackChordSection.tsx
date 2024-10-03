import { Fragment } from "react";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTabNotesColumn from "~/components/Tab/Playback/PlaybackTabNotesColumn";
import type { PlaybackChordSection as PlaybackChordSectionType,
  PlaybackChordSequence as PlaybackChordSequenceType
 } from "~/utils/experimentalChordCompilationHelpers";
import {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
} from "~/utils/bpmIconRenderingHelpers";
import PlaybackChordSequence from "~/components/Tab/Playback/PlaybackChordSequence";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackChordSection {
  subSectionData: PlaybackChordSectionType
}

function PlaybackChordSection(
  { subSectionData }: PlaybackChordSection
) {

    
    const {
      currentChordIndex,
  } = useTabStore((state) => ({
      currentChordIndex: state.currentChordIndex,
    }));

  return (
    <>
                  {subSectionData.data.map((chordSequence, index) => (
            <Fragment key={`${chordSequence.id}-${index}-wrapper`}>
              {(chordSequence.data.length > 0) ? (
                <Fragment
                >
                  
                    <PlaybackChordSequence
                      chordSequenceData={chordSequence}
                      currentChordIndex={currentChordIndex}
                    />
                </Fragment>
              ) : (
                <p className="italic text-pink-200">Empty strumming pattern</p>
              )}
            </Fragment>
          ))}
    </>
  );


}

export default PlaybackChordSection;