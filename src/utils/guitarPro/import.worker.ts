import type { model } from "@coderline/alphatab/core";
import { convertScore, getImportTracks } from "./convertScore";
import { readGuitarProScore } from "./readScore";
import type { ImportRequest, ImportResponse } from "./types";

let score: model.Score | undefined;
let fileName = "";

self.onmessage = (event: MessageEvent<ImportRequest>) => {
  const send = (response: ImportResponse) => self.postMessage(response);
  try {
    if (event.data.type === "load") {
      score = undefined;
      fileName = event.data.fileName;
      score = readGuitarProScore(event.data.bytes, fileName);
      const tracks = getImportTracks(score);
      if (!tracks.length)
        throw new Error(
          "This file has no fretted instrument tracks. Drum and standard-notation-only tracks cannot be imported.",
        );
      send({ type: "tracks", tracks });
    } else {
      if (!score) throw new Error("Choose a Guitar Pro file first.");
      send({
        type: "preview",
        trackId: event.data.trackId,
        preview: convertScore(score, event.data.trackId, fileName),
      });
    }
  } catch (error) {
    send({
      type: "error",
      trackId: event.data.type === "convert" ? event.data.trackId : undefined,
      message:
        error instanceof Error &&
        !/format|end of|offset|bounds|signature|zip|xml|undefined|invalid/i.test(
          error.message,
        )
          ? error.message
          : "This file could not be read. It may be damaged, password-protected, or an unsupported version. Try opening it in Guitar Pro and exporting as GP5 or GP7.",
    });
  }
};
