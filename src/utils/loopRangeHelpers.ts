export const FULL_LOOP_END = -1;

export function getLoopRangeMaxIndex(itemCount: number) {
  return Math.max(0, itemCount - 1);
}

export function getLoopEndSliderValue(endLoopIndex: number, itemCount: number) {
  const maxIndex = getLoopRangeMaxIndex(itemCount);

  if (endLoopIndex === FULL_LOOP_END) {
    return maxIndex;
  }

  return Math.min(maxIndex, Math.max(0, endLoopIndex));
}

export function getLoopEndIndexFromSlider(
  sliderValue: number,
  itemCount: number,
) {
  const maxIndex = getLoopRangeMaxIndex(itemCount);
  return sliderValue >= maxIndex ? FULL_LOOP_END : Math.max(0, sliderValue);
}

export function getLoopSliceBounds(
  itemCount: number,
  startLoopIndex: number,
  endLoopIndex: number,
) {
  if (itemCount <= 0) {
    return { startIndex: 0, endIndexExclusive: 0 };
  }

  const maxIndex = getLoopRangeMaxIndex(itemCount);
  const startIndex = Math.min(maxIndex, Math.max(0, startLoopIndex));
  const requestedEndIndex =
    endLoopIndex === FULL_LOOP_END
      ? maxIndex
      : Math.min(maxIndex, Math.max(0, endLoopIndex));

  return {
    startIndex,
    endIndexExclusive: Math.max(startIndex, requestedEndIndex) + 1,
  };
}

export function sliceToLoopRange<T>(
  items: T[],
  startLoopIndex: number,
  endLoopIndex: number,
) {
  const { startIndex, endIndexExclusive } = getLoopSliceBounds(
    items.length,
    startLoopIndex,
    endLoopIndex,
  );

  return items.slice(startIndex, endIndexExclusive);
}
