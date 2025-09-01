"use client"

import { useState } from "react"
import { type Place, updatePlace } from "@/lib/firestore"
import { useTranslation, type Language } from "@/lib/i18n"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Check, X, Star, StarOff, Eye, MapPin, Calendar, Loader2, Flag } from "lucide-react"
import Link from "next/link"

interface AdminPlaceCardProps {
  place: Place
  onUpdate: (place: Place) => void
  language?: Language
}

export default function AdminPlaceCard({ place, onUpdate, language = "en" }: AdminPlaceCardProps) {
  const { t } = useTranslation(language)
  const [loading, setLoading] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | "feature" | "unfeature" | null>(null)

  const handleAction = async () => {
    if (!actionType) return

    setLoading(true)
    try {
      let updates: Partial<Place> = {}

      switch (actionType) {
        case "approve":
          updates = { status: "published" }
          break
        case "reject":
          updates = { status: "flagged" }
          break
        case "feature":
          updates = { featured: true }
          break
        case "unfeature":
          updates = { featured: false }
          break
      }

      await updatePlace(place.id!, updates)
      onUpdate({ ...place, ...updates })
      setActionDialogOpen(false)
      setActionType(null)
    } catch (error) {
      console.error("Error updating place:", error)
    } finally {
      setLoading(false)
    }
  }

  const openActionDialog = (type: typeof actionType) => {
    setActionType(type)
    setActionDialogOpen(true)
  }

  const getActionText = () => {
    switch (actionType) {
      case "approve":
        return { title: "Approve Place", description: "This will publish the place and make it visible to all users." }
      case "reject":
        return { title: "Reject Place", description: "This will flag the place and hide it from public view." }
      case "feature":
        return {
          title: "Feature Place",
          description: "This will mark the place as featured and highlight it on the homepage.",
        }
      case "unfeature":
        return { title: "Unfeature Place", description: "This will remove the featured status from this place." }
      default:
        return { title: "", description: "" }
    }
  }

  const statusColors = {
    published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  const categoryColors = {
    history: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    culture: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    nature: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    food: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    memorials: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  }

  return (
    <>
      <Card className="group">
        {place.images && place.images.length > 0 && (
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            <img
              src={place.images[0] || "/placeholder.svg"}
              alt={place.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute top-2 left-2 flex gap-2">
              <Badge className={statusColors[place.status]}>{t(`status.${place.status}`)}</Badge>
              {place.featured && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
              {place.title}
            </h3>
            <Badge className={categoryColors[place.category]}>{t(`category.${place.category}`)}</Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{place.description}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {place.municipality}, {place.suco}
              </span>
            </div>

            {place.period && (place.period.fromYear || place.period.toYear) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {place.period.fromYear && place.period.toYear
                    ? `${place.period.fromYear} - ${place.period.toYear}`
                    : place.period.fromYear
                      ? `From ${place.period.fromYear}`
                      : `Until ${place.period.toYear}`}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/places/${place.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>

          {place.status === "pending" && (
            <>
              <Button size="sm" onClick={() => openActionDialog("approve")} disabled={loading}>
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={() => openActionDialog("reject")} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}

          {place.status === "published" && (
            <>
              {place.featured ? (
                <Button variant="outline" size="sm" onClick={() => openActionDialog("unfeature")} disabled={loading}>
                  <StarOff className="h-4 w-4 mr-2" />
                  Unfeature
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openActionDialog("feature")} disabled={loading}>
                  <Star className="h-4 w-4 mr-2" />
                  Feature
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => openActionDialog("reject")} disabled={loading}>
                <Flag className="h-4 w-4 mr-2" />
                Flag
              </Button>
            </>
          )}

          {place.status === "flagged" && (
            <Button size="sm" onClick={() => openActionDialog("approve")} disabled={loading}>
              <Check className="h-4 w-4 mr-2" />
              Restore
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionText().title}</AlertDialogTitle>
            <AlertDialogDescription>{getActionText().description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
