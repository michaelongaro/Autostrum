import { Environment, io, Settings } from "@coderline/alphatab/core";
import type { model } from "@coderline/alphatab/core";
import { validateGuitarProFile } from "./types";

export function readGuitarProScore(
  bytes: Uint8Array,
  fileName: string,
): model.Score {
  validateGuitarProFile({ name: fileName, size: bytes.byteLength });
  const settings = new Settings();
  settings.importer.maxDecodingBufferSize = 64 * 1024 * 1024;
  // Restrict parsers: renamed MusicXML/alphaTex files are not Guitar Pro files.
  for (const parser of Environment.buildImporters().filter((parser) =>
    /Guitar Pro/i.test(parser.name),
  )) {
    try {
      parser.init(io.ByteBuffer.fromBuffer(bytes), settings);
      return parser.readScore();
    } catch {
      // A different Guitar Pro generation may accept these bytes.
    }
  }
  throw new Error(
    "This file could not be read. It may be damaged, password-protected, or an unsupported version. Try opening it in Guitar Pro and exporting as GP5 or GP7.",
  );
}
