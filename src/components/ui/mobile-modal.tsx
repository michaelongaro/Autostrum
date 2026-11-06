"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type Ref,
} from "react";
import { registerModalTouchGuard } from "~/utils/modalTouchGuard";

const touchQuery = "(hover: none) and (pointer: coarse)";
const getTouchSnapshot = () => window.matchMedia(touchQuery).matches;
const getServerSnapshot = () => false;
function subscribe(onChange: () => void) {
  const query = window.matchMedia(touchQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export const MobileModalContext = createContext(false);

function setRef(ref: Ref<HTMLDivElement>, element: HTMLDivElement | null) {
  if (typeof ref === "function") return ref(element);
  if (ref) ref.current = element;
}

export function useMobileModal(modal: boolean | "trap-focus") {
  const touchDevice = useSyncExternalStore(
    subscribe,
    getTouchSnapshot,
    getServerSnapshot,
  );
  return touchDevice && modal !== false;
}

export function useMobileModalRef(forwardedRef: Ref<HTMLDivElement>) {
  const enabled = useContext(MobileModalContext);
  return useCallback(
    (element: HTMLDivElement | null) => {
      const refCleanup = setRef(forwardedRef, element);
      if (!element) return;

      const removeGuard = enabled
        ? registerModalTouchGuard(element)
        : undefined;
      // React 19 callback-ref cleanup also covers abrupt unmounts and Strict Mode.
      return () => {
        removeGuard?.();
        if (typeof refCleanup === "function") refCleanup();
        else setRef(forwardedRef, null);
      };
    },
    [enabled, forwardedRef],
  );
}
