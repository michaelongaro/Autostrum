import { Fragment } from "react";
import { parse, toString } from "~/utils/tunings";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTabNotesColumn from "~/components/Tab/Playback/PlaybackTabNotesColumn";
import type { PlaybackTabSection as PlaybackTabSectionType } from "~/utils/experimentalChordCompilationHelpers";
import { useTabStore } from "~/stores/TabStore";


interface PlaybackTabSection {
  subSectionData: PlaybackTabSectionType
}

function PlaybackTabSection(
  { subSectionData }: PlaybackTabSection
) {

  
    const {
      tuning,
  } = useTabStore((state) => ({
      tuning: state.tuning,
  }));

  return (
    <div className="baseFlex mx-2">
         <div
        style={{
          height: "168px",
          gap:  "0",
          marginBottom: "-1px",
        }}
        className="baseVertFlex relative rounded-l-2xl border-2 border-pink-100 p-2"
      >
        {toString(parse(tuning), { pad: 1 })
          .split(" ")
          .reverse()
          .map((note, index) => (
            <div key={index}>{note}</div>
          ))}
      </div>
        {subSectionData.data.map((column, index) => (
              <Fragment key={column[9]}>
                {column.includes("|") ? (
                  <PlaybackTabMeasureLine
                    columnData={column}
                    
                  />
                ) : (
                  <PlaybackTabNotesColumn
                    index={subSectionData.indices[index] === undefined ? 0 : subSectionData.indices[index]}
                    columnData={column}
                    
                  />
                )}
              </Fragment>
            ))}
               <div
            style={{
              height: "168px",
              marginBottom: "-1px",
            }}
            className="rounded-r-2xl border-2 border-pink-100 p-1"
          ></div>
    </div>
  );


}

export default PlaybackTabSection;