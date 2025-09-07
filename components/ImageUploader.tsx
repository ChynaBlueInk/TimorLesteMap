// components/ImageUploader.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Upload, ImageIcon, Loader2 } from "lucide-react";

// ---- Props (back-compat): supports either value/onChange OR images/onImagesChange
type Common = {
  maxImages?: number;
  disabled?: boolean;
  /** Optional S3 folder prefix; defaults to "places" */
  folder?: string;
};

type ValueMode = {
  value: string[];
  onChange: (images: string[]) => void;
} & Common;

type ImagesMode = {
  images: string[];
  onImagesChange: (images: string[]) => void;
} & Common;

type ImageUploaderProps = ValueMode | ImagesMode;

// ---- helpers
function getListFromProps(p: ImageUploaderProps): string[] {
  return (p as any).images ?? (p as any).value ?? [];
}
function emitList(p: ImageUploaderProps, next: string[]) {
  if ((p as any).onImagesChange) (p as any).onImagesChange(next);
  else if ((p as any).onChange) (p as any).onChange(next);
}

async function presign(file: File, folder = "places") {
  const res = await fetch("/api/s3/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, folder }),
  });
  if (!res.ok) throw new Error("Failed to request upload URL");
  return (await res.json()) as {
    url: string;
    fields: Record<string, string>;
    key: string;
    publicUrl: string;
  };
}

async function uploadToS3(url: string, fields: Record<string, string>, file: File) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  fd.append("Content-Type", file.type);
  fd.append("file", file);

  const up = await fetch(url, { method: "POST", body: fd });
  if (!up.ok) {
    const text = await up.text().catch(() => "");
    throw new Error(`Upload failed (${up.status}) ${text}`);
  }
}

/**
 * Component
 */
export default function ImageUploader(props: ImageUploaderProps) {
  const images = getListFromProps(props);
  const onEmit = (next: string[]) => emitList(props, next);

  const maxImages = props.maxImages ?? 5;
  const disabled = props.disabled ?? false;
  const folder = props.folder ?? "places";

  const MAX_UPLOAD_BYTES = 25_000_000; // 25 MB

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0..100 across selected files
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    if (picked.length === 0) return;

    // enforce 25 MB per file client-side
    const tooBig = picked.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) {
      alert(
        `These files exceed the 25 MB limit and were skipped:\n` +
          tooBig.map((f) => `• ${f.name} (${Math.round(f.size / 1_000_000)} MB)`).join("\n")
      );
    }
    const okSize = picked.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (okSize.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const remainingSlots = Math.max(0, maxImages - images.length);
    const filesToAdd = okSize.slice(0, remainingSlots);
    if (filesToAdd.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const newUrls: string[] = [];
      // sequential uploads (gives simple progress: completed/total)
      for (let i = 0; i < filesToAdd.length; i++) {
        const f = filesToAdd[i];

        // 1) presign
        const { url, fields, publicUrl } = await presign(f, folder);

        // 2) upload
        await uploadToS3(url, fields, f);

        // 3) collect URL
        newUrls.push(publicUrl);

        // progress (per-file granularity)
        setUploadProgress(Math.round(((i + 1) / filesToAdd.length) * 100));
      }

      onEmit([...images, ...newUrls]);
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload images.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onEmit(next);
  };

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"      // opens camera on mobile
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Add Images ({images.length}/{maxImages})
              </>
            )}
          </Button>

          {/* helper text */}
          <p className="mt-2 text-xs text-muted-foreground">
            You can take a photo on mobile or choose from your device. Max size <strong>25&nbsp;MB</strong> per file.
          </p>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">Uploading… {uploadProgress}%</p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && !uploading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map((imageUrl, index) => (
            <Card key={index} className="group relative">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full rounded-md object-cover"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !uploading && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-muted-foreground">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Add up to {maxImages} images to showcase this place
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
