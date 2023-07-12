import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "../ui/button";
import { type StrummingPattern, useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface StrummingPatternPalmMuteNode {
  value: string;
  beatIndex: number;
  strummingPatternThatIsBeingEdited: {
    index: number;
    value: StrummingPattern;
  };
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  editing: boolean;
}

function StrummingPatternPalmMuteNode({
  value,
  beatIndex,
  strummingPatternThatIsBeingEdited,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  editing,
}: StrummingPatternPalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState("0");

  const {
    setStrummingPatternThatIsBeingEdited,
    modifyStrummingPatternPalmMuteDashes,
  } = useTabStore(
    (state) => ({
      setStrummingPatternThatIsBeingEdited:
        state.setStrummingPatternThatIsBeingEdited,
      modifyStrummingPatternPalmMuteDashes:
        state.modifyStrummingPatternPalmMuteDashes,
    }),
    shallow
  );

  const findBeatIndexOfNearestNode = useCallback(
    (searchingFor?: "prevStart" | "prevEnd" | "nextStart" | "nextEnd") => {
      let currentIndex = lastModifiedPalmMuteNode?.columnIndex;
      const foundPairNodeBeatIndex = false;

      // searchingFor being undefined means we are looking for the nearest "start" node

      if (currentIndex === undefined) return 0;

      while (!foundPairNodeBeatIndex) {
        const currentNode =
          strummingPatternThatIsBeingEdited.value.strums[currentIndex]
            ?.palmMute;

        // it's implied that there shouldn't be an "end" node since we just added the "start" node
        if (lastModifiedPalmMuteNode?.prevValue === "") {
          if (
            currentNode === "start" &&
            currentIndex !== lastModifiedPalmMuteNode?.columnIndex
          )
            return currentIndex;

          currentIndex++;
        } else if (lastModifiedPalmMuteNode?.prevValue === "start") {
          if (currentNode === "end") return currentIndex;

          if (searchingFor === "nextEnd") currentIndex++;
          else if (searchingFor === "prevEnd") currentIndex--;
        } else {
          if (currentNode === "start") return currentIndex;

          if (searchingFor === "nextStart") currentIndex++;
          else if (searchingFor === "prevStart") currentIndex--;
        }

        if (currentIndex < 0) return -1; // or maybe 0
        if (
          currentIndex >
          strummingPatternThatIsBeingEdited.value.strums.length - 1
        ) {
          return strummingPatternThatIsBeingEdited.value.strums.length;
        }
      }

      return 0;
    },
    [strummingPatternThatIsBeingEdited, lastModifiedPalmMuteNode]
  );

  useEffect(() => {
    setButtonOpacity("1");

    if (!editingPalmMuteNodes && value !== "start" && value !== "end") {
      setButtonOpacity("0");
      return;
    }

    if (
      lastModifiedPalmMuteNode?.prevValue === "" &&
      (beatIndex < lastModifiedPalmMuteNode?.columnIndex ||
        beatIndex >= findBeatIndexOfNearestNode())
    ) {
      setButtonOpacity("0.25");
    } else {
      if (
        lastModifiedPalmMuteNode?.prevValue === "start" &&
        (beatIndex <= findBeatIndexOfNearestNode("prevEnd") ||
          beatIndex > findBeatIndexOfNearestNode("nextEnd"))
      ) {
        setButtonOpacity("0.25");
      } else if (
        lastModifiedPalmMuteNode?.prevValue === "end" &&
        (beatIndex < findBeatIndexOfNearestNode("prevStart") ||
          beatIndex >= findBeatIndexOfNearestNode("nextStart"))
      ) {
        setButtonOpacity("0.25");
      }
    }
  }, [
    beatIndex,
    value,
    editingPalmMuteNodes,
    lastModifiedPalmMuteNode,
    findBeatIndexOfNearestNode,
  ]);

  function handlePalmMuteNodeClick() {
    // forces edit mode when editing placement of a palm mute node
    if (!editingPalmMuteNodes) setEditingPalmMuteNodes(true);

    if (lastModifiedPalmMuteNode === null) {
      setLastModifiedPalmMuteNode({
        columnIndex: beatIndex,
        prevValue: value, // value before clicking
        currentValue: value === "start" || value === "end" ? "" : "start", // value after clicking
      });

      if (value === "") {
        const newStrummingPattern = {
          ...strummingPatternThatIsBeingEdited,
        };

        newStrummingPattern.value.strums[beatIndex]!.palmMute = "start";

        setStrummingPatternThatIsBeingEdited(newStrummingPattern);
      } else {
        modifyStrummingPatternPalmMuteDashes(
          strummingPatternThatIsBeingEdited,
          setStrummingPatternThatIsBeingEdited,
          beatIndex,
          value
        );
      }
    }

    // removing start node that was just added
    //    we know it's a start node because the lastModifiedPalmMuteNode isn't null
    //    and the only available nodes to click on is the corresponding node
    //    to the lastModifiedPalmMuteNode
    else if (
      (lastModifiedPalmMuteNode.prevValue === "" &&
        lastModifiedPalmMuteNode.columnIndex === beatIndex) ||
      (lastModifiedPalmMuteNode.prevValue !== "" &&
        (value === "start" || value === "end"))
    ) {
      const newStrummingPattern = {
        ...strummingPatternThatIsBeingEdited,
      };

      newStrummingPattern.value.strums[beatIndex]!.palmMute = "";

      setStrummingPatternThatIsBeingEdited(newStrummingPattern);
      setLastModifiedPalmMuteNode(null);
    }

    // adding end node
    else {
      modifyStrummingPatternPalmMuteDashes(
        strummingPatternThatIsBeingEdited,
        setStrummingPatternThatIsBeingEdited,
        beatIndex,
        value,
        lastModifiedPalmMuteNode.prevValue
      );
      setLastModifiedPalmMuteNode(null);
    }
  }

  return (
    <>
      {!editing && (value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex relative w-full !flex-nowrap">
              |<i className="absolute -top-3 left-4">PM</i>
              <div className="h-[1px] w-full bg-pink-50"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex relative w-full !flex-nowrap">
              <div className="h-[1px] w-full bg-pink-50"></div>|
            </div>
          )}
        </>
      )}

      {editing && (
        <>
          {(value === "start" ||
            value === "end" ||
            (editingPalmMuteNodes && value === "")) && (
            <Button
              style={{
                pointerEvents: buttonOpacity === "1" ? "all" : "none",
                boxShadow: hoveringOnPalmMuteNode ? "0 0 5px 2px #FFF" : "",
                opacity: buttonOpacity,
              }}
              size={"sm"}
              className="min-w-[2.25rem] rounded-full transition-all"
              onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
              onTouchStart={() => setHoveringOnPalmMuteNode(true)}
              onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
              onTouchEnd={() => setHoveringOnPalmMuteNode(false)}
              onClick={handlePalmMuteNodeClick}
            >
              {value === "start" && (
                <div className="baseVertFlex text-xs">
                  <span>PM</span>
                  <span>start</span>
                </div>
              )}
              {value === "end" && (
                <div className="baseVertFlex text-xs">
                  <span>PM</span>
                  <span>end</span>
                </div>
              )}
              {editingPalmMuteNodes && value === "" && "+"}
            </Button>
          )}
        </>
      )}

      {value === "-" && (
        <div
          // height may have to be conditional based on if it is being edited or not
          style={{
            margin: editing ? "1.1rem 0" : "0.75rem 0", // guessing on 0.75rem value
          }}
          className="h-[1px] w-full bg-pink-50"
        ></div>
      )}
    </>
  );
}

export default StrummingPatternPalmMuteNode;
