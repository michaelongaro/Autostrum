import type {
  Section,
  StrummingPattern,
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

// Adds dashes between a new pair node, or clears dashes toward the remaining pair
// after one endpoint was removed.
function addOrRemoveStrummingPatternPalmMuteDashes({
  strummingPatternBeingEdited,
  setStrummingPatternBeingEdited,
  startColumnIndex,
  prevValue,
  pairNodeValue,
}: AddOrRemoveStrummingPatternPalmMuteDashes) {
  const strums = strummingPatternBeingEdited.value.strums.map((strum) => ({
    ...strum,
  }));
  const isAdding = pairNodeValue !== undefined;
  const direction = isAdding
    ? pairNodeValue === "start"
      ? 1
      : -1
    : prevValue === "start"
      ? 1
      : -1;
  const stopAtNodeType = isAdding
    ? pairNodeValue === "" || pairNodeValue === "end"
      ? "start"
      : "end"
    : prevValue === "start"
      ? "end"
      : "start";

  let currentColumnIndex = startColumnIndex;

  while (
    currentColumnIndex >= 0 &&
    currentColumnIndex < strums.length
  ) {
    const currentStrum = strums[currentColumnIndex];
    if (!currentStrum) break;

    if (isAdding) {
      if (currentColumnIndex === startColumnIndex) {
        currentStrum.palmMute =
          pairNodeValue === ""
            ? "end"
            : (pairNodeValue as "" | "-" | "start" | "end");
      } else if (currentStrum.palmMute === stopAtNodeType) {
        break;
      } else {
        currentStrum.palmMute = "-";
      }
    } else {
      if (currentStrum.palmMute === stopAtNodeType) {
        break;
      }
      currentStrum.palmMute = "";
    }

    currentColumnIndex += direction;
  }

  setStrummingPatternBeingEdited({
    ...strummingPatternBeingEdited,
    value: {
      ...strummingPatternBeingEdited.value,
      strums,
    },
  });
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
      if (currentColumn === undefined) {
        break;
      }

      // Skip measure lines instead of aborting — the pair node may be past a bar.
      if (isTabMeasureLine(currentColumn)) {
        currentColumn.isInPalmMuteSection = false;
        pairNodeToRemove === "start"
          ? currentColumnIndex--
          : currentColumnIndex++;
        continue;
      }

      if (!isTabNote(currentColumn)) {
        break;
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
  const strums = strummingPatternBeingEdited.value.strums.map((strum) => ({
    ...strum,
  }));
  let currentColumnIndex = startColumnIndex;
  const direction = pairNodeToRemove === "start" ? -1 : 1;

  while (
    currentColumnIndex >= 0 &&
    currentColumnIndex < strums.length
  ) {
    const currentStrum = strums[currentColumnIndex];
    if (!currentStrum) break;

    if (currentStrum.palmMute === pairNodeToRemove) {
      currentStrum.palmMute = "";
      break;
    }

    currentColumnIndex += direction;
  }

  setStrummingPatternBeingEdited({
    ...strummingPatternBeingEdited,
    value: {
      ...strummingPatternBeingEdited.value,
      strums,
    },
  });
}

export {
  addOrRemovePalmMuteDashes,
  addOrRemoveStrummingPatternPalmMuteDashes,
  traverseToRemoveHangingPairNode,
  traverseToRemoveHangingStrummingPatternPairNode,
};
