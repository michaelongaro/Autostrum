import { usePracticePlayback } from "~/components/tools/PracticePlaybackContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";

function PracticePlaybackSectionPicker() {
  const practicePlayback = usePracticePlayback();

  if (!practicePlayback) return null;

  const { exerciseGroups, selectedExerciseId, selectExercise } =
    practicePlayback;
  const exerciseCount = exerciseGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );

  if (exerciseCount <= 1) return null;

  const selectedExercise = exerciseGroups
    .flatMap((group) => group.items)
    .find((exercise) => exercise.id === selectedExerciseId);

  return (
    <div className="baseFlex min-w-0 max-w-full gap-4">
      <Separator className="hidden h-6 w-[1px] shrink-0 bg-foreground/50 lg:block" />
      <div className="baseFlex min-w-0 flex-1 gap-2">
        <Label
          htmlFor="practiceExercisePicker"
          className="shrink-0 text-sm font-medium"
        >
          Exercise
        </Label>
        <Select
          modal={false}
          value={selectedExerciseId}
          onValueChange={(value) => {
            if (value !== null) selectExercise(value);
          }}
        >
          <SelectTrigger
            id="practiceExercisePicker"
            className="max-lg:mobilePortrait:w-[120px] !h-9 w-48 min-w-0 max-w-full lg:w-64 mobilePortrait:!h-8"
          >
            <SelectValue
              placeholder="Select an exercise"
              render={
                <span
                  className="min-w-0 flex-1 truncate text-left"
                  title={selectedExercise?.title}
                >
                  {selectedExercise?.title ?? "Select an exercise"}
                </span>
              }
            />
          </SelectTrigger>
          <SelectContent className="!justify-start">
            {exerciseGroups.map((group) => (
              <SelectGroup key={group.level}>
                <SelectLabel className="text-foreground/60">
                  {group.label}
                </SelectLabel>
                {group.items.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default PracticePlaybackSectionPicker;
