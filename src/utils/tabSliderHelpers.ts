import { getPlaybackStutterDevFlags } from "~/utils/playbackStutterDevFlags";
import { markPlaybackStutter } from "~/utils/playbackStutterDiagnostics";

function resetProgressTabSliderPositionSync(type: "editing" | "playback") {
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

function resetProgressTabSliderPosition(type: "editing" | "playback") {
  if (
    process.env.NODE_ENV !== "production" &&
    getPlaybackStutterDevFlags().skipLoopSliderReset
  ) {
    return;
  }

  markPlaybackStutter("slider-loop-reset", { type });

  // Defer to the next frame so the reset does not run in the same turn as audio
  // scheduling and store updates at loop boundaries.
  requestAnimationFrame(() => {
    resetProgressTabSliderPositionSync(type);
  });
}

export { resetProgressTabSliderPosition };
