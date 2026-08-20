import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";

const LOG_PATH = "/opt/cursor/logs/debug.log";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const payload =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    fs.appendFileSync(LOG_PATH, payload + "\n");
    return res.status(204).end();
  } catch (error) {
    console.error("[agent-debug-log] write failed", error);
    return res.status(500).json({ ok: false });
  }
}
