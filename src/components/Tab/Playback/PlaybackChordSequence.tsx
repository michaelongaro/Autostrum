
import PlaybackStrummingPattern from "~/components/Tab/Playback/PlaybackStrummingPattern";
import type { PlaybackChordSequence as PlaybackChordSequenceType } from "~/utils/experimentalChordCompilationHelpers";

interface PlaybackChordSequence {
  chordSequenceData: PlaybackChordSequenceType;
  currentChordIndex: number;

}

function PlaybackChordSequence({
  chordSequenceData,
  currentChordIndex
}: PlaybackChordSequence) {

  return (

    <PlaybackStrummingPattern
            
            indices={chordSequenceData.indices}
            data={chordSequenceData.strummingPattern}
            chordSequenceData={chordSequenceData.data}
              currentChordIndex={currentChordIndex}
            />
  )
}

export default PlaybackChordSequence;