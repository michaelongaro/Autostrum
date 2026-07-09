function resetProgressTabSliderPosition(type: "editing" | "playback") {
  const track = document.getElementById(
    type === "editing" ? "editingSliderTrack" : "playbackSliderTrack",
  );
  const thumb = document.getElementById(
    type === "editing" ? "editingSliderThumb" : "playbackSliderThumb",
  );

  if (!track || !thumb) return;

  const prevTransitionDuration = thumb.style.transitionDuration;

  // Avoid forced synchronous layout (offsetWidth). Reading layout during
  // playback loop boundaries steals main-thread time from the scroll rAF and
  // causes visible hitches on mobile Safari. Zeroing transitionDuration and
  // writing transforms is enough for an instantaneous reset.
  track.style.transitionDuration = "0s";
  track.style.transform = "scaleX(0)";

  thumb.style.transitionDuration = "0s";
  thumb.style.transform = "translate(-9px, -5px)"; // default px values for "starting" thumb position

  // Restore transitions on the next frame without a sync reflow.
  requestAnimationFrame(() => {
    track.style.transitionDuration = prevTransitionDuration;
    thumb.style.transitionDuration = prevTransitionDuration;
  });
}

export { resetProgressTabSliderPosition };
