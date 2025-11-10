// app/api/trips/[id]/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

function requireEnv() {
  const REGION = (process.env.AWS_REGION || "").trim();
  const BUCKET = (process.env.S3_TRIPS_BUCKET || "").trim();
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

async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** GET /api/trips/:id – used by the trip view page to load a published trip */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cfg = requireEnv();
  if (!cfg.ok) {
    return NextResponse.json(
      { error: "Missing server configuration", detail: cfg.error },
      { status: 500 }
    );
  }

  const id = params.id;
  const Key = `${cfg.PREFIX}${id}.json`;
  const s3 = client(cfg.REGION);

  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: cfg.BUCKET, Key })
    );
    const text = await bodyToString(obj.Body as any);
    const trip = JSON.parse(text);
    return NextResponse.json(trip, { status: 200 });
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode;
    if (code === 404) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }
    console.error("GET trip error:", {
      name: err?.name,
      message: err?.message,
      code,
    });
    return NextResponse.json(
      { error: "Failed to load trip", detail: err?.message || "UnknownError" },
      { status: 500 }
    );
  }
}

/** PUT /api/trips/:id – update public trip */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const cfg = requireEnv();
  if (!cfg.ok) {
    return NextResponse.json(
      { error: "Missing server configuration", detail: cfg.error },
      { status: 500 }
    );
  }

  const body = await readJson(req);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const id = params.id;
  const trip = { ...body, id }; // force id from URL
  const Key = `${cfg.PREFIX}${id}.json`;
  const s3 = client(cfg.REGION);

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
    console.error("UPDATE trip error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    });
    return NextResponse.json(
      { error: "Failed to update trip", detail: err?.message || "UnknownError" },
      { status: 500 }
    );
  }
}

/** DELETE /api/trips/:id – remove public trip */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cfg = requireEnv();
  if (!cfg.ok) {
    return NextResponse.json(
      { error: "Missing server configuration", detail: cfg.error },
      { status: 500 }
    );
  }

  const id = params.id;
  const Key = `${cfg.PREFIX}${id}.json`;
  const s3 = client(cfg.REGION);

  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: cfg.BUCKET, Key })
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE trip error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    });
    return NextResponse.json(
      {
        error: "Failed to delete trip",
        detail: err?.message || "UnknownError",
      },
      { status: 500 }
    );
  }
}
