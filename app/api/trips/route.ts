// app/api/trips/route.ts
import { NextResponse } from "next/server"
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

/** Validate env & normalize prefix */
function requireEnv() {
  const REGION = (process.env.AWS_REGION || "").trim()
  const BUCKET = (process.env.S3_BUCKET || "").trim()
  const RAW_PREFIX = (process.env.S3_TRIPS_PREFIX || "trips/").trim()
  const PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, "") + "/"

  const miss: string[] = []
  if (!REGION) miss.push("AWS_REGION")
  if (!BUCKET) miss.push("S3_BUCKET")
  if (!process.env.AWS_ACCESS_KEY_ID) miss.push("AWS_ACCESS_KEY_ID")
  if (!process.env.AWS_SECRET_ACCESS_KEY) miss.push("AWS_SECRET_ACCESS_KEY")
  if (miss.length) return { ok: false as const, error: `Missing env: ${miss.join(", ")}` }
  return { ok: true as const, REGION, BUCKET, PREFIX }
}

function client(region: string) {
  // Do NOT force path-style for normal buckets.
  return new S3Client({ region })
}

/** Minimal stream -> string helper */
async function bodyToString(body: any): Promise<string> {
  if (body?.transformToString) return body.transformToString()
  if (typeof body?.text === "function") return body.text()
  if (body?.getReader) {
    const r = body.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await r.read()
      if (done) break
      if (value) chunks.push(value)
    }
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0))
    let off = 0
    for (const c of chunks) {
      out.set(c, off)
      off += c.byteLength
    }
    return new TextDecoder().decode(out)
  }
  return ""
}

const newId = () =>
  (globalThis as any).crypto?.randomUUID?.() || "trip-" + Math.random().toString(36).slice(2, 10)

/** GET /api/trips -> list all public trips */
export async function GET() {
  const cfg = requireEnv()
  if (!cfg.ok) {
    console.error("ENV ERROR /api/trips GET:", cfg.error)
    return NextResponse.json({ error: "Failed to list trips", detail: cfg.error }, { status: 500 })
  }
  const s3 = client(cfg.REGION)
  try {
    const listed = await s3.send(
      new ListObjectsV2Command({ Bucket: cfg.BUCKET, Prefix: cfg.PREFIX })
    )
    const keys = (listed.Contents || [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k && k.endsWith(".json"))

    const trips = await Promise.all(
      keys.map(async (Key) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.BUCKET, Key }))
        const text = await bodyToString(obj.Body as any)
        return JSON.parse(text)
      })
    )

    return NextResponse.json(trips ?? [], { status: 200 })
  } catch (err: any) {
    console.error("LIST trips error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    })
    return NextResponse.json(
      { error: "Failed to list trips", detail: err?.name || err?.message || "UnknownError" },
      { status: 500 }
    )
  }
}

/** POST /api/trips -> create/Publish a trip (respect client id if provided) */
export async function POST(req: Request) {
  const cfg = requireEnv()
  if (!cfg.ok) {
    console.error("ENV ERROR /api/trips POST:", cfg.error)
    return NextResponse.json({ error: "Failed to create trip", detail: cfg.error }, { status: 500 })
  }
  const s3 = client(cfg.REGION)

  try {
    const data = await req.json()
    const now = Date.now()

    // IMPORTANT: use provided id when present to match client-side ids
    const id: string = (typeof data?.id === "string" && data.id.trim()) || newId()

    const trip = {
      ...data,
      id,
      // persist timestamps as numbers
      createdAt: typeof data?.createdAt === "number" ? data.createdAt : now,
      updatedAt: now,
      isPublic: true, // POST here implies publish
    }

    const Key = `${cfg.PREFIX}${id}.json`
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.BUCKET,
        Key,
        Body: JSON.stringify(trip),
        ContentType: "application/json",
      })
    )

    return NextResponse.json(trip, { status: 201 })
  } catch (err: any) {
    console.error("CREATE trip error:", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
    })
    return NextResponse.json(
      { error: "Failed to create trip", detail: err?.name || err?.message || "UnknownError" },
      { status: 500 }
    )
  }
}
