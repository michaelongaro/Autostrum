import { Fragment } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import StrummingPattern from "./StrummingPattern";

function StrummingPatterns() {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternThatIsBeingEdited,
    editing,
  } = useTabStore(
    (state) => ({
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternThatIsBeingEdited:
        state.setStrummingPatternThatIsBeingEdited,
      editing: state.editing,
    }),
    shallow
  );

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
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 shadow-sm md:px-8 md:py-4"
    >
      <p className="text-xl font-bold">Strumming patterns</p>
      <div
        className={`baseFlex ${
          // just to get around inherent flexbox space that is taken up by children
          // even when there is no dimensions to them
          strummingPatterns.length > 0 ? "gap-4" : "gap-0"
        }`}
      >
        {/* technically can do a vertFlex w/ flex-wrap and a fixed height
        grid auto-cols-max grid-flow-row grid-rows-2 */}
        <div className="baseFlex gap-4">
          {strummingPatterns.map((pattern, index) => (
            <div
              key={index}
              className="baseVertFlex border-b-none rounded-md border-2"
            >
              <StrummingPattern
                strummingPatternThatIsBeingEdited={{
                  index,
                  value: pattern,
                }}
                editingPalmMuteNodes={false}
                editing={false}
              />

              {/* change these below maybe just do flex column for mobile screens? */}

              <div className="baseFlex w-full !justify-evenly rounded-bl-md border-t-2">
                {/* edit button */}
                {editing ? (
                  <>
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
                    <Button
                      variant={"destructive"}
                      size="sm"
                      className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px]"
                      onClick={() => {
                        const prevPatterns = [...strummingPatterns];
                        prevPatterns.splice(index, 1);
                        setStrummingPatterns(prevPatterns);
                      }}
                    >
                      {/* add the tooltip below for "Delete" */}
                      <AiFillDelete className="h-5 w-5" />
                    </Button>
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
                  // clean this up later
                  strums: [
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                    {
                      palmMute: "",
                      strum: "",
                    },
                  ],
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
