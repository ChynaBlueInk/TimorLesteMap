// components/TripPhotosUploader.tsx
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ImageUploader from "@/components/ImageUploader"

export type TripPhoto = { url: string; caption?: string }

type Props = {
  value?: TripPhoto[]
  onChange?: (photos: TripPhoto[]) => void
  max?: number
}

export default function TripPhotosUploader({ value = [], onChange, max = 12 }: Props) {
  const [photos, setPhotos] = useState<TripPhoto[]>(value)

  useEffect(() => setPhotos(value), [value])

  const commit = (next: TripPhoto[]) => {
    setPhotos(next)
    onChange?.(next)
  }

  const addPhoto = (url: string) => {
    if (!url || photos.length >= max) return
    commit([...photos, { url }])
  }

  const removeAt = (idx: number) => {
    const next = photos.slice()
    next.splice(idx, 1)
    commit(next)
  }

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= photos.length) return
    const next = photos.slice()
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    commit(next)
  }

  const updateCaption = (idx: number, caption: string) => {
    const next = photos.slice()
    next[idx] = { ...next[idx], caption }
    commit(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Trip photos</h3>
        <span className="text-xs text-white/80">{photos.length}/{max}</span>
      </div>

      <div className="flex items-center gap-2">
       <ImageUploader
  value={photos.map((p) => p.url)}
  onChange={(images: string[]) => {
    if (images && images.length > 0) addPhoto(images[0])
  }}
/>

        <Button type="button" variant="secondary" className="opacity-60 cursor-not-allowed" disabled>
          <Plus className="mr-2 h-4 w-4" /> Add placeholder
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-white/80">No photos yet. Upload images to showcase this trip.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {photos.map((p, idx) => (
            <li key={idx} className="border border-white/20 rounded-lg overflow-hidden bg-white/5">
              <div className="relative aspect-[4/3] bg-black/10">
                {!!p.url && (
                  <Image
                    src={p.url}
                    alt={p.caption || `Photo ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                  />
                )}
              </div>

              <div className="p-2 space-y-2">
                <Input
                  placeholder="Caption (optional)"
                  value={p.caption ?? ""}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-white/10"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-white/10"
                      onClick={() => move(idx, 1)}
                      disabled={idx === photos.length - 1}
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
                    onClick={() => removeAt(idx)}
                    title="Remove"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
