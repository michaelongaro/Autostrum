"use client";

import { useState } from "react";
import { TabScreenshotPreviews } from "~/components/Tab/TabScreenshotPreview";
import {
  createTabStore,
  TabStoreContext,
  type Chord,
  type Section,
} from "~/stores/TabStore";
import { normalizeTuningValue } from "~/utils/tunings";

export default function Preview({
  id,
  version,
  bpm,
  tuning,
  chords,
  tabData,
}: {
  id: number;
  version: string;
  bpm: number;
  tuning: string;
  chords: Chord[];
  tabData: Section[];
}) {
  const [store] = useState(() =>
    createTabStore({
      id,
      bpm,
      tuning: normalizeTuningValue(tuning),
      chords,
      tabData,
    }),
  );
  return (
    <TabStoreContext.Provider value={store}>
      <div data-screenshot-ready="">
        <TabScreenshotPreviews
          id={id}
          version={version}
          tabData={tabData}
          bpm={bpm}
        />
      </div>
    </TabStoreContext.Provider>
  );
}
