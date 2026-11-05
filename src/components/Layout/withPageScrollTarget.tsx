import type { ComponentType } from "react";

/** Keep Next's native scroll handling anchored to the document, not page margins. */
export default function withPageScrollTarget<Props extends object>(
  Page: ComponentType<Props>,
) {
  return function PageWithScrollTarget(props: Props) {
    return (
      <>
        {/* The shared main is positioned at the document origin. A nonempty,
            out-of-flow target lets Next detect even a small scroll offset.
            Native hash, history, and scroll:false behavior remain in charge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 size-px"
        />
        <Page {...props} />
      </>
    );
  };
}
