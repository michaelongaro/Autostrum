const NEW_TAB_TITLE_KEY = "autostrum-newTabTitle";

export function saveNewTabTitle(title: string) {
  try {
    window.localStorage.setItem(NEW_TAB_TITLE_KEY, title.trim().slice(0, 50));
  } catch {
    // Creating a tab should still work when browser storage is unavailable.
  }
}

export function readNewTabTitle() {
  try {
    const serialized = window.localStorage.getItem(NEW_TAB_TITLE_KEY);
    if (!serialized) return null;
    const title = serialized.trim().slice(0, 50);
    return title ? { title, serialized } : null;
  } catch {
    return null;
  }
}

export function clearNewTabTitle(snapshot: { serialized: string }) {
  try {
    if (window.localStorage.getItem(NEW_TAB_TITLE_KEY) === snapshot.serialized)
      window.localStorage.removeItem(NEW_TAB_TITLE_KEY);
  } catch {
    // Storage access must not prevent the editor from opening.
  }
}
