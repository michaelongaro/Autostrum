import type { summarizePlaybackStutterDiagnostics } from "~/utils/playbackStutterDiagnostics";

declare global {
  interface Window {
    __playbackStutterDiagnostics?: {
      getRecentSamples: () => unknown[];
      summarize: typeof summarizePlaybackStutterDiagnostics;
      clear: () => void;
    };
  }
}

export {};
