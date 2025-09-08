// app/api/trips/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

/** Validate env & normalize prefix (trips/) */
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

/** Stream helpers (no Node Buffer) */
function concatUint8Arrays(chunks: Uint8Array[]) {
  let len = 0;
  for (const c of chunks) len += c.byteLength;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
async function bodyToString(body: any): Promise<string> {
  if (body?.transformToString) return body.transformToString();
  if (typeof body?.text === "function") return body.text();
  if (body?.getReader) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return new TextDecoder("utf-8").decode(concatUint8Arrays(chunks));
  }
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
      chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
    }
    return new TextDecoder("utf-8").decode(concatUint8Arrays(chunks));
  }
  return "";
}

const newId = () =>
  (globalThis as any).crypto?.randomUUID?.() || "trip-" + Math.random().toString(36).slice(2, 10);

function client(region: string) {
  // Keep consistent with your places route config
  return new S3Client({ region, forcePathStyle: true });
}

/**
 * GET /api/trips
 * - By default returns PUBLIC trips only (isPublic === true)
 * - If ?ownerId=<uid> is provided, returns that owner’s trips (public and private)
 */
export async function GET(req: Request) {
  const cfg = requireEnv();
  if (!cfg.ok) {
    console.error("ENV ERROR /api/trips GET:", cfg.error);
    return NextResponse.json({ error: "Failed to list trips", detail: cfg.error }, { status: 500 });
  }
  const s3 = client(cfg.REGION);

  const url = new URL(req.url);
  const ownerIdFilter = url.searchParams.get("ownerId")?.trim() || "";

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

    const result = ownerIdFilter
      ? trips.filter((t) => t.ownerId === ownerIdFilter)
      : trips.filter((t) => t.isPublic === true);

    // Sort newest first
    result.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("LIST trips error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
      region: cfg.REGION,
      bucket: cfg.BUCKET,
      prefix: cfg.PREFIX,
      cause: err?.cause?.message || undefined,
    });
    return NextResponse.json(
      { error: "Failed to list trips", detail: err?.name || err?.message || "UnknownError" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips
 * Body: {
 *   name: string,
 *   description?: string,
 *   places: TripPlace[],
 *   ownerId: string,
 *   isPublic: boolean,
 *   transportMode?, roadCondition?, startKey?, customEndName?, customEndCoords?,
 *   overrideDistanceKm?, overrideTimeHours?, estimatedDuration?
 * }
 */
export async function POST(req: Request) {
  const cfg = requireEnv();
  if (!cfg.ok) {
    console.error("ENV ERROR /api/trips POST:", cfg.error);
    return NextResponse.json({ error: "Failed to create trip", detail: cfg.error }, { status: 500 });
  }
  const s3 = client(cfg.REGION);

  try {
    const data = await req.json();

    if (!data?.name || !Array.isArray(data?.places) || !data?.ownerId) {
      return NextResponse.json(
        { error: "Invalid body", detail: "name, places[], and ownerId are required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const id = newId();

    const trip = {
      id,
      name: String(data.name),
      description: data.description ?? "",
      places: data.places,
      ownerId: String(data.ownerId),
      isPublic: !!data.isPublic,
      transportMode: data.transportMode ?? undefined,
      roadCondition: data.roadCondition ?? undefined,
      startKey: data.startKey ?? undefined,
      customEndName: data.customEndName ?? undefined,
      customEndCoords: data.customEndCoords ?? undefined,
      overrideDistanceKm: data.overrideDistanceKm ?? undefined,
      overrideTimeHours: data.overrideTimeHours ?? undefined,
      estimatedDuration: data.estimatedDuration ?? undefined,
      createdAt: now,
      updatedAt: now,
    };

    const Key = `${cfg.PREFIX}${id}.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.BUCKET,
        Key,
        Body: JSON.stringify(trip),
        ContentType: "application/json",
      })
    );

    return NextResponse.json(trip, { status: 201 });
  } catch (err: any) {
    console.error("CREATE trip error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    });
    return NextResponse.json(
      { error: "Failed to create trip", detail: err?.name || err?.message || "UnknownError" },
      { status: 500 }
    );
  }
}
