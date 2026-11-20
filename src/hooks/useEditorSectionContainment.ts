import { useEffect, useRef } from "react";
import { useTabStoreApi } from "~/stores/TabStore";

/**
 * Skip offscreen layout without unmounting inputs, popovers or local edit state.
 * Start with natural layout so the placeholder uses the real expanded height,
 * including the editor's 350ms section/block entrance animations.
 */
export function useEditorSectionContainment(
  enabled: boolean,
  sectionIndex: number,
) {
  const ref = useRef<HTMLDivElement>(null);
  const store = useTabStoreApi();

  useEffect(() => {
    const body = ref.current;
    if (!enabled || !body || !CSS.supports("content-visibility", "auto"))
      return;

    let timer: ReturnType<typeof setTimeout>;
    // Fall back to remeasuring unfocused sections on browsers without the event.
    let isSkipped =
      typeof ContentVisibilityAutoStateChangeEvent === "undefined";
    function handleVisibilityChange(event: Event) {
      isSkipped = (event as ContentVisibilityAutoStateChangeEvent).skipped;
    }

    function scheduleMeasurement() {
      if (!body) return;
      clearTimeout(timer);
      // Remeasure naturally at the new width. A remembered size from the old
      // width would otherwise leave incorrect scroll geometry until revealed.
      body.style.contentVisibility = "visible";
      body.style.containIntrinsicSize = "none";
      timer = setTimeout(() => {
        // Intrinsic sizes describe the content box. Including pt-4 here would
        // add the padding a second time to every skipped section.
        const style = getComputedStyle(body);
        const contentHeight =
          body.offsetHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom) -
          parseFloat(style.borderTopWidth) -
          parseFloat(style.borderBottomWidth);
        body.style.containIntrinsicSize = `auto ${Math.max(0, contentHeight)}px`;
        body.style.contentVisibility = "auto";
      }, 450);
    }

    body.addEventListener(
      "contentvisibilityautostatechange",
      handleVisibilityChange,
    );
    scheduleMeasurement();
    // The browser updates the remembered size while the section is rendered.
    // Toggling containment during a note edit can change how thin lines paint.
    // Remeasure skipped sections so offscreen history edits still update layout.
    const unsubscribe = store.subscribe((state, previous) => {
      if (
        state.tabData[sectionIndex] !== previous.tabData[sectionIndex] &&
        isSkipped &&
        !body.contains(document.activeElement)
      ) {
        scheduleMeasurement();
      }
    });
    window.addEventListener("resize", scheduleMeasurement, { passive: true });
    return () => {
      unsubscribe();
      clearTimeout(timer);
      body.removeEventListener(
        "contentvisibilityautostatechange",
        handleVisibilityChange,
      );
      window.removeEventListener("resize", scheduleMeasurement);
      body.style.contentVisibility = "";
      body.style.containIntrinsicSize = "";
    };
  }, [enabled, sectionIndex, store]);

  return ref;
}
