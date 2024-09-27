
import PlaybackStrummingPattern from "~/components/Tab/Playback/PlaybackStrummingPattern";
import type { PlaybackChordSequence as PlaybackChordSequenceType } from "~/utils/experimentalChordCompilationHelpers";

interface PlaybackChordSequence {
  chordSequenceData: PlaybackChordSequenceType;
}

function PlaybackChordSequence({
  chordSequenceData
}: PlaybackChordSequence) {

  return (
    <div className="baseFlex">

    <PlaybackStrummingPattern
            
            indices={chordSequenceData.indices}
            data={chordSequenceData.strummingPattern}
            chordSequenceData={chordSequenceData.data}
            
            />
            </div>
  )
}

export default PlaybackChordSequence;