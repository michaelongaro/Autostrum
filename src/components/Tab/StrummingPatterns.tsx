import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";

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

  // next step is making modals for adding/editing strumming patterns + chords

  return (
    <div className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 shadow-sm md:px-8 md:py-4">
      <p className="text-xl font-bold">Strumming patterns</p>
      <div className="baseFlex gap-4">
        {strummingPatterns.map((strummingPattern, index) => (
          <div key={index} className="baseFlex gap-2">
            <div>
              {/*prob a good idea to make a separate component to render out
              the "viewing" version of a strumming pattern (again as close as possible
              to ultimate guitar tab)  */}
            </div>
            <div className="baseFlex">
              {/* should have the hover tooltip below the icon */}
              {/* should be same look as explore tab grid heart/play buttons! */}
              <div>Edit</div>
              <Separator orientation="vertical" className="h-8" />
              {/* should have the hover tooltip below the icon */}
              <div>Delete</div>
            </div>
          </div>
        ))}
        {editing && (
          <Button
            onClick={() => {
              setStrummingPatternThatIsBeingEdited([
                ["", "v", ""],
                ["", "v", ""],
                ["", "^", ""],
                ["", "", ""],
                ["", "v", ""],
                ["", "^", ""],
                ["", "v", ""],
              ]);
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
