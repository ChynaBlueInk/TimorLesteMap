import { NextResponse } from "next/server";
import {
  S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;
const PREFIX = (process.env.S3_PLACES_PREFIX || "places/").replace(/^\/+|\/+$/g, "") + "/";

const s3 = new S3Client({ region: REGION });

// helpers that work in Edge/Node without Buffer
function concatUint8Arrays(chunks: Uint8Array[]) {
  let len = 0;
  for (const c of chunks) len += c.byteLength;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}
async function bodyToString(body: any): Promise<string> {
  if (body?.transformToString) return await body.transformToString();
  if (typeof body?.text === "function") return await body.text();
  if (body?.getReader) {
    const r = body.getReader(); const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await r.read(); if (done) break; if (value) chunks.push(value); }
    return new TextDecoder().decode(concatUint8Arrays(chunks));
  }
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
      chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
    }
    return new TextDecoder().decode(concatUint8Arrays(chunks));
  }
  return "";
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const Key = `${PREFIX}${params.id}.json`;
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key })); // 404 fast-path
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
    const text = await bodyToString(obj.Body as any);
    return NextResponse.json(JSON.parse(text), { status: 200 });
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("GET place error:", err);
    return NextResponse.json({ error: "Failed to fetch place" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = await req.json();
    const Key = `${PREFIX}${params.id}.json`;
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
    const current = JSON.parse(await bodyToString(obj.Body as any));
    const updated = { ...current, ...patch, updatedAt: Date.now() };
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body: JSON.stringify(updated), ContentType: "application/json" }));
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH place error:", err);
    return NextResponse.json({ error: "Failed to update place" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const Key = `${PREFIX}${params.id}.json`;
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE place error:", err);
    return NextResponse.json({ error: "Failed to delete place" }, { status: 500 });
  }
}
