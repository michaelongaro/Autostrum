export default function resetAudioSliderPosition() {
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
    childElements[1]!.style.left = "0";
  }
}