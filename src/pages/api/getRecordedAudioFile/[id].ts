import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { NextApiRequest, NextApiResponse } from "next";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  const command = new GetObjectCommand({
    Bucket: "autostrum-recordings",
    Key: `${typeof id === "string" ? id : "-1"}.webm`,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 15 * 60 });

  try {
    const result = await fetch(url);
    if (!result.ok) {
      res.status(result.status).end();
      return;
    }

    const arrayBuffer = await result.arrayBuffer();
    const nodeBuffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/webm;codecs=opus");
    res.status(200).end(nodeBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
