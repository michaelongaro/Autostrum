import { useState } from "react";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { useTabStore, type Section } from "~/stores/TabStore";
import {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
} from "~/utils/bpmIconRenderingHelpers";
import { Separator } from "~/components/ui/separator";
import StaticChordSection from "~/components/Tab/Static/StaticChordSection";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";

interface StaticSectionContainer {
  sectionData: Section;
  sectionIndex: number;
  color: COLORS;
  theme: THEME;
  tabDataLength: number;
}

function StaticSectionContainer({
  sectionData,
  sectionIndex,
  color,
  theme,
  tabDataLength,
}: StaticSectionContainer) {
  const [accordionOpen, setAccordionOpen] = useState("opened");

  const { bpm } = useTabStore((state) => ({
    bpm: state.bpm,
  }));

  const zoom = useGetLocalStorageValues().zoom;

  return (
    <div
      style={{
        paddingBottom: sectionIndex === tabDataLength - 1 ? "2rem" : 0,
      }}
      className="baseVertFlex w-full gap-4 px-2 md:px-7"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionOpen}
        onValueChange={(value) => {
          setAccordionOpen(value === "opened" ? value : "closed");
        }}
        className="w-full"
      >
        <AccordionItem value="opened" className="baseVertFlex w-full">
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
                {sectionData.title}
              </span>
            </div>
          </div>

          <AccordionTrigger
            showUnderline={false}
            editingSectionContainer={false}
            viewingSectionContainer={true}
            className="w-full"
          ></AccordionTrigger>

          <AccordionContent animated={true} className="w-full pt-4">
            {/* map over tab/chord subSections */}
            <div
              id={`sectionIndex${sectionIndex}`}
              style={{
                zoom: zoom,
              }}
              className="baseVertFlex w-full gap-3"
            >
              {sectionData.data.map((subSection) => (
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
                        chordSequencesAllHaveSameNoteLength(subSection)) && (
                        <div className="baseFlex gap-1">
                          {getDynamicNoteLengthIcon({
                            noteLength:
                              subSection.type === "tab"
                                ? "1/4th"
                                : (subSection.data[0]?.strummingPattern
                                    .noteLength ?? "1/4th"),
                          })}
                          {subSection.bpm === -1 ? bpm : subSection.bpm} BPM
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
                      color={color}
                      theme={theme}
                    />
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {sectionIndex < tabDataLength - 1 && <Separator />}
    </div>
  );
}

export default StaticSectionContainer;
