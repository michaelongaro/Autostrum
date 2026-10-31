import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { env } from "~/env";
import {
  getTabScreenshotThumbnailKey,
  type TabScreenshotThumbnailWidth,
} from "~/utils/tabScreenshotThumbnails";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/** Read pre-generated assets only. No request-time image transformations. */
export async function readTabScreenshot({
  tabId,
  filename,
  width,
  version,
  requireVersion = false,
}: {
  tabId: string;
  filename: string;
  width?: TabScreenshotThumbnailWidth;
  version?: string;
  requireVersion?: boolean;
}) {
  const originalKey = `${tabId}/${filename}`;
  const keys = width
    ? [getTabScreenshotThumbnailKey(tabId, filename, width), originalKey]
    : [originalKey];

  for (const key of keys) {
    let object;
    try {
      object = await s3.send(
        new GetObjectCommand({
          Bucket: `autostrum-screenshots${env.NODE_ENV === "development" ? "-dev" : ""}`,
          Key: key,
        }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "NoSuchKey" || error.name === "NotFound")
      ) {
        continue;
      }
      throw error;
    }

    const matchesVersion =
      version !== undefined && object.Metadata?.["tab-version"] === version;
    // New thumbnails must belong to the requested revision. Legacy JPEGs can
    // still be shown while a new capture is pending; masks must always match.
    if (
      !object.Body ||
      ((requireVersion || (key !== originalKey && version !== undefined)) &&
        !matchesVersion)
    ) {
      if (object.Body instanceof Readable) object.Body.destroy();
      continue;
    }

    return {
      body: Buffer.from(await object.Body.transformToByteArray()),
      // A fallback must expire soon: the saved thumbnail may arrive later.
      cacheControl:
        key === keys[0] && matchesVersion
          ? "public, max-age=31536000, immutable"
          : "public, max-age=60, s-maxage=60",
    };
  }
  return null;
}
