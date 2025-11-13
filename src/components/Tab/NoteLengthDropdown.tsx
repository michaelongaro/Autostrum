import {
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import type { FullNoteLengths } from "~/stores/TabStore";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";

const NOTE_LENGTH_GROUPS: ReadonlyArray<{
  base: string;
  values: FullNoteLengths[];
}> = [
  {
    base: "whole",
    values: ["whole", "whole dotted", "whole double-dotted"],
  },
  {
    base: "half",
    values: ["half", "half dotted", "half double-dotted"],
  },
  {
    base: "quarter",
    values: ["quarter", "quarter dotted", "quarter double-dotted"],
  },
  {
    base: "eighth",
    values: ["eighth", "eighth dotted", "eighth double-dotted"],
  },
  {
    base: "sixteenth",
    values: ["sixteenth", "sixteenth dotted", "sixteenth double-dotted"],
  },
];

const NOTE_LENGTH_VALUES = NOTE_LENGTH_GROUPS.flatMap((group) => group.values);
const NOTE_LENGTH_VALUE_SET = new Set(NOTE_LENGTH_VALUES);

type NoteLengthDropdownProps = {
  value: string | undefined;
  onValueChange: (value: FullNoteLengths) => void;
};

function isFullNoteLength(
  value: string | null | undefined,
): value is FullNoteLengths {
  if (value === null || value === undefined) {
    return false;
  }

  return NOTE_LENGTH_VALUE_SET.has(value as FullNoteLengths);
}

function NoteLengthDropdown({ value, onValueChange }: NoteLengthDropdownProps) {
  const selectedValue = isFullNoteLength(value) ? value : undefined;

  return (
    <div className="baseVertFlex w-full !items-start">
      <DropdownMenuLabel>Note length</DropdownMenuLabel>

      <div className="baseVertFlex w-full gap-1">
        {NOTE_LENGTH_GROUPS.map((group) => {
          const groupContainsSelectedValue =
            selectedValue !== undefined &&
            group.values.includes(selectedValue as FullNoteLengths);

          const groupValue = groupContainsSelectedValue
            ? selectedValue
            : undefined;

          return (
            <DropdownMenuGroup
              key={group.base}
              className="baseFlex w-full !justify-between gap-2"
            >
              {group.values.map((option) => (
                <DropdownMenuItem
                  key={option}
                  className={`baseFlex relative h-8 w-[40px] ${option === groupValue ? "bg-primary text-primary-foreground" : ""}`}
                  onSelect={() => {
                    if (isFullNoteLength(option)) {
                      onValueChange(option);
                    }
                  }}
                >
                  {/* FYI: I realize that this centering logic is a bit of a hack, but I still 
                      find value in having the dots be absolutely positioned */}
                  <div
                    style={{
                      right: option.includes("double-dotted")
                        ? "20px"
                        : option.includes("dotted")
                          ? "18px"
                          : undefined,
                    }}
                    className="absolute top-[6px]"
                  >
                    {getDynamicNoteLengthIcon({
                      noteLength: option,
                    })}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
      </div>
    </div>
  );
}

export { NoteLengthDropdown };
