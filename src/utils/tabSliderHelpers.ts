function resetTabSliderPosition() {
  // semi-hacky way to *instantly* reset thumb + track position to
  // beginning of slider w/ no transition
  const audioSliderNode = document.getElementById("audioSlider");
  if (audioSliderNode) {
    const childElements = Array.from(
      audioSliderNode.children
    ) as HTMLSpanElement[];
    childElements[0]!.children[0]!.style.transition = "none";
    childElements[0]!.children[0]!.style.right = "100%";
    childElements[1]!.style.transition = "none";
    // calc prob not necessary, but consistent w/ radix's styles
    childElements[1]!.style.left = "calc(0% + 10px)";
  }
}

function returnTransitionToTabSlider() {
  // used in effects in <AudioControls /> when the slider position state
  // is actually updated and it is safe to give the slider it's linear
  // transition back.
  const audioSliderNode = document.getElementById("audioSlider");
  if (audioSliderNode) {
    const childElements = Array.from(
      audioSliderNode.children
    ) as HTMLSpanElement[];

    childElements[0]!.children[0]!.style.transition = "right 1s linear";
    childElements[1]!.style.transition = "left 1s linear";
  }
}

export { resetTabSliderPosition, returnTransitionToTabSlider };
