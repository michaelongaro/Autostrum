import type { TabDocument } from "../tabDocument";

export const GUITAR_PRO_ACCEPT = ".gp3,.gp4,.gp5,.gpx,.gp,.gp7,.gp8";
export const MAX_GUITAR_PRO_BYTES = 20 * 1024 * 1024;

export interface ImportTrack {
  id: string;
  name: string;
  strings: number;
  measures: number;
}

export interface ImportPreview {
  document: TabDocument;
  warnings: string[];
  measures: number;
}

export type ImportRequest =
  | { type: "load"; bytes: Uint8Array; fileName: string }
  | { type: "convert"; trackId: string };

export type ImportResponse =
  | { type: "tracks"; tracks: ImportTrack[] }
  | { type: "preview"; trackId: string; preview: ImportPreview }
  | { type: "error"; trackId?: string; message: string };

export function validateGuitarProFile(file: { name: string; size: number }) {
  if (!/\.(gp[34578]?|gpx)$/i.test(file.name))
    throw new Error(
      "Choose a Guitar Pro 3–8 file (.gp3, .gp4, .gp5, .gpx, or .gp). For .gtp files, export to GP5 in Guitar Pro first.",
    );
  if (file.size === 0)
    throw new Error("This file is empty. Choose another file.");
  if (file.size > MAX_GUITAR_PRO_BYTES)
    throw new Error(
      "This file is too large. Choose a file under 20 MB, or export it without embedded audio.",
    );
}
