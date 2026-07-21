import { useState, type Dispatch, type SetStateAction } from "react";
import { BsArrowDown, BsArrowUp, BsPlus } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { Element } from "react-scroll";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import Ellipsis from "~/components/ui/icons/Ellipsis";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { NoteLengthDropdown } from "~/components/Tab/NoteLengthDropdown";
import StrummingPatternPalmMuteNode from "~/components/Tab/StrummingPatternPalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import { useStrumHighlight } from "~/hooks/useStrumHighlight";
import {
  useTabStore,
  type Chord,
  type FullNoteLengths,
  type Strum,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";

const emptyChords: Chord[] = [];

type StrummingPatternMode =
  | "editingStrummingPattern"
  | "editingChordSequence"
  | "viewingWithChordNames"
  | "viewing"
  | "viewingInSelectDropdown";

interface StrummingPatternStrumProps {
  strum: Strum;
  strumIndex: number;
  data: StrummingPatternType;
  chordSequence?: string[];
  mode: StrummingPatternMode;
  patternIndex?: number;
  sectionIndex?: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  beatLabel: string;
  heightOfStrummingPatternFiller: string;
  pmNodeOpacity: string;
  editingPalmMuteNodes?: boolean;
  setEditingPalmMuteNodes?: Dispatch<SetStateAction<boolean>>;
  showingDeleteStrumsButtons?: boolean;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  isLastStrum: boolean;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    beatIndex: number,
  ) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, beatIndex: number) => void;
  onNoteLengthChange: (
    strumIndex: number,
    noteLength: FullNoteLengths,
  ) => void;
  onAddStrum: (after: boolean, atIndex: number) => void;
  onDeleteStrum: (beatIndex: number) => void;
  onChordChange: (value: string, beatIndex: number) => void;
  onExtendPatternKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onExtendPatternClick: () => void;
}

function StrummingPatternStrum({
  strum,
  strumIndex,
  data,
  chordSequence,
  mode,
  patternIndex,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  beatLabel,
  heightOfStrummingPatternFiller,
  pmNodeOpacity,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  showingDeleteStrumsButtons,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  isLastStrum,
  onKeyDown,
  onChange,
  onNoteLengthChange,
  onAddStrum,
  onDeleteStrum,
  onChordChange,
  onExtendPatternKeyDown,
  onExtendPatternClick,
}: StrummingPatternStrumProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const forPreview =
    mode === "editingStrummingPattern" || patternIndex !== undefined;

  const highlighted = useStrumHighlight({
    strumIndex,
    forPreview,
    patternIndex,
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
  });

  // Narrow subscriptions: chord list only matters while editing sequences;
  // previewPlaying is only needed for the delete-strum disabled state.
  const chords = useTabStore((state) =>
    mode === "editingChordSequence" ? state.chords : emptyChords,
  );
  const previewPlaying = useTabStore((state) =>
    showingDeleteStrumsButtons ? state.previewMetadata.playing : false,
  );

  const highlightColor = highlighted
    ? "hsl(var(--primary))"
    : mode === "editingStrummingPattern"
      ? "hsl(var(--foreground))"
      : "inherit";

  return (
    <Element
      name={`section${sectionIndex ?? ""}-subSection${
        subSectionIndex ?? ""
      }-chordSequence${chordSequenceIndex ?? ""}-chord${strumIndex}`}
      id={`section${sectionIndex ?? ""}-subSection${
        subSectionIndex ?? ""
      }-chordSequence${chordSequenceIndex ?? ""}-chord${strumIndex}`}
      className="baseFlex my-1"
    >
      <div
        style={{
          marginTop: mode === "editingStrummingPattern" ? "1rem" : "0",
        }}
        className="baseVertFlex relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {strum.palmMute !== "" || editingPalmMuteNodes ? (
          <StrummingPatternPalmMuteNode
            value={strum.palmMute}
            beatIndex={strumIndex}
            strummingPatternBeingEdited={{
              index: patternIndex ?? 0,
              value: data,
            }}
            opacity={pmNodeOpacity}
            editingPalmMuteNodes={editingPalmMuteNodes!}
            setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
            setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
            viewingInSelectDropdown={mode === "viewingInSelectDropdown"}
            editing={mode === "editingStrummingPattern"}
          />
        ) : (
          <div
            style={{
              height: heightOfStrummingPatternFiller,
            }}
            className="h-6"
          ></div>
        )}

        {mode === "editingChordSequence" && (
          <>
            {strum.strum.includes("s") ||
            strum.strum === "r" ||
            strum.strum === "" ? (
              <div className="h-[40px] w-[42px]"></div>
            ) : (
              <Select
                onValueChange={(value) => onChordChange(value, strumIndex)}
                value={
                  chordSequence?.[strumIndex] === ""
                    ? "noChord"
                    : chordSequence?.[strumIndex]
                }
              >
                <SelectTrigger className="mx-1 w-fit">
                  <SelectValue>{chordSequence?.[strumIndex]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup className="max-h-60 overflow-y-auto overflow-x-hidden">
                    {chords.map((chord) => (
                      <SelectItem key={chord.name} value={chord.name}>
                        {chord.name}
                      </SelectItem>
                    ))}

                    {chords.length > 0 && <SelectSeparator className="mr-2" />}

                    <SelectItem value="noChord" className="italic">
                      No chord
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </>
        )}

        <div className="baseFlex mb-1 mt-2">
          <div
            style={{
              width: mode === "editingChordSequence" ? "1.25rem" : "0.25rem",
            }}
          ></div>

          {mode === "editingStrummingPattern" ? (
            <Input
              id={`input-strummingPatternModal-${strumIndex}-1`}
              type="text"
              autoComplete="off"
              value={strum.strum}
              onKeyDown={(e) => onKeyDown(e, strumIndex)}
              onChange={(e) => onChange(e, strumIndex)}
              style={{
                borderWidth: `${
                  strum.strum.length > 0 && !isFocused ? "2px" : "1px"
                }`,
                color: highlightColor,
              }}
              className="h-[2.35rem] w-[2.35rem] rounded-full p-0 text-center shadow-sm"
              onFocus={(e) => {
                setIsFocused(true);
                e.target.setSelectionRange(
                  e.target.value.length,
                  e.target.value.length,
                );
              }}
              onBlur={() => setIsFocused(false)}
            />
          ) : (
            <div
              style={{
                color: highlightColor,
              }}
              className={`baseVertFlex relative mb-2 h-[20px] text-lg ${mode === "viewingInSelectDropdown" ? "" : "transition-colors"}`}
            >
              {strum.strum.includes("v") && (
                <BsArrowDown
                  style={{
                    width: strum.strum.includes(">") ? "18.5px" : "20px",
                    height: strum.strum.includes(">") ? "18.5px" : "20px",
                  }}
                  strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                />
              )}
              {strum.strum.includes("^") && (
                <BsArrowUp
                  style={{
                    width: strum.strum.includes(">") ? "18.5px" : "20px",
                    height: strum.strum.includes(">") ? "18.5px" : "20px",
                  }}
                  strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                />
              )}

              {strum.strum.includes("s") && (
                <div
                  style={{
                    fontSize: "20px",
                  }}
                  className={`baseFlex mb-1 h-5 leading-[0] ${
                    strum.strum.includes(">")
                      ? "font-semibold"
                      : "font-normal"
                  }`}
                >
                  {strum.strum[0]}
                </div>
              )}

              {strum.strum.includes(".") && (
                <div
                  style={{
                    fontSize: "30px",
                  }}
                  className="absolute bottom-[12px] right-[-2px]"
                >
                  .
                </div>
              )}

              {strum.strum === "r" && <PauseIcon className="size-3" />}

              {strum.strum === "" && <div className="h-5 w-4"></div>}
            </div>
          )}

          <div
            style={{
              width: mode === "editingChordSequence" ? "1.25rem" : "0.25rem",
            }}
          ></div>
        </div>

        {mode === "editingStrummingPattern" && (
          <>
            {isHovered || settingsOpen ? (
              <DropdownMenu
                modal={true}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-2.5 w-5 !p-1 hover:!bg-primary hover:!text-primary-foreground"
                  >
                    <Ellipsis className="h-3 w-4 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent side={"bottom"}>
                  <DropdownMenuItem
                    className="baseFlex !justify-between gap-2"
                    onClick={() => onAddStrum(false, strumIndex)}
                  >
                    Add strum before
                    <BsPlus className="h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="baseFlex !justify-between gap-2"
                    onClick={() => onAddStrum(true, strumIndex)}
                  >
                    Add strum after
                    <BsPlus className="h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-primary" />
                  <NoteLengthDropdown
                    value={strum.noteLength}
                    onValueChange={(value) => {
                      onNoteLengthChange(strumIndex, value);
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-2.5"></div>
            )}
          </>
        )}

        <p
          style={{
            color: highlightColor,
          }}
          className={`text-sm ${mode === "viewingInSelectDropdown" ? "" : "transition-colors"}`}
        >
          {beatLabel}
        </p>

        <div className="h-4 w-full">
          {renderNoteLengthGuide({
            previousNoteLength: data.strums[strumIndex - 1]?.noteLength,
            currentNoteLength: strum.noteLength,
            nextNoteLength: data.strums[strumIndex + 1]?.noteLength,
            previousIsRestStrum: data.strums[strumIndex - 1]?.strum === "r",
            currentIsRestStrum: strum.strum === "r",
            nextIsRestStrum: data.strums[strumIndex + 1]?.strum === "r",
            isFirstInGroup: strumIndex === 0,
            isLastInGroup: isLastStrum,
          })}
        </div>

        {showingDeleteStrumsButtons && (
          <Button
            variant={"destructive"}
            disabled={data.strums.length === 1 || previewPlaying}
            className="mt-2 h-6 w-6 p-0"
            onClick={() => onDeleteStrum(strumIndex)}
          >
            <IoClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {mode === "editingStrummingPattern" &&
        isLastStrum &&
        data.strums.length < 32 && (
          <Button
            id={"strummingPatternExtendPatternButton"}
            className="ml-2 mr-1 rounded-full px-[6px] py-0 md:px-2"
            onKeyDown={onExtendPatternKeyDown}
            onClick={onExtendPatternClick}
          >
            <BsPlus className="h-6 w-6" />
          </Button>
        )}
    </Element>
  );
}

export default StrummingPatternStrum;
