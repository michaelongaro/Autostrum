import { tabDocumentSchema, type TabDocument } from "~/utils/tabDocument";
import { isDefaultTabDocument } from "~/utils/drafts/draftDocument";

const SIGN_IN_TAB_KEY = "autostrum-tabData";

export function saveTabForSignIn(document: TabDocument) {
  try {
    if (isDefaultTabDocument(document)) {
      window.localStorage.removeItem(SIGN_IN_TAB_KEY);
      return;
    }
    window.localStorage.setItem(SIGN_IN_TAB_KEY, JSON.stringify(document));
  } catch {
    // Signing in should still work if browser storage is unavailable.
  }
}

export function readTabForSignIn() {
  try {
    const serialized = window.localStorage.getItem(SIGN_IN_TAB_KEY);
    if (!serialized) return null;
    const document = tabDocumentSchema.parse(JSON.parse(serialized) as unknown);
    if (isDefaultTabDocument(document)) {
      clearTabForSignIn({ serialized });
      return null;
    }
    return { document, serialized };
  } catch {
    // Keep an unreadable snapshot intact.
    return null;
  }
}

export function clearTabForSignIn(snapshot: { serialized: string }) {
  try {
    if (window.localStorage.getItem(SIGN_IN_TAB_KEY) === snapshot.serialized)
      window.localStorage.removeItem(SIGN_IN_TAB_KEY);
  } catch {
    // Keep the snapshot until its replacement is safely stored.
  }
}
