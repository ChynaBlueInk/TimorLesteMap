import { NextResponse } from "next/server"
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

function requireEnv() {
  const REGION = (process.env.AWS_REGION || "").trim()
  const BUCKET = (process.env.S3_BUCKET || "").trim()
  const RAW_PREFIX = (process.env.S3_PLACES_PREFIX || "places/").trim()
  const PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, "") + "/"

  const miss: string[] = []
  if (!REGION) miss.push("AWS_REGION")
  if (!BUCKET) miss.push("S3_BUCKET")
  if (!process.env.AWS_ACCESS_KEY_ID) miss.push("AWS_ACCESS_KEY_ID")
  if (!process.env.AWS_SECRET_ACCESS_KEY) miss.push("AWS_SECRET_ACCESS_KEY")
  if (miss.length) return { ok: false as const, error: `Missing env: ${miss.join(", ")}` }
  return { ok: true as const, REGION, BUCKET, PREFIX }
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

function client(region: string) {
  return new S3Client({ region, forcePathStyle: true })
}

// GET /api/places/:id
export async function GET(_: Request, ctx: { params: { id: string } }) {
  const cfg = requireEnv()
  if (!cfg.ok) return NextResponse.json({ error: cfg.error }, { status: 500 })
  const s3 = client(cfg.REGION)

  const Key = `${cfg.PREFIX}${ctx.params.id}.json`
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.BUCKET, Key }))
    const text = await bodyToString(obj.Body as any)
    return NextResponse.json(JSON.parse(text), { status: 200 })
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode
    const name = err?.name
    if (name === "NoSuchKey" || code === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("GET place error:", { name, code, message: err?.message })
    return NextResponse.json({ error: "Failed to read place", detail: name || "UnknownError" }, { status: 500 })
  }
}

// PATCH /api/places/:id
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const cfg = requireEnv()
  if (!cfg.ok) return NextResponse.json({ error: cfg.error }, { status: 500 })
  const s3 = client(cfg.REGION)

  const Key = `${cfg.PREFIX}${ctx.params.id}.json`
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.BUCKET, Key }))
    const current = JSON.parse(await bodyToString(obj.Body as any))
    const patch = await req.json()
    const next = { ...current, ...patch, updatedAt: Date.now() }

    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.BUCKET,
        Key,
        Body: JSON.stringify(next),
        ContentType: "application/json",
      })
    )

    return NextResponse.json(next, { status: 200 })
  } catch (err: any) {
    console.error("PATCH place error:", { name: err?.name, code: err?.$metadata?.httpStatusCode, message: err?.message })
    return NextResponse.json({ error: "Failed to update place", detail: err?.name || "UnknownError" }, { status: 500 })
  }
}

// DELETE /api/places/:id
export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const cfg = requireEnv()
  if (!cfg.ok) return NextResponse.json({ error: cfg.error }, { status: 500 })
  const s3 = client(cfg.REGION)

  const Key = `${cfg.PREFIX}${ctx.params.id}.json`
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: cfg.BUCKET, Key }))
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error("DELETE place error:", { name: err?.name, code: err?.$metadata?.httpStatusCode, message: err?.message })
    return NextResponse.json({ error: "Failed to delete place", detail: err?.name || "UnknownError" }, { status: 500 })
  }
}
