import { useAuth } from "@clerk/nextjs";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { SelectTrigger } from "../ui/select";
import { SelectValue } from "../ui/select";
import { SelectContent } from "../ui/select";
import { SelectGroup } from "../ui/select";
import { SelectLabel } from "../ui/select";
import { SelectItem } from "../ui/select";
import { Separator } from "../ui/separator";
import { CommandCombobox } from "../ui/CommandCombobox";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

function TabMetadata() {
  // TODO: flesh out genre, tuning, and prob "edit" button/ save buttons
  const { userId, isLoaded } = useAuth();

  const {
    createdById,
    title,
    setTitle,
    description,
    setDescription,
    genre,
    setGenre,
    tuning,
    setTuning,
    BPM,
    setBPM,
    timeSignature,
    setTimeSignature,
    editing,
    setEditing,
  } = useTabStore(
    (state) => ({
      createdById: state.createdById,
      title: state.title,
      setTitle: state.setTitle,
      description: state.description,
      setDescription: state.setDescription,
      genre: state.genre,
      setGenre: state.setGenre,
      tuning: state.tuning,
      setTuning: state.setTuning,
      BPM: state.BPM,
      setBPM: state.setBPM,
      timeSignature: state.timeSignature,
      setTimeSignature: state.setTimeSignature,
      editing: state.editing,
      setEditing: state.setEditing,
    }),
    shallow
  );

  return (
    <>
      {editing ? (
        <>
          <div className="baseFlex w-full gap-2">
            <div className="baseVertFlex w-full max-w-sm !items-start gap-1.5 md:w-1/2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="My new tab"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="baseVertFlex w-full max-w-sm !items-start gap-1.5 md:w-1/2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional. Add any specific info about how to play this tab."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* options should be loaded from Genre table in db */}
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Fruits</SelectLabel>
                  {/* prob want a map of the different genres below */}
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="indie">Blueberry</SelectItem>
                  <SelectItem value="grapes">Grapes</SelectItem>
                  <SelectItem value="pineapple">Pineapple</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="baseFlex w-full gap-2">
            <div className="baseVertFlex max-w-sm !items-start gap-1.5">
              <Label htmlFor="tuning">Tuning</Label>
              <CommandCombobox />
            </div>

            {/* these two are rough, fix later */}
            <div className="baseVertFlex w-16 max-w-sm !items-start gap-1.5">
              <Label htmlFor="bpm">BPM</Label>
              <Input
                type="text"
                placeholder="75"
                value={BPM}
                onChange={(e) => setBPM(parseInt(e.target.value))}
              />
            </div>

            <div className="baseVertFlex w-16 max-w-sm !items-start gap-1.5">
              <Label htmlFor="timing">Timing</Label>
              <Input
                type="text"
                placeholder="4/4"
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {userId && createdById === parseInt(userId) && (
            <Button
              className="absolute right-4 top-4"
              onClick={() => {
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}

          <div className="baseFlex w-full max-w-sm gap-1.5 md:w-1/2">
            <div className="text-lg font-bold">{title}</div>
            <div className="baseFlex gap-2">
              <div>icon</div>
              {genre}
            </div>
          </div>

          <p>{description}</p>

          <Separator />

          <div className="baseFlex gap-4">
            <div className="baseVertFlex gap-2">
              Tuning
              <div>{tuning}</div>
            </div>

            <div className="baseVertFlex gap-2">
              BPM
              <div>{BPM}</div>
            </div>

            <div className="baseVertFlex gap-2">
              Timing
              <div>{timeSignature}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default TabMetadata;
