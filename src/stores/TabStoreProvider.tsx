"use client";

import type { ReactNode } from "react";
import { AppPreferencesContext } from "./AppPreferencesStore";
import { TabStoreContext, type TabStoreApi } from "./TabStore";

/** Supply both session state and its independent preferences to reusable UI. */
export function TabStoreProvider({
  store,
  children,
}: {
  store: TabStoreApi;
  children: ReactNode;
}) {
  return (
    <AppPreferencesContext.Provider value={store.preferences}>
      <TabStoreContext.Provider value={store}>
        {children}
      </TabStoreContext.Provider>
    </AppPreferencesContext.Provider>
  );
}
