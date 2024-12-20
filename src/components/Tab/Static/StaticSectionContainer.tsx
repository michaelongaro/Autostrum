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
import { Separator } from "../../ui/separator";
import ChordSection from ".././ChordSection";
import StaticChordSection from "~/components/Tab/Static/StaticChordSection";

interface StaticSectionContainer {
  sectionData: Section;
  sectionIndex: number;
}

function StaticSectionContainer({
  sectionData,
  sectionIndex,
}: StaticSectionContainer) {
  const [accordionOpen, setAccordionOpen] = useState("opened");

  const { bpm, tabData } = useTabStore((state) => ({
    bpm: state.bpm,
    tabData: state.tabData,
  }));

  return (
    <div
      style={{
        paddingBottom: sectionIndex === tabData.length - 1 ? "2rem" : 0,
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
              className="baseFlex gap-4 rounded-md bg-pink-600 px-4 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-semibold md:text-xl">
                {sectionData.title}
              </p>
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
              className="baseVertFlex w-full"
            >
              {sectionData.data.map((subSection, index) => (
                <div
                  key={subSection.id}
                  className="baseVertFlex w-full !items-start pb-2"
                >
                  {(subSection.type === "tab" ||
                    chordSequencesAllHaveSameNoteLength(subSection) ||
                    subSection.repetitions > 1) && (
                    <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
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
                              className="h-4 w-[1px]"
                              orientation="vertical"
                            />
                          )}

                          <p>Repeat x{subSection.repetitions}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {subSection.type === "chord" ? (
                    <StaticChordSection subSectionData={subSection} />
                  ) : (
                    <StaticTabSection subSectionData={subSection} />
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {sectionIndex < tabData.length - 1 && <Separator />}
    </div>
  );
}

export default StaticSectionContainer;
