import { useState } from "react";
import {
  type TabSection as TabSectionType,
  type ChordSection as ChordSectionType,
  type StrummingPattern as StrummingPatternType,
  useTabStore,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import StrummingPattern from "./StrummingPattern";
import isEqual from "lodash.isequal";

function StrummingPatterns() {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const [showingDeletePopover, setShowingDeletePopover] = useState(false);

  const {
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternThatIsBeingEdited,
    editing,
    tabData,
    setTabData,
    sectionProgression,
    setSectionProgression,
  } = useTabStore(
    (state) => ({
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternThatIsBeingEdited:
        state.setStrummingPatternThatIsBeingEdited,
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
    }),
    shallow
  );

  function allSubSectionsHaveStrummingPattern(
    sections: (TabSectionType | ChordSectionType)[],
    strummingPattern: StrummingPatternType
  ) {
    for (const subSection of sections) {
      if (
        subSection?.type !== "chord" ||
        !isEqual(subSection.strummingPattern, strummingPattern)
      ) {
        return false;
      }
    }

    return true;
  }

  function handleDeleteStrummingPattern(
    index: number,
    strummingPattern: StrummingPatternType
  ) {
    let newTabData = [...tabData];
    const sectionTitlesToDelete: string[] = [];

    for (
      let sectionIndex = newTabData.length - 1;
      sectionIndex >= 0;
      sectionIndex--
    ) {
      const section = newTabData[sectionIndex];

      if (!section) continue;

      for (
        let subSectionIndex = section.data.length - 1;
        subSectionIndex >= 0;
        subSectionIndex++
      ) {
        const subSection = section.data[subSectionIndex];
        if (
          subSection?.type === "chord" &&
          isEqual(subSection.strummingPattern, strummingPattern)
        ) {
          for (
            let chordSequenceIndex = section.data.length - 1;
            chordSequenceIndex >= 0;
            chordSequenceIndex--
          ) {
            const chordGroup = subSection.data[chordSequenceIndex];

            if (!chordGroup) continue;

            // if the entire section is filled with chord subsections that all have
            // the strumming pattern that is being deleted, remove the whole section
            if (
              allSubSectionsHaveStrummingPattern(section.data, strummingPattern)
            ) {
              sectionTitlesToDelete.push(section.title);

              newTabData = [
                ...newTabData.slice(0, sectionIndex),
                ...newTabData.slice(sectionIndex + 1),
              ];
            }
            // otherwise remove the chord subsection from the section
            else {
              newTabData[sectionIndex]!.data = [
                ...newTabData[sectionIndex]!.data.slice(0, subSectionIndex),
                ...newTabData[sectionIndex]!.data.slice(subSectionIndex + 1),
              ];
            }
          }
        }
      }
    }

    setTabData(newTabData);

    // deleting section from sectionProgression
    let newSectionProgression = [...sectionProgression];
    for (
      let sectionIndex = 0;
      sectionIndex < newSectionProgression.length;
      sectionIndex++
    ) {
      const section = newSectionProgression[sectionIndex];
      if (section && sectionTitlesToDelete.includes(section.title)) {
        newSectionProgression = [
          ...newSectionProgression.slice(0, sectionIndex),
          ...newSectionProgression.slice(sectionIndex + 1),
        ];
      }
    }

    // TODO: do same for regular section progression when deleting a section manually

    setSectionProgression(newSectionProgression);

    const prevStrummingPatterns = [...strummingPatterns];
    prevStrummingPatterns.splice(index, 1);
    setStrummingPatterns(prevStrummingPatterns);
  }

  return (
    <div
      style={{
        display: editing
          ? "flex"
          : strummingPatterns.length === 0
          ? "none"
          : "flex",
        minWidth: aboveMediumViewportWidth
          ? strummingPatterns.length === 0
            ? "450px"
            : "500px"
          : "300px",
      }}
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 md:px-8 md:py-4"
    >
      <p className="text-lg font-bold">Strumming patterns</p>
      <div
        className={`baseFlex ${
          // just to get around inherent flexbox space that is taken up by children
          // even when there is no dimensions to them
          strummingPatterns.length > 0 ? "gap-4" : "gap-0"
        }`}
      >
        <div className="baseFlex gap-4">
          {strummingPatterns.map((pattern, index) => (
            <div
              key={index}
              className="baseVertFlex border-b-none rounded-md border-2"
            >
              <StrummingPattern data={pattern} mode="viewing" index={index} />

              {/* change these below maybe just do flex column for mobile screens? */}

              <div className="baseFlex w-full !justify-evenly rounded-bl-md border-t-2">
                {editing ? (
                  <>
                    {/* edit button */}
                    <Button
                      variant={"ghost"}
                      size={"sm"}
                      className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-sm rounded-tl-none border-r-[1px]"
                      onClick={() => {
                        setStrummingPatternThatIsBeingEdited({
                          index,
                          value: pattern,
                        });
                      }}
                    >
                      {/* add the tooltip below for "Edit" */}
                      <AiFillEdit className="h-6 w-6" />
                    </Button>

                    {/* delete button */}
                    <Popover
                      open={showingDeletePopover}
                      onOpenChange={(openValue) =>
                        setShowingDeletePopover(openValue)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant={"destructive"}
                          size="sm"
                          className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px]"
                        >
                          {/* add the tooltip below for "Delete" */}
                          <AiFillDelete className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <div className="baseVertFlex gap-2">
                          <p className="w-auto text-sm">
                            All chord sections that use this pattern will be
                            deleted.
                          </p>

                          <div className="baseFlex gap-4">
                            <Button
                              variant={"secondary"}
                              size="sm"
                              // className="baseFlex h-8 w-1/2"
                              onClick={() => setShowingDeletePopover(false)}
                            >
                              Cancel
                            </Button>

                            <Button
                              variant={"destructive"}
                              size="sm"
                              // className="baseFlex h-8 w-1/2"
                              onClick={() => {
                                handleDeleteStrummingPattern(index, pattern);
                                setShowingDeletePopover(false);
                              }}
                            >
                              Confirm
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                ) : (
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="baseFlex w-full gap-4 rounded-b-sm rounded-t-none"
                  >
                    {/* conditional play/pause icon here */}
                    Preview
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {editing && (
          <Button
            onClick={() => {
              setStrummingPatternThatIsBeingEdited({
                index: strummingPatterns.length,
                value: {
                  noteLength: "1/8th",
                  strums: Array.from({ length: 8 }, () => ({
                    palmMute: "",
                    strum: "",
                  })),
                },
              });
            }}
          >
            Add strumming pattern
          </Button>
        )}
      </div>
    </div>
  );
}

export default StrummingPatterns;
