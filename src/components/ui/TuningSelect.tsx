import { Check } from "lucide-react";
import { MdModeEditOutline } from "react-icons/md";
import { cn } from "~/utils/cn";
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
import { tunings } from "~/utils/tunings";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { useState } from "react";

interface TuningSelectProps {
  customTuning: string | null;
}

function TuningSelect({ customTuning }: TuningSelectProps) {
  const { tuning, setTuning, setShowCustomTuningModal } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      setTuning: state.setTuning,
      setShowCustomTuningModal: state.setShowCustomTuningModal,
    }),
  );

  const [selectIsOpen, setSelectIsOpen] = useState(false);

  function handleEditOrCreateClick() {
    setShowCustomTuningModal(true);
    setSelectIsOpen(false);
  }

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
      <SelectTrigger className="h-10 w-[175px]">
        <SelectValue placeholder="Select tuning...">
          {tuning ? (
            <PrettyTuning tuning={tuning} displayWithFlex={true} />
          ) : (
            "Select tuning..."
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        style={{
          textShadow: "none",
        }}
        className="w-[300px]"
      >
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

        <SelectSeparator className="bg-pink-600" />

        {/* Custom tuning (if it exists) */}
        {customTuning && (
          <SelectItem
            key="custom-tuning"
            value={customTuning} // Use the custom tuning string as the value
          >
            <div className="baseFlex w-[235px] !justify-between">
              <span className="font-medium">Custom</span>
              <PrettyTuning tuning={customTuning} width="w-36" />
            </div>
          </SelectItem>
        )}

        {/* Edit/Create Button Area */}
        <div className="p-2">
          {customTuning ? (
            <Button
              size="sm"
              className="baseFlex w-full gap-2"
              onClick={handleEditOrCreateClick}
            >
              Edit custom tuning
              <MdModeEditOutline className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={handleEditOrCreateClick}
            >
              Create a custom tuning
            </Button>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

export default TuningSelect;
