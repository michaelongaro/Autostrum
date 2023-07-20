import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { HiOutlineInformationCircle } from "react-icons/hi";
import Chord from "./Chord";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

function Chords() {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    chords,
    setChords,
    setChordThatIsBeingEdited,
    tabData,
    setTabData,
    editing,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      setChords: state.setChords,
      setChordThatIsBeingEdited: state.setChordThatIsBeingEdited,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
    }),
    shallow
  );

  function handleDeleteChord(index: number, chordNameToBeDeleted: string) {
    const newTabData = [...tabData];

    for (
      let sectionIndex = 0;
      sectionIndex < newTabData.length;
      sectionIndex++
    ) {
      const section = newTabData[sectionIndex];

      if (!section) continue;
      for (
        let subSectionIndex = 0;
        subSectionIndex < section.data.length;
        subSectionIndex++
      ) {
        const subSection = section.data[subSectionIndex];

        if (subSection?.type === "chord") {
          for (
            let chordSequenceIndex = 0;
            chordSequenceIndex < subSection.data.length;
            chordSequenceIndex++
          ) {
            const chordGroup = subSection.data[chordSequenceIndex];

            if (!chordGroup) continue;
            for (
              let chordIndex = 0;
              chordIndex < chordGroup.data.length;
              chordIndex++
            ) {
              const chordName = chordGroup.data[chordIndex];
              if (!chordName) continue;

              if (chordName === chordNameToBeDeleted) {
                // @ts-expect-error undefined checks are done above
                newTabData[sectionIndex].data[subSectionIndex].data[
                  chordSequenceIndex
                ]!.data[chordIndex] = "";
              }
            }
          }
        }
      }
    }

    setTabData(newTabData);

    const prevChords = [...chords];
    prevChords.splice(index, 1);
    setChords(prevChords);
  }

  return (
    <div
      style={{
        display: editing ? "flex" : chords.length === 0 ? "none" : "flex",
        minWidth: aboveMediumViewportWidth
          ? chords.length === 0
            ? "450px"
            : "500px"
          : "300px",
      }}
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 md:px-8 md:py-4"
    >
      <p className="text-lg font-bold">Chords</p>
      <div className="baseFlex gap-4">
        {chords.map((chord, index) => (
          <div
            key={index}
            className="baseVertFlex border-b-none rounded-md border-2"
          >
            <p
              style={{
                padding: editing ? "0.75rem" : "0.5rem 3rem",
              }}
              className="p-3 font-medium"
            >
              {chord.name}
            </p>

            <div className="baseFlex w-full !justify-evenly rounded-bl-md border-t-2">
              {editing ? (
                <>
                  {/* edit button */}
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-sm rounded-tl-none border-r-[1px]"
                    onClick={() => {
                      setChordThatIsBeingEdited({
                        index,
                        value: {
                          name: chord.name,
                          frets: [...chord.frets],
                        },
                      });
                    }}
                  >
                    {/* add the tooltip below for "Edit" */}
                    <AiFillEdit className="h-6 w-6" />
                  </Button>
                  {/* delete button */}
                  <Button
                    variant={"destructive"}
                    size="sm"
                    className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px]"
                    onClick={() => handleDeleteChord(index, chord.name)}
                  >
                    {/* add the tooltip below for "Delete" */}
                    <AiFillDelete className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  {/* preview button */}
                  <Popover>
                    <PopoverTrigger className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-sm rounded-tl-none border-r-[1px]">
                      <HiOutlineInformationCircle className="h-4 w-4" />
                    </PopoverTrigger>
                    <PopoverContent>
                      <Chord
                        chordThatIsBeingEdited={{
                          index,
                          value: chord,
                        }}
                        editing={false}
                      />
                    </PopoverContent>
                  </Popover>
                  {/* play/pause button */}
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px]"
                  >
                    {/* conditional play/pause icon here */}
                    <BsFillPlayFill className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {editing && (
          <Button
            onClick={() => {
              setChordThatIsBeingEdited({
                index: chords.length,
                value: {
                  name: "",
                  frets: ["", "", "", "", "", ""],
                },
              });
            }}
          >
            Add chord
          </Button>
        )}
      </div>
    </div>
  );
}

export default Chords;
