// app/api/s3/presign/route.ts
// Node runtime (required for AWS SDK)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;

// Initialize once per lambda
const s3 = new S3Client({ region: REGION });

type Body = {
  fileName?: string;
  fileType?: string;   // e.g. "image/jpeg"
  folder?: string;     // e.g. "places"
};

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

function isAllowedMime(mime?: string) {
  return !!mime && /^image\/(png|jpe?g|webp|gif|avif)$/i.test(mime);
}

export async function POST(req: Request) {
  try {
    if (!REGION || !BUCKET) {
      return NextResponse.json(
        { error: "Missing AWS_REGION or S3_BUCKET env" },
        { status: 500 }
      );
    }

    const { fileName, fileType, folder }: Body = await req.json().catch(() => ({} as Body));
    if (!fileName || !fileType) {
      return NextResponse.json({ error: "fileName and fileType are required" }, { status: 400 });
    }
    if (!isAllowedMime(fileType)) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const key = `${folder || "places"}/${Date.now()}-${safeFileName(fileName)}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 8_000_000],                 // ~8MB max
        ["starts-with", "$Content-Type", fileType.split("/")[0] + "/"],
      ],
      Expires: 60, // seconds
    });

    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ url, fields, key, publicUrl });
  } catch (err: any) {
    console.error("S3 presign error", err);
    return NextResponse.json({ error: "Failed to create presigned post" }, { status: 500 });
  }
}
