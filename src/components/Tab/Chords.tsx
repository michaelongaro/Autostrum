import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";

function Chords() {
  const {
    chords,
    setChords,
    setShowChordModal,
    setCurrentlyEditingChord,
    editing,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      setChords: state.setChords,
      setCurrentlyEditingChord: state.setCurrentlyEditingChord,
      setShowChordModal: state.setShowChordModal,
      editing: state.editing,
    }),
    shallow
  );

  return (
    <div className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 shadow-sm md:px-8 md:py-4">
      <p className="text-xl font-bold">Chords</p>
      <div className="baseFlex gap-4">
        {chords.map((chord, index) => (
          <div key={index} className="baseVertFlex gap-2">
            <div>{chord.name}</div>
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
              setCurrentlyEditingChord({
                name: "",
                frets: ["", "", "", "", "", ""],
              });
              setShowChordModal(true);
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
