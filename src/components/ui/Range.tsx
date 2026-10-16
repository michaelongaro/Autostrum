import { Direction, Range as ReactRange } from "react-range";

export { Direction, getTrackBackground } from "react-range";

function getLayoutSize(style: CSSStyleDeclaration) {
  const width = Number.parseFloat(style.width);
  const height = Number.parseFloat(style.height);

  if (style.boxSizing === "border-box") return { width, height };

  return {
    width:
      width +
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth),
    height:
      height +
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth),
  };
}

/**
 * react-range measures transformed bounding rectangles when positioning thumbs.
 * Opening a scaled popover/modal therefore leaves a stale offset after its
 * animation, since ResizeObserver does not observe transforms. CSS translations
 * need unscaled layout sizes; pointer handling still needs viewport rectangles.
 */
export class Range extends ReactRange {
  override getOffsets = () => {
    const track = this.trackRef.current;
    if (!track) return [];

    const { direction, values, min, max } = this.props;
    const trackStyle = window.getComputedStyle(track);
    const trackSize = getLayoutSize(trackStyle);
    const paddingLeft =
      Number.parseFloat(trackStyle.paddingLeft) +
      Number.parseFloat(trackStyle.borderLeftWidth);
    const paddingRight =
      Number.parseFloat(trackStyle.paddingRight) +
      Number.parseFloat(trackStyle.borderRightWidth);
    const paddingTop =
      Number.parseFloat(trackStyle.paddingTop) +
      Number.parseFloat(trackStyle.borderTopWidth);

    return this.getThumbs().map((thumb, index) => {
      const thumbStyle = window.getComputedStyle(thumb);
      const thumbSize = getLayoutSize(thumbStyle);
      const ratio = (values[index]! - min) / (max - min);
      const marginLeft = Number.parseFloat(thumbStyle.marginLeft);
      const marginRight = Number.parseFloat(thumbStyle.marginRight);
      const centeredX =
        -(thumbSize.width - trackSize.width) / 2 - marginLeft - paddingLeft;
      const centeredY = -(thumbSize.height - trackSize.height) / 2 - paddingTop;

      switch (direction) {
        case Direction.Right:
          return {
            x:
              trackSize.width * ratio -
              thumbSize.width / 2 -
              marginLeft -
              paddingLeft,
            y: centeredY,
          };
        case Direction.Left:
          return {
            x:
              trackSize.width * (1 - ratio) -
              thumbSize.width / 2 -
              marginRight -
              paddingRight,
            y: centeredY,
          };
        case Direction.Up:
          return {
            x: centeredX,
            y:
              trackSize.height * (1 - ratio) -
              thumbSize.height / 2 -
              paddingLeft,
          };
        case Direction.Down:
          return {
            x: centeredX,
            y: trackSize.height * ratio - thumbSize.height / 2 - paddingLeft,
          };
      }
    });
  };
}
