/** Print the paginated preview, using a top-level document on iOS. */
export async function printPreparedTab(frame: HTMLIFrameElement) {
  const source = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  const pages = source?.getElementById("print-pages");
  if (!source || !frameWindow || !pages?.childElementCount) {
    throw new Error("The print preview is not ready. Close it and try again.");
  }

  // iPadOS can identify itself as desktop Safari. iOS browsers can hand an
  // iframe print request to the containing page instead of the custom tab.
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) {
    frameWindow.focus();
    frameWindow.print();
    return;
  }

  // Open synchronously inside the user's click, before waiting for resources,
  // so Safari treats this as a user-initiated tab rather than a blocked popup.
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error(
      "Allow pop-ups for Autostrum, then tap Print again to open your print document.",
    );
  }
  printWindow.opener = null;
  const target = printWindow.document;
  // A new about:blank document uses quirks mode unless parsed with a doctype.
  target.open();
  target.write(
    '<!doctype html><html lang="en"><head></head><body></body></html>',
  );
  target.close();
  target.title = source.title;
  const base = target.createElement("base");
  base.href = source.baseURI;
  const viewport = target.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  target.head.append(base, viewport);

  const stylesLoaded: Promise<void>[] = [];
  for (const sheet of Array.from(source.styleSheets)) {
    if (sheet.disabled) continue;
    try {
      // Development styles can be inserted through CSSOM, leaving the style
      // element's text empty. Serialize the live rules rather than innerHTML.
      const style = target.createElement("style");
      style.media = sheet.media.mediaText;
      style.textContent = Array.from(
        sheet.cssRules,
        (rule) => rule.cssText,
      ).join("\n");
      target.head.append(style);
    } catch {
      // Cross-origin sheets cannot expose cssRules; load their URL instead.
      if (!sheet.href) throw new Error("The print styles could not be copied.");
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      link.media = sheet.media.mediaText;
      stylesLoaded.push(
        new Promise<void>((resolve, reject) => {
          link.onload = () => resolve();
          link.onerror = () =>
            reject(new Error("The print styles could not be loaded."));
        }),
      );
      target.head.append(link);
    }
  }

  // Copy only the completed pages, never the hidden measurement source or app
  // UI. DOM cloning also keeps user-provided titles/descriptions as plain text.
  target.body.append(target.importNode(pages, true));
  const actions = target.createElement("div");
  actions.id = "print-window-actions";
  for (const [label, action] of [
    ["Print", () => printWindow.print()],
    ["Close", () => printWindow.close()],
  ] as const) {
    const button = target.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);
    actions.append(button);
  }
  const actionsStyle = target.createElement("style");
  actionsStyle.textContent = `
    #print-window-actions { position: fixed; bottom: max(16px, env(safe-area-inset-bottom)); right: 16px; display: flex; gap: 8px; }
    #print-window-actions button { padding: 10px 18px; border: 1px solid #aaa; border-radius: 6px; background: white; color: #181818; font: 16px Arial, sans-serif; }
    @media print { #print-window-actions { display: none; } }
  `;
  target.head.append(actionsStyle);
  target.body.append(actions);

  await Promise.all(stylesLoaded);
  await target.fonts.ready;
  await new Promise<void>((resolve) => {
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => resolve());
    });
  });
  if (printWindow.closed) return;
  printWindow.focus();
  printWindow.print();
  // Keep the document open for cancellation/reprinting. Safari's print() and
  // afterprint can return/fire before the native print sheet has finished.
}
