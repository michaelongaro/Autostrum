import type {
  Section,
  StrummingPattern,
  TabNote,
  TabMeasureLine,
} from "~/stores/TabStore";
import { isTabMeasureLine, isTabNote } from "~/utils/tabNoteHelpers";

interface AddOrRemovePalmMuteDashes {
  setTabData: (updater: (draft: Section[]) => void) => void;
  sectionIndex: number;
  subSectionIndex: number;
  startColumnIndex: number;
  prevValue: string;
  pairNodeValue?: string;
}

function addOrRemovePalmMuteDashes({
  setTabData,
  sectionIndex,
  subSectionIndex,
  startColumnIndex,
  prevValue,
  pairNodeValue,
}: AddOrRemovePalmMuteDashes) {
  setTabData((draft) => {
    const subSection = draft[sectionIndex]?.data[subSectionIndex];
    if (subSection === undefined || subSection.type !== "tab") return;

    const subSectionData = subSection.data;
    const isAdding = pairNodeValue !== undefined;

    // Determine direction of traversal
    const direction = isAdding
      ? pairNodeValue === "start"
        ? 1
        : -1
      : prevValue === "start"
        ? 1
        : -1;

    // Determine what palm mute value signals we've reached the pair node
    const stopAtNodeType = isAdding
      ? pairNodeValue === "" || pairNodeValue === "end"
        ? "start"
        : "end"
      : prevValue === "start"
        ? "end"
        : "start";

    let currentColumnIndex = startColumnIndex;

    while (true) {
      const currentColumn = subSectionData[currentColumnIndex];
      if (currentColumn === undefined) break;

      // Handle TabMeasureLine - update isInPalmMuteSection and continue traversal
      if (currentColumn.type === "measureLine") {
        currentColumn.isInPalmMuteSection = isAdding;
        currentColumnIndex += direction;
        continue;
      }

      // Handle TabNote
      if (isAdding) {
        if (currentColumnIndex === startColumnIndex) {
          // Set the clicked node
          currentColumn.palmMute =
            pairNodeValue === ""
              ? "end"
              : (pairNodeValue as "" | "-" | "start" | "end");
        } else if (currentColumn.palmMute === stopAtNodeType) {
          // Found the pair node, stop
          break;
        } else {
          // Set intermediate nodes to dash
          currentColumn.palmMute = "-";
        }
      } else {
        // Removing dashes
        if (currentColumn.palmMute === stopAtNodeType) {
          // Found the pair node, stop without clearing it
          break;
        }
        // Clear this node
        currentColumn.palmMute = "";
      }

      currentColumnIndex += direction;
    }
  });
}

interface AddOrRemoveStrummingPatternPalmMuteDashes {
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPattern;
  };
  setStrummingPatternBeingEdited: (
    strummingPatternBeingEdited: {
      index: number;
      value: StrummingPattern;
    } | null,
  ) => void;
  startColumnIndex: number;
  prevValue: string;
  pairNodeValue?: string;
}

// no errors... yet, but isn't removing hanging node properly on strumming pattern

function addOrRemoveStrummingPatternPalmMuteDashes({
  strummingPatternBeingEdited,
  setStrummingPatternBeingEdited,
  startColumnIndex,
  prevValue,
  pairNodeValue,
}: AddOrRemoveStrummingPatternPalmMuteDashes) {
  let finishedModification = false;
  const newStrummingPattern = { ...strummingPatternBeingEdited };
  let currentColumnIndex = startColumnIndex;

  while (!finishedModification) {
    // start/end node already defined, meaning we just clicked on an empty node to be the other pair node
    if (pairNodeValue !== undefined) {
      if (currentColumnIndex === startColumnIndex) {
        newStrummingPattern.value.strums[startColumnIndex]!.palmMute =
          pairNodeValue === ""
            ? "end"
            : (pairNodeValue as "start" | "end" | "-" | "");

        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      } else if (
        newStrummingPattern.value.strums[currentColumnIndex]!.palmMute ===
        (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
      ) {
        finishedModification = true;
      } else {
        newStrummingPattern.value.strums[currentColumnIndex]!.palmMute = "-";
        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      }
    }
    // pair already defined, meaning we just removed either the start/end node and need to remove dashes
    // in between until we hit the other node
    else {
      if (
        newStrummingPattern.value.strums[currentColumnIndex]!.palmMute ===
        (prevValue === "start" ? "end" : "start")
      ) {
        finishedModification = true;
      } else {
        newStrummingPattern.value.strums[currentColumnIndex]!.palmMute = "";
        prevValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      }
    }
  }

  setStrummingPatternBeingEdited(newStrummingPattern);
}

interface TraverseToRemoveHangingPairNode {
  setTabData: (updater: (draft: Section[]) => void) => void;
  sectionIndex: number;
  subSectionIndex: number;
  startColumnIndex: number;
  pairNodeToRemove: "start" | "end";
}

function traverseToRemoveHangingPairNode({
  setTabData,
  sectionIndex,
  subSectionIndex,
  startColumnIndex,
  pairNodeToRemove,
}: TraverseToRemoveHangingPairNode) {
  setTabData((draft) => {
    let pairNodeRemoved = false;
    let currentColumnIndex = startColumnIndex;
    const subSection = draft[sectionIndex]?.data[subSectionIndex];

    if (subSection === undefined || subSection.type !== "tab") return;

    const subSectionData = subSection.data;

    while (!pairNodeRemoved) {
      const currentColumn = subSectionData[currentColumnIndex];
      if (!currentColumn || !isTabNote(currentColumn)) {
        pairNodeRemoved = true;
        continue;
      }

      if (pairNodeToRemove === "start" && currentColumn.palmMute === "start") {
        currentColumn.palmMute = "";
        pairNodeRemoved = true;
      } else if (
        pairNodeToRemove === "end" &&
        currentColumn.palmMute === "end"
      ) {
        currentColumn.palmMute = "";
        pairNodeRemoved = true;
      } else {
        pairNodeToRemove === "start"
          ? currentColumnIndex--
          : currentColumnIndex++;
      }
    }
  });
}

interface TraverseToRemoveHangingStrummingPatternPairNode {
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPattern;
  };
  setStrummingPatternBeingEdited: (
    strummingPatternBeingEdited: {
      index: number;
      value: StrummingPattern;
    } | null,
  ) => void;
  startColumnIndex: number;
  pairNodeToRemove: "start" | "end";
}

function traverseToRemoveHangingStrummingPatternPairNode({
  strummingPatternBeingEdited,
  setStrummingPatternBeingEdited,
  startColumnIndex,
  pairNodeToRemove,
}: TraverseToRemoveHangingStrummingPatternPairNode) {
  let pairNodeRemoved = false;
  const newStrummingPattern = { ...strummingPatternBeingEdited };
  let currentColumnIndex = startColumnIndex;

  while (!pairNodeRemoved) {
    if (
      pairNodeToRemove === "start" &&
      newStrummingPattern.value.strums[currentColumnIndex]?.palmMute === "start"
    ) {
      newStrummingPattern.value.strums[currentColumnIndex]!.palmMute = "";
      pairNodeRemoved = true;
    } else if (
      pairNodeToRemove === "end" &&
      newStrummingPattern.value.strums[currentColumnIndex]?.palmMute === "end"
    ) {
      newStrummingPattern.value.strums[currentColumnIndex]!.palmMute = "";
      pairNodeRemoved = true;
    } else {
      pairNodeToRemove === "start"
        ? currentColumnIndex--
        : currentColumnIndex++;
    }
  }

  setStrummingPatternBeingEdited(newStrummingPattern);
}

export {
  addOrRemovePalmMuteDashes,
  addOrRemoveStrummingPatternPalmMuteDashes,
  traverseToRemoveHangingPairNode,
  traverseToRemoveHangingStrummingPatternPairNode,
};
