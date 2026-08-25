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
    <div className="baseFlex gap-4">
      <Separator className="hidden h-6 w-[1px] bg-foreground/50 tablet:block" />
      <div className="baseFlex gap-2">
        <Label htmlFor="practiceSectionPicker" className="text-sm font-medium">
          Section
        </Label>
        <Select value={selectedExerciseId} onValueChange={selectExercise}>
          <SelectTrigger
            id="practiceSectionPicker"
            className="!h-9 !max-w-48 mobilePortrait:!h-8 mobilePortrait:!max-w-none"
          >
            <SelectValue placeholder="Select an exercise" asChild>
              <p className="truncate">
                {selectedExercise?.title ?? "Select an exercise"}
              </p>
            </SelectValue>
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
