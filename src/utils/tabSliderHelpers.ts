function resetProgressTabSliderPosition(type: "editing" | "playback") {
  const track = document.getElementById(
    type === "editing" ? "editingSliderTrack" : "playbackSliderTrack",
  );
  const thumb = document.getElementById(
    type === "editing" ? "editingSliderThumb" : "playbackSliderThumb",
  );

  if (!track || !thumb) return;

  const prevTransitionDuration = thumb.style.transitionDuration;

  track.style.transitionDuration = "0s";
  track.style.transform = "scaleX(0)";

  thumb.style.transitionDuration = "0s";
  thumb.style.transform = "translate(-9px, -5px)"; // default px values for "starting" thumb position

  // force reflow to apply the new styles
  void thumb.offsetWidth;
  void track.offsetWidth;

  // re-apply the transition on the next frame after resetting the position
  track.style.transitionDuration = prevTransitionDuration;
  thumb.style.transitionDuration = prevTransitionDuration;
}

export { resetProgressTabSliderPosition };
