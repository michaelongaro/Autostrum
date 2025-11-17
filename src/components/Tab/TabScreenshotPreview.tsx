import StaticChordSection from "~/components/Tab/Static/StaticChordSection";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import { Separator } from "~/components/ui/separator";
import { type COLORS, type Section } from "~/stores/TabStore";
import {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
} from "~/utils/noteLengthIcons";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

interface TabScreenshotPreview {
  tabData: Section[];
  bpm: number;
  color: COLORS;
  theme: "light" | "dark";
}

function TabScreenshotPreview({
  tabData,
  bpm,
  color,
  theme,
}: TabScreenshotPreview) {
  return (
    <div className="baseVertFlex relative mt-16 size-full !justify-start gap-4">
      {tabData.map((section, index) => (
        <div key={section.id} className="baseFlex w-full">
          <div className="baseVertFlex w-full gap-4 px-2 md:px-7">
            <div className="w-full">
              <div className="baseVertFlex w-full">
                <div className="baseFlex w-full !justify-start gap-4">
                  <div
                    style={{
                      backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-accent"]})`,
                      color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-primary-foreground"]})`,
                    }}
                    className="baseFlex gap-4 rounded-md px-4 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-lg font-semibold md:text-xl">
                      {section.title}
                    </span>
                  </div>
                </div>

                <div className="w-full pt-4">
                  {/* map over tab/chord subSections */}
                  <div className="baseVertFlex w-full gap-3">
                    {section.data.map((subSection, subSectionIndex) => (
                      <div
                        key={subSection.id}
                        className="baseVertFlex w-full !items-start pb-2"
                      >
                        {(subSection.type === "tab" ||
                          chordSequencesAllHaveSameNoteLength(subSection) ||
                          subSection.repetitions > 1) && (
                          <div
                            style={{
                              borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-border"]})`,
                              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-secondary"]} / 0.25)`,
                              color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                            }}
                            className="baseFlex ml-4 gap-3 rounded-t-md border border-b-0 px-2 py-1 text-sm !shadow-sm"
                          >
                            {(subSection.type === "tab" ||
                              chordSequencesAllHaveSameNoteLength(
                                subSection,
                              )) && (
                              <div className="baseFlex gap-1">
                                {getDynamicNoteLengthIcon({
                                  noteLength:
                                    subSection.type === "tab"
                                      ? "quarter"
                                      : (subSection.data[0]?.strummingPattern
                                          .baseNoteLength ?? "quarter"),
                                })}
                                {subSection.bpm === -1 ? bpm : subSection.bpm}{" "}
                                BPM
                              </div>
                            )}

                            {subSection.repetitions > 1 && (
                              <div className="baseFlex gap-3">
                                {(subSection.type === "tab" ||
                                  chordSequencesAllHaveSameNoteLength(
                                    subSection,
                                  )) && (
                                  <Separator
                                    orientation="vertical"
                                    className="h-4 w-[1px] bg-gray/50"
                                  />
                                )}

                                <span>Repeat {subSection.repetitions}x</span>
                              </div>
                            )}
                          </div>
                        )}

                        {subSection.type === "chord" ? (
                          <StaticChordSection
                            subSectionData={subSection}
                            color={color}
                            theme={theme}
                          />
                        ) : (
                          <StaticTabSection
                            subSectionData={subSection}
                            sectionIndex={index}
                            subSectionIndex={subSectionIndex}
                            color={color}
                            theme={theme}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TabScreenshotPreview;
