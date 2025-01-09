import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";

// emulates <dialog> behavior by preventing body from scrolling

function useModalScrollbarHandling() {
  const { setPreventFramerLayoutShift } = useTabStore((state) => ({
    setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
  }));

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10),
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);
}

export default useModalScrollbarHandling;
