"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { X, Upload, ImageIcon, Loader2 } from "lucide-react"

interface ImageUploaderProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  disabled?: boolean
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file) // ✅ base64 string that survives JSON/localStorage
  })
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const remainingSlots = Math.max(0, maxImages - images.length)
    const filesToAdd = files.slice(0, remainingSlots)
    if (filesToAdd.length === 0) {
      // reset the input so the same files can be chosen again later
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Convert sequentially so we can show a meaningful progress bar
      const newDataUrls: string[] = []
      for (let i = 0; i < filesToAdd.length; i++) {
        const dataUrl = await fileToDataUrl(filesToAdd[i])
        newDataUrls.push(dataUrl)
        setUploadProgress(Math.round(((i + 1) / filesToAdd.length) * 100))
      }

      onImagesChange([...images, ...newDataUrls])
    } catch (error) {
      console.error("Error reading images:", error)
      alert("Failed to add images.")
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index)
    onImagesChange(next)
  }

  const canAddMore = images.length < maxImages && !disabled

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add Images ({images.length}/{maxImages})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Processing images… {uploadProgress}%
          </p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground">Add up to {maxImages} images to showcase this place</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
