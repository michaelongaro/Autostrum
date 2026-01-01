import { MdModeEditOutline } from "react-icons/md";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "~/components/ui/select";
import { useTabStore } from "~/stores/TabStore";
import { tuningNotes, tunings } from "~/utils/tunings";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { useState } from "react";

function TuningSelect() {
  const { tuning, setTuning, setShowCustomTuningModal } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      setTuning: state.setTuning,
      setShowCustomTuningModal: state.setShowCustomTuningModal,
    }),
  );

  const [selectIsOpen, setSelectIsOpen] = useState(false);

  return (
    <Select
      open={selectIsOpen}
      onOpenChange={(open) => {
        setSelectIsOpen(open);
      }}
      value={tuning}
      onValueChange={(value) => {
        if (value) {
          setTuning(value);
        }
      }}
    >
      <SelectTrigger id="tuning" className="h-10 w-[175px]">
        <SelectValue placeholder="Select tuning...">
          {tuning ? (
            <PrettyTuning tuning={tuning} displayWithFlex={true} />
          ) : (
            "Select tuning..."
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="w-[300px]">
        {/* Standard Tunings */}
        {tunings.map((tuningObj) => (
          <SelectItem
            key={tuningObj.simpleNotes}
            value={tuningObj.notes.toLowerCase()} // Use the full notes string as the value
          >
            <div className="baseFlex w-[235px] !justify-between">
              <span className="font-medium">{tuningObj.name}</span>
              <PrettyTuning tuning={tuningObj.simpleNotes} width="w-36" />
            </div>
          </SelectItem>
        ))}

        <SelectSeparator />

        {/* Custom tuning (if it is defined) */}
        {!tuningNotes.includes(tuning) && (
          <SelectItem key="custom-tuning" value={tuning}>
            <div className="baseFlex w-[235px] !justify-between">
              <span className="font-medium">Custom</span>
              <PrettyTuning tuning={tuning} width="w-36" />
            </div>
          </SelectItem>
        )}

        {/* Edit/Create custom tuning */}
        <div className="p-2">
          <Button
            size="sm"
            className="baseFlex w-full gap-2 p-2"
            onClick={() => {
              setShowCustomTuningModal(true);
              setSelectIsOpen(false);
            }}
            // FYI: I have no idea why onClick doesn't work on mobile, however onTouchEnd
            // does, and achieves the same effect.
            onTouchEnd={() => {
              setShowCustomTuningModal(true);
              setSelectIsOpen(false);
            }}
          >
            <>
              {tuningNotes.includes(tuning) ? (
                "Create custom tuning"
              ) : (
                <>
                  Edit custom tuning
                  <MdModeEditOutline className="size-4" />
                </>
              )}
            </>
          </Button>
        </div>
      </SelectContent>
    </Select>
  );
}

export default TuningSelect;
