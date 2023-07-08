import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";

function Chords() {
  const { chords, setChords, setChordThatIsBeingEdited, editing } = useTabStore(
    (state) => ({
      chords: state.chords,
      setChords: state.setChords,
      setChordThatIsBeingEdited: state.setChordThatIsBeingEdited,
      editing: state.editing,
    }),
    shallow
  );

  return (
    <div className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 shadow-sm md:px-8 md:py-4">
      <p className="text-xl font-bold">Chords</p>
      <div className="baseFlex gap-4">
        {chords.map((chord, index) => (
          <div
            key={index}
            className="baseVertFlex border-b-none rounded-md border-2"
          >
            <p className="p-3 font-medium">{chord.name}</p>

            <div className="baseFlex w-full !justify-evenly rounded-bl-md border-t-2">
              {/* edit button */}
              <Button
                variant={"ghost"}
                size={"sm"}
                className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-sm rounded-tl-none border-r-[1px]"
                onClick={() => {
                  setChordThatIsBeingEdited({
                    index,
                    value: chord,
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
                  const prevChords = [...chords];
                  prevChords.splice(index, 1);
                  setChords(prevChords);
                }}
              >
                {/* add the tooltip below for "Delete" */}
                <AiFillDelete className="h-5 w-5" />
              </Button>
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
