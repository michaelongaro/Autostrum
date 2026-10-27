import { getPrintPageSize, type PrintOptions } from "~/utils/printTab";

export function getPrintStyles(options: PrintOptions) {
  const { width, height, margin, contentWidth, contentHeight } =
    getPrintPageSize(options);
  // The shared notation mixes fixed staff dimensions with rem-based spacers.
  // Keep the app's 16px root so tuning, measures and rhythm guides stay aligned.
  return `
    @page { size: ${options.paper === "letter" ? "letter" : "A4"} ${options.orientation}; margin: 0; }
    :root {
      color-scheme: light;
      --background: 0 0% 100%; --foreground: 0 0% 9%; --primary: 0 0% 9%;
      --screenshot-background: 0 0% 100%; --screenshot-foreground: 0 0% 9%;
      --screenshot-primary-foreground: 0 0% 100%; --screenshot-border: 0 0% 70%;
      --screenshot-secondary: 0 0% 96%; --screenshot-accent: 0 0% 9%;
    }
    html { font-size: 16px; }
    body { margin: 0; padding: 0; background: #e5e5e5; color: #181818; font-family: Arial, Helvetica, sans-serif; font-size: 14px; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #print-source { position: absolute; left: -100000px; top: 0; width: ${contentWidth}px; visibility: hidden; }
    #print-pages { width: ${width}px; margin: 20px auto; }
    .print-page { width: ${width}px; height: ${height}px; padding: ${margin}px; background: white; margin-bottom: 20px; display: flex; flex-direction: column; box-shadow: 0 2px 12px #0002; overflow: hidden; }
    .print-running-header { height: 24px; flex-shrink: 0; display: flex; justify-content: space-between; gap: 16px; color: #555; font-size: 10px; overflow: hidden; white-space: nowrap; }
    .print-running-header span:first-child { overflow: hidden; text-overflow: ellipsis; }
    .print-page-content { width: ${contentWidth}px; height: ${contentHeight}px; flex-shrink: 0; }
    .print-page-footer { height: 24px; display: flex; align-items: end; justify-content: space-between; gap: 20px; font-size: 10px; color: #555; border-top: 1px solid #ddd; overflow-wrap: anywhere; }
    .print-page-footer span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    [data-print-block] { padding-bottom: 10px; overflow-wrap: anywhere; }
    h1, h2, p { margin: 0; }
    .print-title { padding-bottom: 4px; border-bottom: 2px solid #222; }
    .print-title h1 { font-size: 28px; font-weight: 700; line-height: 1.15; }
    .print-artist { font-size: 16px; margin-top: 4px; }
    .print-metadata { display: flex; flex-direction: column; gap: 3px; margin: 10px 0; font-size: 11px; }
    .print-description { font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
    .print-small-heading { padding-top: 8px; font-size: 13px; font-weight: 700; }
    .print-progression-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .print-progression-step { padding: 6px 8px; border: 1px solid #aaa; border-radius: 3px; font-size: 11px; }
    .print-progression-step span { color: #666; }
    .print-chord-diagrams { display: flex; align-items: start; }
    .print-chord-diagram { width: 112px; text-align: center; flex-shrink: 0; }
    .print-chord-diagram strong { display: block; font-size: 13px; min-height: 20px; }
    .print-chord-diagram > div { height: 112px; }
    .print-section-heading { padding: 10px 0 5px; border-bottom: 1px solid #555; font-size: 18px; font-weight: 700; }
    .print-subheading { font-size: 12px; font-weight: 700; padding-top: 3px; }
    .print-sequence-heading { font-size: 11px; display: flex; align-items: center; gap: 4px; }
    .print-tempo { display: inline-flex; align-items: center; gap: 3px; }
    .print-tempo svg { flex-shrink: 0; }
    .print-rhythm-guide svg { max-height: 16px; max-width: 22px; flex-shrink: 0; }
    .print-music { color: #181818; overflow-wrap: normal; }
    .print-strum-row { display: flex; align-items: start; padding: 2px 0 4px; }
    .print-strum { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
    .print-palm-mute { height: 24px; width: 100%; display: flex; align-items: center; }
    .print-chord-name { height: 34px; width: 100%; font-size: 11px; line-height: 15px; text-align: center; font-weight: 700; padding-inline: 1px; overflow-wrap: anywhere; }
    .print-strum-icon { height: 28px; position: relative; display: flex; align-items: center; justify-content: center; }
    .print-staccato { position: absolute; top: -8px; right: -5px; font-size: 22px; }
    .print-beat { height: 22px; font-size: 12px; }
    .print-empty { font-size: 12px; font-style: italic; color: #666; }
    @media screen {
      body { padding-bottom: 76px; }
    }
    @media print {
      html, body { background: white; width: ${width}px; }
      #print-source { display: none; }
      #print-pages { zoom: 1 !important; margin: 0 !important; width: ${width}px; }
      .print-page { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
      .print-page:last-child { break-after: auto; page-break-after: auto; }
    }
  `;
}
