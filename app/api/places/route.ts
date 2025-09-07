// app/api/places/route.ts
import { NextResponse } from "next/server"
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

// ---- small helpers -------------------------------------------------
function requireEnv() {
  const REGION = process.env.AWS_REGION
  const BUCKET = process.env.S3_BUCKET
  const RAW_PREFIX = process.env.S3_PLACES_PREFIX || "places/"
  const PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, "") + "/"

  const missing: string[] = []
  if (!REGION) missing.push("AWS_REGION")
  if (!BUCKET) missing.push("S3_BUCKET")
  if (!process.env.AWS_ACCESS_KEY_ID) missing.push("AWS_ACCESS_KEY_ID")
  if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push("AWS_SECRET_ACCESS_KEY")

  if (missing.length) {
    return {
      error: `Missing required environment variables: ${missing.join(", ")}`,
      ok: false as const,
    }
  }

  return {
    ok: true as const,
    REGION,
    BUCKET,
    PREFIX,
  }
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  let len = 0
  for (const c of chunks) len += c.byteLength
  const out = new Uint8Array(len)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}

async function bodyToString(body: any): Promise<string> {
  if (body?.transformToString) return body.transformToString()
  if (typeof body?.text === "function") return body.text()
  if (body?.getReader) {
    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    return new TextDecoder("utf-8").decode(concatUint8Arrays(chunks))
  }
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    const chunks: Uint8Array[] = []
    for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
      chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk)
    }
    return new TextDecoder("utf-8").decode(concatUint8Arrays(chunks))
  }
  return ""
}

const newId = () =>
  (globalThis as any).crypto?.randomUUID?.() || "id-" + Math.random().toString(36).slice(2, 10)

// ---- GET /api/places  ----------------------------------------------
export async function GET() {
  const cfg = requireEnv()
  if (!cfg.ok) {
    console.error("ENV ERROR /api/places GET:", cfg.error)
    return NextResponse.json({ error: cfg.error }, { status: 500 })
  }

  const s3 = new S3Client({ region: cfg.REGION })

  try {
    const listed = await s3.send(
      new ListObjectsV2Command({ Bucket: cfg.BUCKET, Prefix: cfg.PREFIX })
    )
    const keys = (listed.Contents || [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k && k.endsWith(".json"))

    const places = await Promise.all(
      keys.map(async (Key) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.BUCKET, Key }))
        const text = await bodyToString(obj.Body as any)
        return JSON.parse(text)
      })
    )

    return NextResponse.json(places, { status: 200 })
  } catch (err: any) {
    // Surface AWS specifics so the logs tell us exactly what's wrong
    console.error("LIST places error:", {
      name: err?.name,
      code: err?.$metadata?.httpStatusCode,
      region: cfg.REGION,
      bucket: cfg.BUCKET,
      prefix: cfg.PREFIX,
      message: err?.message,
    })
    return NextResponse.json(
      { error: "Failed to list places", detail: err?.name || err?.message || String(err) },
      { status: 500 }
    )
  }
}

// ---- POST /api/places  ---------------------------------------------
export async function POST(req: Request) {
  const cfg = requireEnv()
  if (!cfg.ok) {
    console.error("ENV ERROR /api/places POST:", cfg.error)
    return NextResponse.json({ error: cfg.error }, { status: 500 })
  }

  const s3 = new S3Client({ region: cfg.REGION })

  try {
    const data = await req.json()
    const now = Date.now()
    const id = newId()
    const place = {
      ...data,
      id,
      status: data.status ?? "published",
      category: data.category === "memorial" ? "memorials" : data.category,
      createdAt: now,
      updatedAt: now,
    }

    const Key = `${cfg.PREFIX}${id}.json`
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.BUCKET,
        Key,
        Body: JSON.stringify(place),
        ContentType: "application/json",
      })
    )

    return NextResponse.json(place, { status: 201 })
  } catch (err: any) {
    console.error("CREATE place error:", {
      name: err?.name,
      code: err?.$metadata?.httpStatusCode,
      message: err?.message,
    })
    return NextResponse.json(
      { error: "Failed to create place", detail: err?.name || err?.message || String(err) },
      { status: 500 }
    )
  }
}
