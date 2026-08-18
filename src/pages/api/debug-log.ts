import type { NextApiRequest, NextApiResponse } from "next";
import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const LOG_PATH = "/opt/cursor/logs/debug.log";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${JSON.stringify(req.body)}\n`);
    return res.status(204).end();
  } catch {
    return res.status(500).json({ ok: false });
  }
}
