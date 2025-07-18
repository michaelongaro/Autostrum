import axios from "axios";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "stream";
import { env } from "~/env";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id, theme } = req.query;

  const command = new GetObjectCommand({
    Bucket: `autostrum-screenshots${env.NODE_ENV === "development" ? "-dev" : ""}`,
    Key: `${id as string}/${theme as string}.jpeg`,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 15 * 60 });

  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });
    if (response.status !== 200) {
      res.status(response.status).end();
      return;
    }
    res.setHeader("Content-Type", "image/jpeg");
    (response.data as Readable).pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
