import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "~/env";
import { getTabScreenshotMaskKey } from "~/utils/tabScreenshotMasks";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

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

  const { id, v } = req.query;
  if (
    typeof id !== "string" ||
    !/^\d+$/.test(id) ||
    typeof v !== "string" ||
    !Number.isFinite(Date.parse(v))
  ) {
    return res.status(400).end();
  }

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: `autostrum-screenshots${env.NODE_ENV === "development" ? "-dev" : ""}`,
        Key: getTabScreenshotMaskKey(id),
      }),
    );
    // The external JPEG capture service can update a tab before its masks have
    // been retaken. Never show geometry from an older tab revision.
    if (!object.Body || object.Metadata?.["tab-version"] !== v) {
      if (object.Body instanceof Readable) object.Body.destroy();
      return res.status(404).end();
    }

    const body = Buffer.from(await object.Body.transformToByteArray());
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(body);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "NoSuchKey" || error.name === "NotFound")
    ) {
      return res.status(404).end();
    }
    console.error("Could not load tab screenshot masks", {
      tabId: id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).end();
  }
}
