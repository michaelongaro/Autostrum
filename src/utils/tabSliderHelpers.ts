function resetTabSliderPosition() {
  // semi-hacky way to *instantly* reset thumb + track position to
  // beginning of slider w/ no transition
  const audioSliderNode = document.getElementById("audioSlider");
  if (audioSliderNode) {
    const childElements = Array.from(
      audioSliderNode.children,
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
      audioSliderNode.children,
    ) as HTMLSpanElement[];

    childElements[0]!.children[0]!.style.transition = "right 1s linear";
    childElements[1]!.style.transition = "left 1s linear";
  }
}

function resetPlaybackTabSliderPosition() {
  const playbackSliderTrack = document.getElementById("playbackSliderTrack");
  const playbackSliderThumb = document.getElementById("playbackSliderThumb");

  if (!playbackSliderTrack || !playbackSliderThumb) return;

  const prevPlaybackTransitionDuration =
    playbackSliderThumb.style.transitionDuration;

  playbackSliderTrack.style.transitionDuration = "0s";
  playbackSliderTrack.style.transform = "scaleX(0)";

  playbackSliderThumb.style.transitionDuration = "0s";
  playbackSliderThumb.style.transform = "translate(-9px, -5px)"; // default px values for "starting" thumb position

  // re-apply the transition on the next frame after resetting the position
  requestAnimationFrame(() => {
    playbackSliderTrack.style.transitionDuration =
      prevPlaybackTransitionDuration;
    playbackSliderThumb.style.transitionDuration =
      prevPlaybackTransitionDuration;
  });
}

export {
  resetTabSliderPosition,
  returnTransitionToTabSlider,
  resetPlaybackTabSliderPosition,
};
