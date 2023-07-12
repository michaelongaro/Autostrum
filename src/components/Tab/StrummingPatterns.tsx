import { Fragment } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";

function StrummingPatterns() {
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
    <div className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 shadow-sm md:px-8 md:py-4">
      <p className="text-xl font-bold">Strumming patterns</p>
      <div
        className={`baseFlex ${
          // just to get around inherent flexbox space that is taken up by children
          // even when there is no dimensions to them
          strummingPatterns.length > 0 ? "gap-4" : "gap-0"
        }`}
      >
        {/* technically can do a vertFlex w/ flex-wrap and a fixed height */}
        <div className="grid auto-cols-max grid-flow-row grid-rows-2 gap-4">
          {strummingPatterns.map((pattern, index) => (
            <div key={index} className="baseFlex rounded-md border-2">
              {/* here goes the "viewing" version of the pattern */}
              <p className="p-3 font-medium">major test code</p>

              <div className="baseFlex w-full !justify-evenly border-l-2">
                {/* edit button */}
                <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="baseFlex h-8 w-1/2 gap-2 border-r-[1px]"
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
                  className="baseFlex h-8 w-1/2 border-l-[1px]"
                  onClick={() => {
                    const prevPatterns = [...strummingPatterns];
                    prevPatterns.splice(index, 1);
                    setStrummingPatterns(prevPatterns);
                  }}
                >
                  {/* add the tooltip below for "Delete" */}
                  <AiFillDelete className="h-5 w-5" />
                </Button>
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
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
                    },
                    {
                      palmMute: "",
                      strum: "",
                      accented: false,
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
