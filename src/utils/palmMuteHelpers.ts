import type {
  Section,
  StrummingPattern,
  TabNote,
  TabMeasureLine,
} from "~/stores/TabStore";
import { isTabNote } from "~/utils/tabNoteHelpers";

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
    let finishedModification = false;
    let currentColumnIndex = startColumnIndex;
    const subSection = draft[sectionIndex]?.data[subSectionIndex];

    if (subSection === undefined || subSection.type !== "tab") return;

    const subSectionData = subSection.data;

    while (!finishedModification) {
      const currentColumn = subSectionData[currentColumnIndex];
      if (!currentColumn || !isTabNote(currentColumn)) {
        finishedModification = true;
        continue;
      }

      // only start/end node defined, meaning we clicked on the desired opposite pair node
      if (pairNodeValue !== undefined) {
        if (currentColumnIndex === startColumnIndex) {
          currentColumn.palmMute =
            pairNodeValue === ""
              ? "end"
              : (pairNodeValue as "" | "-" | "start" | "end");

          pairNodeValue === "start"
            ? currentColumnIndex++
            : currentColumnIndex--;
        } else if (
          currentColumn.palmMute ===
          (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
        ) {
          finishedModification = true;
        } else {
          currentColumn.palmMute = "-";
          pairNodeValue === "start"
            ? currentColumnIndex++
            : currentColumnIndex--;
        }
      }
      // pair already defined, meaning we just removed either the start/end node and need to remove dashes
      // in between until we hit the other node
      else {
        if (
          currentColumn.palmMute === (prevValue === "start" ? "end" : "start")
        ) {
          finishedModification = true;
        } else {
          currentColumn.palmMute = "";
          prevValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
        }
      }
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
