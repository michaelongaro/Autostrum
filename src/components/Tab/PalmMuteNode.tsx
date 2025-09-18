import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { BsPlus } from "react-icons/bs";
import { useTabStore } from "~/stores/TabStore";
import { addOrRemovePalmMuteDashes } from "~/utils/palmMuteHelpers";
import { Button } from "~/components/ui/button";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";

interface PalmMuteNode {
  value: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  opacity: string;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
}

function PalmMuteNode({
  value,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  opacity,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: PalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);

  const { editing, getTabData, setTabData } = useTabStore((state) => ({
    editing: state.editing,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
  }));

  useEffect(() => {
    setHoveringOnPalmMuteNode(false);
  }, [value]);

  function getButtonOpacity() {
    if (!editingPalmMuteNodes) {
      if (value === "start" || value === "end") return "1";
      return "0";
    }

    return opacity;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const currentPalmMuteNode = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`,
    );

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowDown") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-1`,
      );

      focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const completedSearchOfPalmMuteNodes = false;
      let currentIndex = columnIndex - 1;

      // figure out how to get arrow key nav working across measure line when
      // left and right nodes are empty (just the "+")

      while (!completedSearchOfPalmMuteNodes) {
        // if PM node is reachable and not a connecting node between start & end
        // nodes, then focus the PM node

        if (
          getTabData()[sectionIndex]!.data[subSectionIndex].data[
            currentIndex
          ]?.[8] === "measureLine"
        ) {
          currentIndex--;
        }

        if (
          getTabData()[sectionIndex]!.data[subSectionIndex].data[
            currentIndex
          ]?.[0] !== "-" &&
          getButtonOpacity(
            getTabData()[sectionIndex]!.data[subSectionIndex].data[
              currentIndex
            ]?.[0] ?? "-",
            currentIndex,
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-${0}`,
          );

          focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
          return;
        }

        currentIndex--;

        if (currentIndex < 0) return;
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      const completedSearchOfPalmMuteNodes = false;
      let currentIndex = columnIndex + 1;

      while (!completedSearchOfPalmMuteNodes) {
        if (
          getTabData()[sectionIndex]!.data[subSectionIndex].data[
            currentIndex
          ]?.[8] === "measureLine"
        ) {
          currentIndex++;
        }

        if (
          currentIndex >=
          getTabData()[sectionIndex]!.data[subSectionIndex]!.data.length
        ) {
          const newNoteToFocus = document.getElementById(
            `${sectionIndex}${subSectionIndex}ExtendTabButton`,
          );

          focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
          return;
        }

        // if PM node is reachable and not a connecting node between start & end
        // nodes, then focus the PM node
        if (
          getTabData()[sectionIndex]!.data[subSectionIndex].data[
            currentIndex
          ]?.[0] !== "-" &&
          getButtonOpacity(
            getTabData()[sectionIndex]!.data[subSectionIndex].data[
              currentIndex
            ]?.[0] ?? "-",
            currentIndex,
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-${0}`,
          );

          focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
          return;
        }

        currentIndex++;

        if (
          currentIndex >
          getTabData()[sectionIndex]!.data[subSectionIndex]!.data.length
        )
          return;
      }
    }
  }

  function handlePalmMuteNodeClick() {
    // forces edit mode when editing placement of a palm mute node
    if (!editingPalmMuteNodes) setEditingPalmMuteNodes(true);

    if (lastModifiedPalmMuteNode === null) {
      setLastModifiedPalmMuteNode({
        columnIndex,
        prevValue: value, // value before clicking
        currentValue: value === "start" || value === "end" ? "" : "start", // value after clicking
      });

      if (value === "") {
        const newTabData = getTabData();
        newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0] =
          "start";
        setTabData(newTabData);
      } else {
        // removing node + dashes in between
        addOrRemovePalmMuteDashes({
          tabData: getTabData(),
          setTabData,
          sectionIndex,
          subSectionIndex,
          startColumnIndex: columnIndex,
          prevValue: value,
        });
      }
    }

    // removing start node that was just added
    //    we know it's a start node because the lastModifiedPalmMuteNode isn't null
    //    and the only available nodes to click on is the corresponding node
    //    to the lastModifiedPalmMuteNode
    else if (
      (lastModifiedPalmMuteNode.prevValue === "" &&
        lastModifiedPalmMuteNode.columnIndex === columnIndex) ||
      (lastModifiedPalmMuteNode.prevValue !== "" &&
        (value === "start" || value === "end"))
    ) {
      const newTabData = getTabData();
      newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0] =
        "";
      setTabData(newTabData);
      setLastModifiedPalmMuteNode(null);
    }

    // adding end node
    else {
      // adding node + dashes in between
      addOrRemovePalmMuteDashes({
        tabData: getTabData(),
        setTabData,
        sectionIndex,
        subSectionIndex,
        startColumnIndex: columnIndex,
        prevValue: value,
        pairNodeValue: lastModifiedPalmMuteNode.prevValue,
      });

      setLastModifiedPalmMuteNode(null);
    }
  }

  return (
    <>
      {!editing && (value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex w-full">
              <div className="h-[14px] w-[1px] bg-primary-foreground"></div>
              <div className="h-[1px] w-1 bg-primary-foreground"></div>
              <i className="mx-[0.125rem]">PM</i>
              <div className="h-[1px] w-[3px] bg-primary-foreground"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex w-full">
              <div className="h-[1px] w-full bg-primary-foreground"></div>
              <div className="h-[14px] w-[1px] bg-primary-foreground"></div>
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
              id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`}
              style={{
                pointerEvents: getButtonOpacity() === "1" ? "all" : "none",
                boxShadow: hoveringOnPalmMuteNode
                  ? "0 0 2px 2px hsl(var(--primary))"
                  : "",
                opacity: getButtonOpacity(),
              }}
              size={"sm"}
              className="min-w-[2.25rem] rounded-full px-1 py-0 transition-all"
              onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
              onTouchStart={() => setHoveringOnPalmMuteNode(true)}
              onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
              onTouchEnd={() => setHoveringOnPalmMuteNode(false)}
              onKeyDown={handleKeyDown}
              onClick={handlePalmMuteNodeClick}
            >
              {value === "start" && (
                <div className="baseVertFlex text-[0.65rem]">
                  <span className="h-[13px] leading-[1.35]">PM</span>
                  <span className="h-[13px] leading-[1.35]">start</span>
                </div>
              )}
              {value === "end" && (
                <div className="baseVertFlex text-[0.65rem]">
                  <span className="h-[13px] leading-[1.35]">PM</span>
                  <span className="h-[13px] leading-[1.35]">end</span>
                </div>
              )}
              {editingPalmMuteNodes && value === "" && (
                <BsPlus className="h-5 w-5" />
              )}
            </Button>
          )}
        </>
      )}

      {value === "-" && (
        <div
          className={`h-[1px] w-full ${
            !editing || !editingPalmMuteNodes || getButtonOpacity() === "1"
              ? "bg-foreground"
              : "bg-foreground/50"
          } `}
        ></div>
      )}
    </>
  );
}

export default PalmMuteNode;
