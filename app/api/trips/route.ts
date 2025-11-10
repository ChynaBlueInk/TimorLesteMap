// app/api/trips/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

/** Validate env & normalize prefix */
function requireEnv() {
  const REGION = (process.env.AWS_REGION || "").trim();
  const BUCKET = (process.env.S3_TRIPS_BUCKET || "").trim(); // 👈 trips bucket
  const RAW_PREFIX = (process.env.S3_TRIPS_PREFIX || "trips/").trim();
  const PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, "") + "/";

  const miss: string[] = [];
  if (!REGION) miss.push("AWS_REGION");
  if (!BUCKET) miss.push("S3_TRIPS_BUCKET");
  if (miss.length) {
    return { ok: false as const, error: `Missing env: ${miss.join(", ")}` };
  }
  return { ok: true as const, REGION, BUCKET, PREFIX };
}

function client(region: string) {
  return new S3Client({ region });
}

/** Small helper: body -> JSON */
async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Minimal stream -> string helper (for GET list if needed) */
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

/**
 * POST /api/trips
 * Body: full trip object (with id, createdAt, updatedAt as timestamp numbers)
 * This is what createTripWithStatus / updateTripWithStatus sends.
 */
export async function POST(req: Request) {
  const cfg = requireEnv();
  if (!cfg.ok) {
    console.error("ENV ERROR /api/trips POST:", cfg.error);
    return NextResponse.json(
      { error: "Missing server configuration", detail: cfg.error },
      { status: 500 }
    );
  }

  const trip = await readJson(req);
  if (!trip || !trip.id) {
    return NextResponse.json(
      { error: "Trip id is required" },
      { status: 400 }
    );
  }

  const s3 = client(cfg.REGION);
  const Key = `${cfg.PREFIX}${trip.id}.json`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.BUCKET,
        Key,
        Body: JSON.stringify(trip),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("SAVE trip error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    });
    return NextResponse.json(
      { error: "Failed to save trip", detail: err?.message || "UnknownError" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trips
 * Optional: list all trips from S3 (mostly for debugging)
 */
export async function GET() {
  const cfg = requireEnv();
  if (!cfg.ok) {
    return NextResponse.json(
      { error: "Missing server configuration", detail: cfg.error },
      { status: 500 }
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
        const obj = await s3.send(
          new GetObjectCommand({ Bucket: cfg.BUCKET, Key })
        );
        const text = await bodyToString(obj.Body as any);
        return JSON.parse(text);
      })
    );

    return NextResponse.json(trips ?? [], { status: 200 });
  } catch (err: any) {
    console.error("LIST trips error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    });
    return NextResponse.json(
      { error: "Failed to list trips", detail: err?.message || "UnknownError" },
      { status: 500 }
    );
  }
}
