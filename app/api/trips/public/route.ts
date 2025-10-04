// app/api/trips/public/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

/** Validate env & normalize prefix */
function requireEnv() {
  const REGION = (process.env.AWS_REGION || "").trim();
  const BUCKET = (process.env.S3_BUCKET || "").trim();
  const RAW_PREFIX = (process.env.S3_TRIPS_PREFIX || "trips/").trim();
  const PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, "") + "/";

  const miss: string[] = [];
  if (!REGION) miss.push("AWS_REGION");
  if (!BUCKET) miss.push("S3_BUCKET");
  if (!process.env.AWS_ACCESS_KEY_ID) miss.push("AWS_ACCESS_KEY_ID");
  if (!process.env.AWS_SECRET_ACCESS_KEY) miss.push("AWS_SECRET_ACCESS_KEY");
  if (miss.length) return { ok: false as const, error: `Missing env: ${miss.join(", ")}` };
  return { ok: true as const, REGION, BUCKET, PREFIX };
}

function client(region: string) {
  // If you later move to R2, you can extend with endpoint + forcePathStyle here.
  return new S3Client({ region });
}

/** Minimal stream -> string helper */
async function bodyToString(body: any): Promise<string> {
  if (body?.transformToString) return body.transformToString();
  if (typeof body?.text === "function") return body.text();
  if (body?.getReader) {
    const r = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await r.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
    return new TextDecoder().decode(out);
  }
  return "";
}

/** GET /api/trips/public -> list public trips (server-first, no-cache) */
export async function GET() {
  const cfg = requireEnv();
  if (!cfg.ok) {
    console.error("ENV ERROR /api/trips/public GET:", cfg.error);
    return NextResponse.json(
      { error: "Failed to list public trips", detail: cfg.error },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const s3 = client(cfg.REGION);

  try {
    const listed = await s3.send(
      new ListObjectsV2Command({ Bucket: cfg.BUCKET, Prefix: cfg.PREFIX })
    );

    const keys = (listed.Contents || [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k && k.endsWith(".json"));

    const trips = await Promise.all(
      keys.map(async (Key) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.BUCKET, Key }));
        const text = await bodyToString(obj.Body as any);
        return JSON.parse(text);
      })
    );

    // Only return public trips, and sort newest first
    const publicTrips = (trips || [])
      .filter((t) => t?.isPublic !== false) // treat missing as public if you historically didn’t set it
      .sort((a, b) => {
        const A = a.updatedAt ?? a.publishedAt ?? a.createdAt ?? 0;
        const B = b.updatedAt ?? b.publishedAt ?? b.createdAt ?? 0;
        return Number(B) - Number(A);
      });

    return NextResponse.json(publicTrips, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("LIST public trips error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    });
    return NextResponse.json(
      { error: "Failed to list public trips", detail: err?.name || err?.message || "UnknownError" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
