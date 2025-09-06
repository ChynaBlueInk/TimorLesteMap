// app/api/places/route.ts
import { NextResponse } from "next/server"
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

const REGION = process.env.AWS_REGION!
const BUCKET = process.env.S3_BUCKET!
const PREFIX = (process.env.S3_PLACES_PREFIX || "places/").replace(/^\/+|\/+$/g, "") + "/"

const s3 = new S3Client({ region: REGION })

// ---- stream helpers without Buffer ----
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
  // S3 SDK v3 in Node often provides transformToString()
  if (body?.transformToString) {
    return await body.transformToString()
  }
  // Blob in edge/browser runtimes
  if (typeof body?.text === "function") {
    return await body.text()
  }
  // WHATWG ReadableStream
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
  // Async iterable (Node stream polyfilled by AWS SDK)
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    const chunks: Uint8Array[] = []
    for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
      if (typeof chunk === "string") {
        chunks.push(new TextEncoder().encode(chunk))
      } else {
        chunks.push(chunk)
      }
    }
    return new TextDecoder("utf-8").decode(concatUint8Arrays(chunks))
  }
  return ""
}

// GET /api/places -> list all
export async function GET() {
  try {
    const listed = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }))
    const keys = (listed.Contents || [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k && k.endsWith(".json"))

    const places = await Promise.all(
      keys.map(async (Key) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }))
        const text = await bodyToString(obj.Body as any)
        return JSON.parse(text)
      })
    )

    return NextResponse.json(places, { status: 200 })
  } catch (err) {
    console.error("LIST places error:", err)
    return NextResponse.json({ error: "Failed to list places" }, { status: 500 })
  }
}

// POST /api/places -> create
export async function POST(req: Request) {
  try {
    const data = await req.json()
    const now = Date.now()
    const id =
      (globalThis as any).crypto?.randomUUID?.() || "id-" + Math.random().toString(36).slice(2, 10)

    const place = {
      ...data,
      id,
      status: data.status ?? "published",
      category: data.category === "memorial" ? "memorials" : data.category,
      createdAt: now,
      updatedAt: now,
    }

    const Key = `${PREFIX}${id}.json`
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key,
        Body: JSON.stringify(place),
        ContentType: "application/json",
      })
    )

    return NextResponse.json(place, { status: 201 })
  } catch (err) {
    console.error("CREATE place error:", err)
    return NextResponse.json({ error: "Failed to create place" }, { status: 500 })
  }
}
