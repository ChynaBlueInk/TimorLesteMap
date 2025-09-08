// app/api/trips/[id]/route.ts
import { NextResponse } from "next/server"
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

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
  return new S3Client({ region })
}

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
    for (const c of chunks) { out.set(c, off); off += c.byteLength }
    return new TextDecoder().decode(out)
  }
  return ""
}

/** GET /api/trips/:id -> fetch single public trip */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const cfg = requireEnv()
  if (!cfg.ok) {
    return NextResponse.json({ error: "Env error", detail: cfg.error }, { status: 500 })
  }
  const s3 = client(cfg.REGION)
  const Key = `${cfg.PREFIX}${params.id}.json`
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.BUCKET, Key }))
    const text = await bodyToString(obj.Body as any)
    const trip = JSON.parse(text)
    return NextResponse.json(trip, { status: 200 })
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }
    console.error("GET trip error:", err?.name, err?.message)
    return NextResponse.json({ error: "Failed to get trip" }, { status: 500 })
  }
}

/** PUT /api/trips/:id -> upsert */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const cfg = requireEnv()
  if (!cfg.ok) {
    return NextResponse.json({ error: "Env error", detail: cfg.error }, { status: 500 })
  }
  const s3 = client(cfg.REGION)
  const id = params.id
  const Key = `${cfg.PREFIX}${id}.json`

  try {
    const data = await req.json()
    const now = Date.now()
    const trip = {
      ...data,
      id,
      updatedAt: now,
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.BUCKET,
        Key,
        Body: JSON.stringify(trip),
        ContentType: "application/json",
      })
    )
    return NextResponse.json(trip, { status: 200 })
  } catch (err: any) {
    console.error("PUT trip error:", err?.name, err?.message)
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 })
  }
}

/** DELETE /api/trips/:id -> remove */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const cfg = requireEnv()
  if (!cfg.ok) {
    return NextResponse.json({ error: "Env error", detail: cfg.error }, { status: 500 })
  }
  const s3 = client(cfg.REGION)
  const Key = `${cfg.PREFIX}${params.id}.json`

  try {
    // Optional: check exists; if not, still return 204
    try {
      await s3.send(new HeadObjectCommand({ Bucket: cfg.BUCKET, Key }))
    } catch {
      return new Response(null, { status: 204 })
    }

    await s3.send(new DeleteObjectCommand({ Bucket: cfg.BUCKET, Key }))
    return new Response(null, { status: 204 })
  } catch (err: any) {
    console.error("DELETE trip error:", err?.name, err?.message)
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 })
  }
}
