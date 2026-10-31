import type { NextApiRequest, NextApiResponse } from "next";
import { readTabScreenshot } from "~/server/tabScreenshotStorage";
import { TAB_SCREENSHOT_MASK_FORMAT } from "~/utils/tabScreenshotMasks";
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

  const { id, v, width } = req.query;
  const thumbnailWidth = width === undefined ? undefined : Number(width);
  if (
    typeof id !== "string" ||
    !/^\d+$/.test(id) ||
    typeof v !== "string" ||
    !Number.isFinite(Date.parse(v)) ||
    (width !== undefined && typeof width !== "string") ||
    (thumbnailWidth !== undefined &&
      !isTabScreenshotThumbnailWidth(thumbnailWidth))
  ) {
    return res.status(400).end();
  }

  try {
    const image = await readTabScreenshot({
      tabId: id,
      filename: `${TAB_SCREENSHOT_MASK_FORMAT}.png`,
      version: v,
      width: thumbnailWidth,
      requireVersion: true,
    });
    if (!image) return res.status(404).end();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", image.cacheControl);
    return res.status(200).send(image.body);
  } catch (error) {
    console.error("Could not load tab screenshot masks", {
      tabId: id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).end();
  }
}
