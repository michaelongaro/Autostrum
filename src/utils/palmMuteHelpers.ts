import type { Section, StrummingPattern } from "~/stores/TabStore";

interface AddOrRemovePalmMuteDashes {
  tabData: Section[];
  setTabData: (tabData: Section[]) => void;
  sectionIndex: number;
  subSectionIndex: number;
  startColumnIndex: number;
  prevValue: string;
  pairNodeValue?: string;
}

function addOrRemovePalmMuteDashes({
  tabData,
  setTabData,
  sectionIndex,
  subSectionIndex,
  startColumnIndex,
  prevValue,
  pairNodeValue,
}: AddOrRemovePalmMuteDashes) {
  let finishedModification = false;
  const newTabData = [...tabData];
  let currentColumnIndex = startColumnIndex;
  const subSection = newTabData[sectionIndex]!.data[subSectionIndex]!.data;

  while (!finishedModification) {
    // only start/end node defined, meaning we clicked on the desired opposite pair node
    if (pairNodeValue !== undefined) {
      if (currentColumnIndex === startColumnIndex) {
        subSection[startColumnIndex]![0] =
          pairNodeValue === "" ? "end" : pairNodeValue;

        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      } else if (
        subSection[currentColumnIndex]![0] ===
        (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
      ) {
        finishedModification = true;
      } else {
        subSection[currentColumnIndex]![0] = "-";
        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      }
    }
    // pair already defined, meaning we just removed either the start/end node and need to remove dashes
    // in between until we hit the other node
    else {
      if (
        subSection[currentColumnIndex]?.[0] ===
        (prevValue === "start" ? "end" : "start")
      ) {
        finishedModification = true;
      } else {
        subSection[currentColumnIndex]![0] = "";
        prevValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      }
    }
  }

  setTabData(newTabData);
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
    } | null
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
  tabData: Section[];
  setTabData: (tabData: Section[]) => void;
  sectionIndex: number;
  subSectionIndex: number;
  startColumnIndex: number;
  pairNodeToRemove: "start" | "end";
}

function traverseToRemoveHangingPairNode({
  tabData,
  setTabData,
  sectionIndex,
  subSectionIndex,
  startColumnIndex,
  pairNodeToRemove,
}: TraverseToRemoveHangingPairNode) {
  let pairNodeRemoved = false;
  const newTabData = [...tabData];
  let currentColumnIndex = startColumnIndex;
  const subSection = newTabData[sectionIndex]!.data[subSectionIndex]!.data;

  while (!pairNodeRemoved) {
    if (
      pairNodeToRemove === "start" &&
      subSection[currentColumnIndex]?.[0] === "start"
    ) {
      subSection[currentColumnIndex]![0] = "";
      pairNodeRemoved = true;
    } else if (
      pairNodeToRemove === "end" &&
      subSection[currentColumnIndex]?.[0] === "end"
    ) {
      subSection[currentColumnIndex]![0] = "";
      pairNodeRemoved = true;
    } else {
      pairNodeToRemove === "start"
        ? currentColumnIndex--
        : currentColumnIndex++;
    }
  }

  setTabData(newTabData);
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
    } | null
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
