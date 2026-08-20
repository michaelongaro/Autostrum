/**
 * Temporary debug-mode logger. Posts NDJSON to /api/agent-debug-log and mirrors to console.
 * Remove after investigation.
 */
export function agentDebugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}): void {
  // #region agent log
  const body = {
    ...payload,
    data: payload.data ?? {},
    timestamp: Date.now(),
  };
  try {
    console.log("[agent-debug]", body);
  } catch {
    /* ignore */
  }
  try {
    void fetch("/api/agent-debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* ignore */
  }
  // #endregion
}
