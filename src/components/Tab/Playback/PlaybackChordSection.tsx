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

interface PlaybackChordSection {
  subSectionData: PlaybackChordSectionType
}

function PlaybackChordSection(
  { subSectionData }: PlaybackChordSection
) {

  function showBpm(chordSequence: PlaybackChordSequenceType) {
    if (!chordSequencesAllHaveSameNoteLength(subSectionData)) return true;

    return chordSequence.bpm !== -1 && chordSequence.bpm !== subSectionData.bpm;
  }

  return (
    <div className="baseFlex">
                  {subSectionData.data.map((chordSequence, index) => (
            <Fragment key={`${chordSequence.id}wrapper`}>
              {(chordSequence.data.length > 0) ? (
                <div
                  style={{
                    width: "auto",
                  }}
                  className="baseVertFlex !items-start"
                >
                  {
                    (showBpm(chordSequence) ||
                      chordSequence.repetitions > 1) && (
                      <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
                        {showBpm(chordSequence) && (
                          <div className="baseFlex gap-1">
                            {getDynamicNoteLengthIcon(
                              chordSequence.strummingPattern.noteLength
                            )}
                            {chordSequence.bpm === -1
                              ? subSectionData.bpm === -1
                                ? 30 // TODO: change this
                                : subSectionData.bpm
                              : chordSequence.bpm}{" "}
                            BPM
                          </div>
                        )}

                        
                      </div>
                    )}
                    <PlaybackChordSequence
                      
                      chordSequenceData={chordSequence}
                    />
                </div>
              ) : (
                <p className="italic text-pink-200">Empty strumming pattern</p>
              )}
            </Fragment>
          ))}
    </div>
  );


}

export default PlaybackChordSection;