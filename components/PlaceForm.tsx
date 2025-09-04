// components/PlaceForm.tsx
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPlace, updatePlace, type Place } from "@/lib/firestore"
import { useAuth } from "@/hooks/useAuth"
import { useTranslation, type Language } from "@/lib/i18n"
import { placeSchema } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import ImageUploader from "./ImageUploader"
import LocationPicker from "./LocationPicker"
import { Loader2, AlertCircle, Save, X } from "lucide-react"

interface PlaceFormProps {
  place?: Place
  language?: Language
  onCancel?: () => void
}

export default function PlaceForm({ place, language = "en", onCancel }: PlaceFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { t } = useTranslation(language)

  const [formData, setFormData] = useState({
    title: place?.title || "",
    description: place?.description || "",
    category: place?.category || ("history" as const),
    municipality: place?.municipality || "",
    suco: place?.suco || "",
    coords: place?.coords || { lat: 0, lng: 0 },
    images: place?.images || [],
    sources: place?.sources || [],
    languages: place?.languages || ([] as ("tet" | "en" | "pt")[]),
    period: place?.period || { fromYear: undefined, toYear: undefined },
  })

  const [sourceInput, setSourceInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const handleLanguageChange = (lang: "tet" | "en" | "pt", checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({ ...prev, languages: [...prev.languages, lang] }))
    } else {
      setFormData((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== lang) }))
    }
  }

  const addSource = () => {
    if (sourceInput.trim()) {
      setFormData((prev) => ({ ...prev, sources: [...prev.sources, sourceInput.trim()] }))
      setSourceInput("")
    }
  }

  const removeSource = (index: number) => {
    setFormData((prev) => ({ ...prev, sources: prev.sources.filter((_, i) => i !== index) }))
  }

  // Relax validation: treat languages and suco as optional even if placeSchema requires them
  const validateForm = () => {
    try {
      placeSchema.parse(formData)
      setErrors({})
      return true
    } catch (error: any) {
      const remaining =
        (error?.errors as Array<{ path: (string | number)[]; message: string }> | undefined)?.filter(
          (err) => {
            const root = String(err.path?.[0] ?? "")
            return root !== "languages" && root !== "suco"
          }
        ) ?? []

      if (remaining.length === 0) {
        setErrors({})
        return true
      }

      const fieldErrors: Record<string, string> = {}
      for (const err of remaining) {
        fieldErrors[err.path.join(".")] = err.message
      }
      setErrors(fieldErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ Allow anonymous submissions
    // (no early return if not signed in)
    if (!validateForm()) return

    setLoading(true)
    try {
      const placeData = {
        ...formData,
        ownerId: user?.uid ?? "anonymous",
        status: "published" as const, // auto-publish
        featured: place?.featured || false,
      }

      if (place?.id) {
        await updatePlace(place.id, placeData)
        router.push(`/places/${place.id}`)
      } else {
        const docRef = await createPlace(placeData)
        router.push(`/places/${docRef.id}`)
      }
    } catch (error: any) {
      setErrors({ general: error.message || "An error occurred while saving the place" })
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { value: "history", label: t("category.history") },
    { value: "culture", label: t("category.culture") },
    { value: "nature", label: t("category.nature") },
    { value: "food", label: t("category.food") },
    { value: "memorials", label: t("category.memorials") },
  ]

  const languages = [
    { code: "tet", name: "Tetun" },
    { code: "en", name: "English" },
    { code: "pt", name: "Portuguese" },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("form.title")} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter the place name"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("form.description")} *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the history, significance, or story of this place (minimum 50 characters)"
              rows={4}
              className={errors.description ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">{formData.description.length}/2000 characters (minimum 50)</p>
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t("form.category")} *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-4">
                {languages.map((lang) => (
                  <div key={lang.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={lang.code}
                      checked={formData.languages.includes(lang.code as any)}
                      onCheckedChange={(checked) => handleLanguageChange(lang.code as any, checked as boolean)}
                    />
                    <Label htmlFor={lang.code} className="text-sm">
                      {lang.name}
                    </Label>
                  </div>
                ))}
              </div>
              {/* optional; no error */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="municipality">{t("form.municipality")} *</Label>
              <Input
                id="municipality"
                value={formData.municipality}
                onChange={(e) => handleInputChange("municipality", e.target.value)}
                placeholder="e.g., Dili, Baucau, Ermera"
                className={errors.municipality ? "border-destructive" : ""}
              />
              {errors.municipality && <p className="text-sm text-destructive">{errors.municipality}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="suco">{t("form.suco")}</Label>
              <Input
                id="suco"
                value={formData.suco}
                onChange={(e) => handleInputChange("suco", e.target.value)}
                placeholder="Enter suco/village name"
                className={errors.suco ? "border-destructive" : ""}
              />
              {/* optional; no error */}
            </div>
          </div>

          <LocationPicker coords={formData.coords} onCoordsChange={(coords) => handleInputChange("coords", coords)} />
          {errors["coords.lat"] && <p className="text-sm text-destructive">Please set a valid location</p>}
        </CardContent>
      </Card>

      {/* Time Period */}
      <Card>
        <CardHeader>
          <CardTitle>Time Period (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromYear">From Year</Label>
              <Input
                id="fromYear"
                type="number"
                value={formData.period?.fromYear || ""}
                onChange={(e) =>
                  handleInputChange("period", {
                    ...formData.period,
                    fromYear: e.target.value ? Number.parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 1975"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toYear">To Year</Label>
              <Input
                id="toYear"
                type="number"
                value={formData.period?.toYear || ""}
                onChange={(e) =>
                  handleInputChange("period", {
                    ...formData.period,
                    toYear: e.target.value ? Number.parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 1999"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader
            images={formData.images}
            onImagesChange={(images) => handleInputChange("images", images)}
            disabled={loading}
          />
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Sources & References (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder="Add a source URL or reference"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSource())}
            />
            <Button type="button" onClick={addSource} variant="outline">
              Add
            </Button>
          </div>

          {formData.sources.length > 0 && (
            <div className="space-y-2">
              {formData.sources.map((source, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm truncate">{source}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSource(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {place ? t("form.save") : t("form.submit")}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            {t("form.cancel")}
          </Button>
        )}
      </div>

      {!place && (
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
          <p className="font-medium mb-2">Before you submit:</p>
          <ul className="space-y-1 text-xs">
            <li>• Make sure all information is accurate and complete</li>
            <li>• You can edit your places anytime from your profile</li>
            <li>• Please respect cultural sensitivity and accuracy</li>
          </ul>
        </div>
      )}
    </form>
  )
}
