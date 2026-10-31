import type { NextApiRequest, NextApiResponse } from "next";
import { readTabScreenshot } from "~/server/tabScreenshotStorage";
import { isTabScreenshotThumbnailWidth } from "~/utils/tabScreenshotThumbnails";

export const config = { api: { responseLimit: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const { id, theme, v, width } = req.query;
  const thumbnailWidth = width === undefined ? undefined : Number(width);
  if (
    typeof id !== "string" ||
    !/^\d+$/.test(id) ||
    (theme !== "light" && theme !== "dark") ||
    (v !== undefined &&
      (typeof v !== "string" || !Number.isFinite(Date.parse(v)))) ||
    (width !== undefined && typeof width !== "string") ||
    (thumbnailWidth !== undefined &&
      !isTabScreenshotThumbnailWidth(thumbnailWidth))
  ) {
    return res.status(400).end();
  }

  try {
    const image = await readTabScreenshot({
      tabId: id,
      filename: `${theme}.jpeg`,
      version: v,
      width: thumbnailWidth,
    });
    if (!image) return res.status(404).end();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", image.cacheControl);
    return res.status(200).send(image.body);
  } catch (error) {
    console.error("Could not load tab screenshot", {
      tabId: id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).end();
  }
}
