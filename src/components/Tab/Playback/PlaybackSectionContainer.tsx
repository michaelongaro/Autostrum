import { Fragment } from "react";
import PlaybackChordSection from "~/components/Tab/Playback/PlaybackChordSection";
import PlaybackTabSection from "~/components/Tab/Playback/PlaybackTabSection";
import type { PlaybackSection } from "~/utils/experimentalChordCompilationHelpers";

interface PlaybackSectionContainer {
  sectionData: PlaybackSection;
  uniqueKey: number;
}

function PlaybackSectionContainer({
  sectionData,
  uniqueKey,
}: PlaybackSectionContainer) {
  return (
    <>
      {sectionData.data.map((subSection, index) => (
        <Fragment key={`${subSection.id}-${index}`}>
          {subSection.type === "chord" ? (
            <PlaybackChordSection subSectionData={subSection} />
          ) : (
            <PlaybackTabSection
              subSectionData={subSection}
              uniqueKey={uniqueKey}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

export default PlaybackSectionContainer;
