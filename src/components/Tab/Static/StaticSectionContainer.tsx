import { useLayoutEffect, useRef, useState } from "react";
import StaticChordSection from "~/components/Tab/Static/StaticChordSection";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useSectionData } from "~/hooks/useTabDataSelectors";
import type { COLORS, THEME } from "~/stores/TabStore";
import { useTabStoreShallow, type Section } from "~/stores/TabStore";
import {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
} from "~/utils/noteLengthIcons";

interface StaticSectionContainer {
  /** When omitted, section data is read from the store by sectionIndex. */
  sectionData?: Section;
  sectionIndex: number;
  color: COLORS;
  theme: THEME;
  tabDataLength: number;
  /** Opt-in row-level virtualization of tab subsections (StaticTab only). */
  virtualized?: boolean;
  /** Scroll margin so section titles clear sticky header / section nav / chords. */
  scrollMarginTop?: number;
}

function StaticSectionContainer({
  sectionData: sectionDataProp,
  sectionIndex,
  color,
  theme,
  tabDataLength,
  virtualized = false,
  scrollMarginTop,
}: StaticSectionContainer) {
  const [accordionOpen, setAccordionOpen] = useState("opened");

  const { bpm } = useTabStoreShallow((state) => ({
    bpm: state.bpm,
  }));

  const sectionFromStore = useSectionData(sectionIndex);
  const sectionData = sectionDataProp ?? sectionFromStore;

  const zoom = useGetLocalStorageValues().zoom;
  const sectionContentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    sectionContentRef.current?.style.setProperty(
      "--tab-zoom",
      String(Number.isFinite(zoom) && zoom > 0 ? zoom : 1),
    );
  }, [zoom]);

  const sectionHeading = (
    <div className="baseFlex w-full !justify-start gap-4">
      <div
        style={{
          backgroundColor: "hsl(var(--screenshot-accent))",
          color: "hsl(var(--screenshot-primary-foreground))",
        }}
        className="baseFlex gap-4 rounded-md px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold md:text-xl">
          {sectionData.title}
        </h2>
      </div>
    </div>
  );

  const sectionContent = (
    <div
      ref={sectionContentRef}
      style={{
        zoom: "var(--tab-zoom, 1)",
      }}
      className="baseVertFlex w-full gap-3"
    >
      {sectionData.data.map((subSection, subSectionIndex) => (
        <div
          key={subSection.id}
          className="baseVertFlex w-full !items-start pb-2"
        >
          {(subSection.type === "tab" ||
            chordSequencesAllHaveSameNoteLength(subSection) ||
            subSection.repetitions > 1) && (
            <div className="baseFlex gap-3 px-2 py-1 text-sm">
              {(subSection.type === "tab" ||
                chordSequencesAllHaveSameNoteLength(subSection)) && (
                <div className="baseFlex gap-1">
                  {getDynamicNoteLengthIcon({
                    noteLength:
                      subSection.type === "tab"
                        ? "quarter"
                        : (subSection.data[0]?.strummingPattern
                            .baseNoteLength ?? "quarter"),
                  })}
                  {subSection.bpm === -1 ? bpm : subSection.bpm} BPM
                </div>
              )}

              {subSection.repetitions > 1 && (
                <div className="baseFlex gap-3">
                  {(subSection.type === "tab" ||
                    chordSequencesAllHaveSameNoteLength(subSection)) && (
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
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              color={color}
              theme={theme}
              virtualized={virtualized}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      id={`sectionIndex${sectionIndex}`}
      style={{
        paddingBottom: sectionIndex === tabDataLength - 1 ? "2rem" : 0,
        scrollMarginTop: scrollMarginTop,
      }}
      className="baseVertFlex w-full gap-4 px-2 md:px-7"
    >
      {tabDataLength === 1 ? (
        <>
          {sectionHeading}
          {sectionContent}
        </>
      ) : (
        <Accordion
          value={[accordionOpen]}
          onValueChange={([value = "closed"]) => {
            setAccordionOpen(value === "opened" ? value : "closed");
          }}
          className="w-full"
        >
          <AccordionItem value="opened" className="baseVertFlex w-full">
            {sectionHeading}

            <AccordionTrigger
              headingLevel={2}
              aria-label={`Toggle ${sectionData.title || `section ${sectionIndex + 1}`}`}
              showUnderline={false}
              editingSectionContainer={false}
              viewingSectionContainer={true}
              className="w-full"
            ></AccordionTrigger>

            <AccordionContent animated={true} className="w-full pt-4">
              {sectionContent}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {sectionIndex < tabDataLength - 1 && <Separator />}
    </div>
  );
}

export default StaticSectionContainer;
