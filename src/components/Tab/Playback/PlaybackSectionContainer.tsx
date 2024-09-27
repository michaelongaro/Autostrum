import PlaybackChordSection from "~/components/Tab/Playback/PlaybackChordSection";
import PlaybackTabSection from "~/components/Tab/Playback/PlaybackTabSection";
import type { PlaybackSection } from "~/utils/experimentalChordCompilationHelpers";


interface PlaybackSectionContainer {
  sectionData: PlaybackSection
}

function PlaybackSectionContainer(
  { sectionData }: PlaybackSectionContainer
) {

  return (
    <div className="baseFlex">
        {sectionData.data.map((subSection, index) => (
                <div
                  key={subSection.id}
                  className="baseFlex w-full"
                >
       {subSection.type === "chord" ? (
                        <PlaybackChordSection
                          
                          subSectionData={subSection}
                        />
                      ) : (
                        <PlaybackTabSection
                          
                          subSectionData={subSection}
                        />
                      )}
                  </div>
                ))}
    </div>
  );


}

export default PlaybackSectionContainer;