import type { Draft } from "immer";
import type { TabState } from "./types";

export type TabStateSetter = (
  update: Partial<TabState> | ((draft: Draft<TabState>) => void),
) => void;
